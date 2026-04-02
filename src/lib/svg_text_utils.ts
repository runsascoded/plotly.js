import { select } from 'd3-selection';
import { dispatch } from 'd3-dispatch';
import { apply3DTransform, extendDeepAll, log, randstr, strTranslate, warn } from '../lib/index.js';
import xmlnsNamespaces from '../constants/xmlns_namespaces.js';
import _alignment from '../constants/alignment.js';
import type { GraphDiv } from '../../types/core';
const { LINE_SPACING } = _alignment;

// text converter

const FIND_TEX = /([^$]*)([$]+[^$]*[$]+)([^$]*)/;

export const convertToTspans = function(_context: any, gd: GraphDiv, _callback?: any): any {
    const str = _context.text();

    // Until we get tex integrated more fully (so it can be used along with non-tex)
    // allow some elements to prohibit it by attaching 'data-notex' to the original
    const tex = (!_context.attr('data-notex')) &&
        gd && gd._context.typesetMath &&
        (typeof MathJax !== 'undefined') &&
        str.match(FIND_TEX);

    const parent = select(_context.node().parentNode);
    if(parent.empty()) return;
    let svgClass = (_context.attr('class')) ? _context.attr('class').split(' ')[0] : 'text';
    svgClass += '-math';
    parent.selectAll('svg.' + svgClass).remove();
    parent.selectAll('g.' + svgClass + '-group').remove();
    _context.style('display', null)
        // some callers use data-unformatted *from the <text> element* in 'cancel'
        // so we need it here even if we're going to turn it into math
        // these two (plus style and text-anchor attributes) form the key we're
        // going to use for Drawing.bBox
        .attr('data-unformatted', str)
        .attr('data-math', 'N');

    function showText(): void {
        if(!parent.empty()) {
            svgClass = _context.attr('class') + '-math';
            parent.select('svg.' + svgClass).remove();
        }
        _context.text('')
            .style('white-space', 'pre');

        const hasLink = buildSVGText(_context.node(), str);

        if(hasLink) {
            // at least in Chrome, pointer-events does not seem
            // to be honored in children of <text> elements
            // so if we have an anchor, we have to make the
            // whole element respond
            _context.style('pointer-events', 'all');
        }

        positionText(_context);

        if(_callback) _callback.call(_context);
    }

    if(tex) {
        ((gd && gd._promises) || []).push(new Promise(function(resolve: any) {
            _context.style('display', 'none');
            const fontSize = parseInt(_context.node().style.fontSize, 10);
            const config: any = {fontSize: fontSize};

            texToSVG(tex[2], config, function(_svgEl: any, _glyphDefs: any, _svgBBox: any) {
                parent.selectAll('svg.' + svgClass).remove();
                parent.selectAll('g.' + svgClass + '-group').remove();

                const newSvg = _svgEl && _svgEl.select('svg');
                if(!newSvg || !newSvg.node()) {
                    showText();
                    resolve();
                    return;
                }

                const mathjaxGroup = parent.append('g')
                    .classed(svgClass + '-group', true)
                    .attr('pointer-events', 'none')
                    .attr('data-unformatted', str)
                    .attr('data-math', 'Y');

                mathjaxGroup.node().appendChild(newSvg.node());

                // stitch the glyph defs
                if(_glyphDefs && _glyphDefs.node()) {
                    newSvg.node().insertBefore(_glyphDefs.node().cloneNode(true),
                                               newSvg.node().firstChild);
                }

                const w0 = _svgBBox.width;
                const h0 = _svgBBox.height;

                newSvg
                    .attr('class', svgClass)
                    .attr('height', h0)
                    .attr('preserveAspectRatio', 'xMinYMin meet')
                .style('overflow', 'visible')
                .style('pointer-events', 'none');

                const fill = _context.node().style.fill || 'black';
                const g = newSvg.select('g');
                g
                    .attr('fill', fill)
                    .attr('stroke', fill);

                let bb = g.node().getBoundingClientRect();
                let w = bb.width;
                let h = bb.height;

                if(w > w0 || h > h0) {
                    // this happen in firefox v82+ | see https://bugzilla.mozilla.org/show_bug.cgi?id=1709251 addressed
                    // temporary fix:
                    newSvg.style('overflow', 'hidden');
                    bb = newSvg.node().getBoundingClientRect();
                    w = bb.width;
                    h = bb.height;
                }

                let x = +_context.attr('x');
                let y = +_context.attr('y');

                // font baseline is about 1/4 fontSize below centerline
                const textHeight = fontSize || _context.node().getBoundingClientRect().height;
                const dy = -textHeight / 4;

                if(svgClass[0] === 'y') {
                    mathjaxGroup.attr('transform', 'rotate(' + [-90, x, y] +
                        ')' + strTranslate(-w / 2, dy - h / 2));
                } else if(svgClass[0] === 'l') {
                    y = dy - h / 2;
                } else if(svgClass[0] === 'a' && svgClass.indexOf('atitle') !== 0) {
                    x = 0;
                    y = dy;
                } else {
                    const anchor = _context.attr('text-anchor');

                    x = x - w * (
                        anchor === 'middle' ? 0.5 :
                        anchor === 'end' ? 1 : 0
                    );
                    y = y + dy - h / 2;
                }

                newSvg
                    .attr('x', x)
                    .attr('y', y);

                if(_callback) _callback.call(_context, mathjaxGroup);
                resolve(mathjaxGroup);
            });
        }));
    } else showText();

    return _context;
};

// MathJax

const LT_MATCH = /(<|&lt;|&#60;)/g;
const GT_MATCH = /(>|&gt;|&#62;)/g;

function cleanEscapesForTex(s: string): string {
    return s.replace(LT_MATCH, '\\lt ')
        .replace(GT_MATCH, '\\gt ');
}

const inlineMath = [['$', '$'], ['\\(', '\\)']];

function texToSVG(_texString: string, _config: any, _callback: any): void {
    const MathJaxVersion = parseInt(
        ((MathJax as any).version || '').split('.')[0]
    );

    if(
        MathJaxVersion !== 2 &&
        MathJaxVersion !== 3
    ) {
        warn('No MathJax version:', (MathJax as any).version);
        return;
    }

    let originalRenderer: any,
        originalConfig: any,
        originalProcessSectionDelay: any,
        tmpDiv: any;

    const setConfig2 = function() {
        originalConfig = extendDeepAll({}, (MathJax as any).Hub.config);

        originalProcessSectionDelay = (MathJax as any).Hub.processSectionDelay;
        if((MathJax as any).Hub.processSectionDelay !== undefined) {
            // MathJax 2.5+ but not 3+
            (MathJax as any).Hub.processSectionDelay = 0;
        }

        return (MathJax as any).Hub.Config({
            messageStyle: 'none',
            tex2jax: {
                inlineMath: inlineMath
            },
            displayAlign: 'left',
        });
    };

    const setConfig3 = function() {
        originalConfig = extendDeepAll({}, (MathJax as any).config);

        if(!(MathJax as any).config.tex) {
            (MathJax as any).config.tex = {};
        }

        (MathJax as any).config.tex.inlineMath = inlineMath;
    };

    const setRenderer2 = function() {
        originalRenderer = (MathJax as any).Hub.config.menuSettings.renderer;
        if(originalRenderer !== 'SVG') {
            return (MathJax as any).Hub.setRenderer('SVG');
        }
    };

    const setRenderer3 = function() {
        originalRenderer = (MathJax as any).config.startup.output;
        if(originalRenderer !== 'svg') {
            (MathJax as any).config.startup.output = 'svg';
        }
    };

    const initiateMathJax = function() {
        const randomID = 'math-output-' + randstr({}, 64);
        tmpDiv = select('body').append('div')
            .attr('id', randomID)
            .style('visibility', 'hidden')
            .style('position', 'absolute')
            .style('font-size', _config.fontSize + 'px')
            .text(cleanEscapesForTex(_texString));

        const tmpNode = tmpDiv.node();

        return MathJaxVersion === 2 ?
            (MathJax as any).Hub.Typeset(tmpNode) :
            (MathJax as any).typeset([tmpNode]);
    };

    const finalizeMathJax = function() {
        const sel = tmpDiv.select(
            MathJaxVersion === 2 ? '.MathJax_SVG' : '.MathJax'
        );

        const node = !sel.empty() && tmpDiv.select('svg').node();
        if(!node) {
            log('There was an error in the tex syntax.', _texString);
            _callback();
        } else {
            const nodeBBox = node.getBoundingClientRect();
            let glyphDefs: any;
            if(MathJaxVersion === 2) {
                glyphDefs = select('body').select('#MathJax_SVG_glyphs');
            } else {
                glyphDefs = sel.select('defs');
            }
            _callback(sel, glyphDefs, nodeBBox);
        }

        tmpDiv.remove();
    };

    const resetRenderer2 = function() {
        if(originalRenderer !== 'SVG') {
            return (MathJax as any).Hub.setRenderer(originalRenderer);
        }
    };

    const resetRenderer3 = function() {
        if(originalRenderer !== 'svg') {
            (MathJax as any).config.startup.output = originalRenderer;
        }
    };

    const resetConfig2 = function() {
        if(originalProcessSectionDelay !== undefined) {
            (MathJax as any).Hub.processSectionDelay = originalProcessSectionDelay;
        }
        return (MathJax as any).Hub.Config(originalConfig);
    };

    const resetConfig3 = function() {
        (MathJax as any).config = originalConfig;
    };

    if(MathJaxVersion === 2) {
        (MathJax as any).Hub.Queue(
            setConfig2,
            setRenderer2,
            initiateMathJax,
            finalizeMathJax,
            resetRenderer2,
            resetConfig2
        );
    } else if(MathJaxVersion === 3) {
        setConfig3();
        setRenderer3();
        (MathJax as any).startup.defaultReady();

        (MathJax as any).startup.promise.then(() => {
            initiateMathJax();
            finalizeMathJax();

            resetRenderer3();
            resetConfig3();
        });
    }
}

const TAG_STYLES: Record<string, string> = {
    // would like to use baseline-shift for sub/sup but FF doesn't support it
    // so we need to use dy along with the uber hacky shift-back-to
    // baseline below
    sup: 'font-size:70%',
    sub: 'font-size:70%',
    s: 'text-decoration:line-through',
    u: 'text-decoration:underline',
    b: 'font-weight:bold',
    i: 'font-style:italic',
    a: 'cursor:pointer',
    span: '',
    em: 'font-style:italic;font-weight:bold'
};

// baseline shifts for sub and sup
const SHIFT_DY: Record<string, string> = {
    sub: '0.3em',
    sup: '-0.6em'
};
// reset baseline by adding a tspan (empty except for a zero-width space)
// with dy of -70% * SHIFT_DY (because font-size=70%)
const RESET_DY: Record<string, string> = {
    sub: '-0.21em',
    sup: '0.42em'
};
const ZERO_WIDTH_SPACE = '\u200b';

/*
 * Whitelist of protocols in user-supplied urls. Mostly we want to avoid javascript
 * and related attack vectors. The empty items are there for IE, that in various
 * versions treats relative paths as having different flavors of no protocol, while
 * other browsers have these explicitly inherit the protocol of the page they're in.
 */
const PROTOCOLS: (string | undefined)[] = ['http:', 'https:', 'mailto:', '', undefined, ':'];

export const NEWLINES = /(\r\n?|\n)/g;

const SPLIT_TAGS = /(<[^<>]*>)/;

const ONE_TAG = /<(\/?)([^ >]*)(\s+(.*))?>/i;

const BR_TAG = /<br(\s+.*)?>/i;
export const BR_TAG_ALL = /<br(\s+.*)?>/gi;

/*
 * style and href: pull them out of either single or double quotes. Also
 * - target: (_blank|_self|_parent|_top|framename)
 *     note that you can't use target to get a popup but if you use popup,
 *     a `framename` will be passed along as the name of the popup window.
 *     per the spec, cannot contain whitespace.
 *     for backward compatibility we default to '_blank'
 * - popup: a custom one for us to enable popup (new window) links. String
 *     for window.open -> strWindowFeatures, like 'menubar=yes,width=500,height=550'
 *     note that at least in Chrome, you need to give at least one property
 *     in this string or the page will open in a new tab anyway. We follow this
 *     convention and will not make a popup if this string is empty.
 *     per the spec, cannot contain whitespace.
 *
 * Because we hack in other attributes with style (sub & sup), drop any trailing
 * semicolon in user-supplied styles so we can consistently append the tag-dependent style
 *
 * These are for tag attributes; Chrome anyway will convert entities in
 * attribute values, but not in attribute names
 * you can test this by for example:
 * > p = document.createElement('p')
 * > p.innerHTML = '<span styl&#x65;="font-color:r&#x65;d;">Hi</span>'
 * > p.innerHTML
 * <- '<span styl&#x65;="font-color:red;">Hi</span>'
 */
const STYLEMATCH = /(^|[\s"'])style\s*=\s*("([^"]*);?"|'([^']*);?')/i;
const HREFMATCH = /(^|[\s"'])href\s*=\s*("([^"]*)"|'([^']*)')/i;
const TARGETMATCH = /(^|[\s"'])target\s*=\s*("([^"\s]*)"|'([^'\s]*)')/i;
const POPUPMATCH = /(^|[\s"'])popup\s*=\s*("([\w=,]*)"|'([\w=,]*)')/i;

// dedicated matcher for these quoted regexes, that can return their results
// in two different places
function getQuotedMatch(_str: string, re: RegExp): string | null {
    if(!_str) return null;
    const match = _str.match(re);
    const result = match && (match[3] || match[4]);
    return result && convertEntities(result);
}

const COLORMATCH = /(^|;)\s*color:/;

export const plainText = function(_str: string, opts?: any): string {
    opts = opts || {};

    const len = (opts.len !== undefined && opts.len !== -1) ? opts.len : Infinity;
    const allowedTags: string[] = opts.allowedTags !== undefined ? opts.allowedTags : ['br'];

    const ellipsis = '...';
    const eLen = ellipsis.length;

    const oldParts = _str.split(SPLIT_TAGS);
    const newParts: string[] = [];
    let prevTag = '';
    let l = 0;

    for(let i = 0; i < oldParts.length; i++) {
        const p = oldParts[i];
        const match = p.match(ONE_TAG);
        const tagType = match && match[2].toLowerCase();

        if(tagType) {
            // N.B. tags do not count towards string length
            if(allowedTags.indexOf(tagType) !== -1) {
                newParts.push(p);
                prevTag = tagType;
            }
        } else {
            const pLen = p.length;

            if((l + pLen) < len) {
                newParts.push(p);
                l += pLen;
            } else if(l < len) {
                const pLen2 = len - l;

                if(prevTag && (prevTag !== 'br' || pLen2 <= eLen || pLen <= eLen)) {
                    newParts.pop();
                }

                if(len > eLen) {
                    newParts.push(p.slice(0, Math.max(0, pLen2 - eLen)) + ellipsis);
                } else {
                    newParts.push(p.slice(0, pLen2));
                }
                break;
            }

            prevTag = '';
        }
    }

    return newParts.join('');
};

/*
 * N.B. HTML entities are listed without the leading '&' and trailing ';'
 * https://www.freeformatter.com/html-entities.html
 *
 * FWIW if we wanted to support the full set, it has 2261 entries:
 * https://www.w3.org/TR/html5/entities.json
 * though I notice that some of these are duplicates and/or are missing ";"
 * eg: "&amp;", "&amp", "&AMP;", and "&AMP" all map to "&"
 * We no longer need to include numeric entities here, these are now handled
 * by String.fromCodePoint/fromCharCode
 *
 * Anyway the only ones that are really important to allow are the HTML special
 * chars <, >, and &, because these ones can trigger special processing if not
 * replaced by the corresponding entity.
 */
const entityToUnicode: Record<string, string> = {
    mu: '\u03bc',
    amp: '&',
    lt: '<',
    gt: '>',
    nbsp: '\u00a0',
    times: '\u00d7',
    plusmn: '\u00b1',
    deg: '\u00b0'
};

// NOTE: in general entities can contain uppercase too (so [a-zA-Z]) but all the
// ones we support use only lowercase. If we ever change that, update the regex.
const ENTITY_MATCH = /&(#\d+|#x[\da-fA-F]+|[a-z]+);/g;
function convertEntities(_str: string): string {
    return _str.replace(ENTITY_MATCH, function(fullMatch: string, innerMatch: string) {
        let outChar: string | undefined;
        if(innerMatch.charAt(0) === '#') {
            // cannot use String.fromCodePoint in IE
            outChar = fromCodePoint(
                innerMatch.charAt(1) === 'x' ?
                    parseInt(innerMatch.slice(2), 16) :
                    parseInt(innerMatch.slice(1), 10)
            );
        } else outChar = entityToUnicode[innerMatch];

        // as in regular HTML, if we didn't decode the entity just
        // leave the raw text in place.
        return outChar || fullMatch;
    });
}
export { convertEntities };

function fromCodePoint(code: number): string | undefined {
    // Don't allow overflow. In Chrome this turns into \ufffd but I feel like it's
    // more useful to just not convert it at all.
    if(code > 0x10FFFF) return;
    const stringFromCodePoint = String.fromCodePoint;
    if(stringFromCodePoint) return stringFromCodePoint(code);

    // IE doesn't have String.fromCodePoint
    // see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/fromCodePoint
    const stringFromCharCode = String.fromCharCode;
    if(code <= 0xFFFF) return stringFromCharCode(code);
    return stringFromCharCode(
        (code >> 10) + 0xD7C0,
        (code % 0x400) + 0xDC00
    );
}

/*
 * buildSVGText: convert our pseudo-html into SVG tspan elements, and attach these
 * to containerNode
 *
 * @param {svg text element} containerNode: the <text> node to insert this text into
 * @param {string} str: the pseudo-html string to convert to svg
 *
 * @returns {bool}: does the result contain any links? We need to handle the text element
 *   somewhat differently if it does, so just keep track of this when it happens.
 */
function buildSVGText(containerNode: any, str: string): boolean {
    /*
     * Normalize behavior between IE and others wrt newlines and whitespace:pre
     * this combination makes IE barf https://github.com/plotly/plotly.js/issues/746
     * Chrome and FF display \n, \r, or \r\n as a space in this mode.
     * I feel like at some point we turned these into <br> but currently we don't so
     * I'm just going to cement what we do now in Chrome and FF
     */
    str = str.replace(NEWLINES, ' ');

    let hasLink = false;

    // as we're building the text, keep track of what elements we're nested inside
    // nodeStack will be an array of {node, type, style, href, target, popup}
    // where only type: 'a' gets the last 3 and node is only added when it's created
    let nodeStack: any[] = [];
    let currentNode: any;
    let currentLine = -1;

    function newLine(): void {
        currentLine++;

        const lineNode = document.createElementNS(xmlnsNamespaces.svg, 'tspan');
        select(lineNode)
            .attr('class', 'line')
            .attr('dy', (currentLine * LINE_SPACING) + 'em');
        containerNode.appendChild(lineNode);

        currentNode = lineNode;

        const oldNodeStack = nodeStack;
        nodeStack = [{node: lineNode}];

        if(oldNodeStack.length > 1) {
            for(let i = 1; i < oldNodeStack.length; i++) {
                enterNode(oldNodeStack[i]);
            }
        }
    }

    function enterNode(nodeSpec: any): void {
        const type = nodeSpec.type;
        let nodeAttrs: any = {};
        let nodeType: string;

        if(type === 'a') {
            nodeType = 'a';
            const target = nodeSpec.target;
            const href = nodeSpec.href;
            const popup = nodeSpec.popup;
            if(href) {
                nodeAttrs = {
                    'xlink:xlink:show': (target === '_blank' || target.charAt(0) !== '_') ? 'new' : 'replace',
                    target: target,
                    'xlink:xlink:href': href
                };
                if(popup) {
                    // security: href and target are not inserted as code but
                    // as attributes. popup is, but limited to /[A-Za-z0-9_=,]/
                    nodeAttrs.onclick = 'window.open(this.href.baseVal,this.target.baseVal,"' +
                        popup + '");return false;';
                }
            }
        } else nodeType = 'tspan';

        if(nodeSpec.style) nodeAttrs.style = nodeSpec.style;

        const newNode = document.createElementNS(xmlnsNamespaces.svg, nodeType);

        if(type === 'sup' || type === 'sub') {
            addTextNode(currentNode, ZERO_WIDTH_SPACE);
            currentNode.appendChild(newNode);

            const resetter = document.createElementNS(xmlnsNamespaces.svg, 'tspan');
            addTextNode(resetter, ZERO_WIDTH_SPACE);
            select(resetter).attr('dy', RESET_DY[type]);
            nodeAttrs.dy = SHIFT_DY[type];

            currentNode.appendChild(newNode);
            currentNode.appendChild(resetter);
        } else {
            currentNode.appendChild(newNode);
        }

        const newNodeSel = select(newNode);
        for(const k in nodeAttrs) newNodeSel.attr(k, nodeAttrs[k]);

        currentNode = nodeSpec.node = newNode;
        nodeStack.push(nodeSpec);
    }

    function addTextNode(node: any, text: string): void {
        node.appendChild(document.createTextNode(text));
    }

    function exitNode(type: string): void {
        // A bare closing tag can't close the root node. If we encounter this it
        // means there's an extra closing tag that can just be ignored:
        if(nodeStack.length === 1) {
            log('Ignoring unexpected end tag </' + type + '>.', str);
            return;
        }

        const innerNode = nodeStack.pop();

        if(type !== innerNode.type) {
            log('Start tag <' + innerNode.type + '> doesnt match end tag <' +
                type + '>. Pretending it did match.', str);
        }
        currentNode = nodeStack[nodeStack.length - 1].node;
    }

    const hasLines = BR_TAG.test(str);

    if(hasLines) newLine();
    else {
        currentNode = containerNode;
        nodeStack = [{node: containerNode}];
    }

    const parts = str.split(SPLIT_TAGS);
    for(let i = 0; i < parts.length; i++) {
        const parti = parts[i];
        const match = parti.match(ONE_TAG);
        const tagType = match && match[2].toLowerCase();
        const tagStyle = TAG_STYLES[tagType as string];

        if(tagType === 'br') {
            newLine();
        } else if(tagStyle === undefined) {
            addTextNode(currentNode, convertEntities(parti));
        } else {
            // tag - open or close
            if(match![1]) {
                exitNode(tagType as string);
            } else {
                const extra = match![4];

                const nodeSpec: any = {type: tagType};

                // now add style, from both the tag name and any extra css
                // Most of the svg css that users will care about is just like html,
                // but font color is different (uses fill). Let our users ignore this.
                let css = getQuotedMatch(extra, STYLEMATCH);
                if(css) {
                    css = css.replace(COLORMATCH, '$1 fill:');
                    if(tagStyle) css += ';' + tagStyle;
                } else if(tagStyle) css = tagStyle;

                if(css) nodeSpec.style = css;

                if(tagType === 'a') {
                    hasLink = true;

                    const href = getQuotedMatch(extra, HREFMATCH);

                    if(href) {
                        const safeHref = sanitizeHref(href);
                        if(safeHref) {
                            nodeSpec.href = safeHref;
                            nodeSpec.target = getQuotedMatch(extra, TARGETMATCH) || '_blank';
                            nodeSpec.popup = getQuotedMatch(extra, POPUPMATCH);
                        }
                    }
                }

                enterNode(nodeSpec);
            }
        }
    }

    return hasLink;
}

function sanitizeHref(href: string): string {
    const decodedHref = encodeURI(decodeURI(href));
    const dummyAnchor1 = document.createElement('a');
    const dummyAnchor2 = document.createElement('a');
    dummyAnchor1.href = href;
    dummyAnchor2.href = decodedHref;

    const p1 = dummyAnchor1.protocol;
    const p2 = dummyAnchor2.protocol;

    // check safe protocols
    if(
        PROTOCOLS.indexOf(p1) !== -1 &&
        PROTOCOLS.indexOf(p2) !== -1
    ) {
        return decodedHref;
    } else {
        return '';
    }
}

export const sanitizeHTML = function sanitizeHTML(str: string): string {
    str = str.replace(NEWLINES, ' ');

    const rootNode = document.createElement('p');
    let currentNode: any = rootNode;
    const nodeStack: any[] = [];

    const parts = str.split(SPLIT_TAGS);
    for(let i = 0; i < parts.length; i++) {
        const parti = parts[i];
        const match = parti.match(ONE_TAG);
        const tagType = match && match[2].toLowerCase();

        if(tagType && tagType in TAG_STYLES) {
            if(match![1]) {
                if(nodeStack.length) {
                    currentNode = nodeStack.pop();
                }
            } else {
                const extra = match![4];

                const css = getQuotedMatch(extra, STYLEMATCH);
                const nodeAttrs: any = css ? {style: css} : {};

                if(tagType === 'a') {
                    const href = getQuotedMatch(extra, HREFMATCH);

                    if(href) {
                        const safeHref = sanitizeHref(href);
                        if(safeHref) {
                            nodeAttrs.href = safeHref;
                            const target = getQuotedMatch(extra, TARGETMATCH);
                            if(target) {
                                nodeAttrs.target = target;
                            }
                        }
                    }
                }

                const newNode = document.createElement(tagType);
                currentNode.appendChild(newNode);
                const newNodeSel = select(newNode);
                for(const k in nodeAttrs) newNodeSel.attr(k, nodeAttrs[k]);

                currentNode = newNode;
                nodeStack.push(newNode);
            }
        } else {
            currentNode.appendChild(
                document.createTextNode(convertEntities(parti))
            );
        }
    }
    const key = 'innerHTML'; // i.e. to avoid pass test-syntax
    return rootNode[key];
};

export const lineCount = function lineCount(s: any): number {
    return s.selectAll('tspan.line').size() || 1;
};

export const positionText = function positionText(s: any, x?: number, y?: number): void {
    return s.each(function(this: any) {
        const text = select(this);

        function setOrGet(attr: string, val?: number): number {
            if(val === undefined) {
                val = text.attr(attr) as any;
                if(val === null) {
                    text.attr(attr, 0);
                    val = 0;
                }
            } else text.attr(attr, val);
            return val as number;
        }

        const thisX = setOrGet('x', x);
        const thisY = setOrGet('y', y);

        if(this.nodeName === 'text') {
            text.selectAll('tspan.line')
                .attr('x', thisX)
                .attr('y', thisY);
        }
    });
};

function alignHTMLWith(_base: any, container: any, options: any): (this: any) => any {
    const alignH = options.horizontalAlign;
    const alignV = options.verticalAlign || 'top';
    const bRect = _base.node().getBoundingClientRect();
    const cRect = container.node().getBoundingClientRect();
    let thisRect: any;
    let getTop: () => number;
    let getLeft: () => number;

    if(alignV === 'bottom') {
        getTop = function() { return bRect.bottom - thisRect.height; };
    } else if(alignV === 'middle') {
        getTop = function() { return bRect.top + (bRect.height - thisRect.height) / 2; };
    } else { // default: top
        getTop = function() { return bRect.top; };
    }

    if(alignH === 'right') {
        getLeft = function() { return bRect.right - thisRect.width; };
    } else if(alignH === 'center') {
        getLeft = function() { return bRect.left + (bRect.width - thisRect.width) / 2; };
    } else { // default: left
        getLeft = function() { return bRect.left; };
    }

    return function(this: any) {
        thisRect = this.node().getBoundingClientRect();

        let x0 = getLeft() - cRect.left;
        let y0 = getTop() - cRect.top;
        const gd = options.gd || {};
        if(options.gd) {
            gd._fullLayout._calcInverseTransform(gd);
            const transformedCoords = apply3DTransform(gd._fullLayout._invTransform)(x0, y0);
            x0 = transformedCoords[0];
            y0 = transformedCoords[1];
        }

        this
            .style('top', y0 + 'px')
            .style('left', x0 + 'px')
            .style('z-index', 1000);
        return this;
    };
}

const onePx = '1px ';

export const makeTextShadow = function(color: string): string {
    const x = onePx;
    const y = onePx;
    const b = onePx;
    return x + y + b + color + ', ' +
        '-' + x + '-' + y + b + color + ', ' +
        x + '-' + y + b + color + ', ' +
        '-' + x + y + b + color;
};

export const makeEditable = function(context: any, options: any): any {
    const gd = options.gd;
    const _delegate = options.delegate;
    const d = dispatch('edit', 'input', 'cancel');
    const handlerElement = _delegate || context;

    context.style('pointer-events', _delegate ? 'none' : 'all');

    if(context.size() !== 1) throw new Error('boo');

    function handleClick(): void {
        appendEditable();
        context.style('opacity', 0);
        // also hide any mathjax svg
        const svgClass = handlerElement.attr('class');
        let mathjaxClass: string;
        if(svgClass) mathjaxClass = '.' + svgClass.split(' ')[0] + '-math-group';
        else mathjaxClass = '[class*=-math-group]';
        if(mathjaxClass) {
            select(context.node().parentNode).select(mathjaxClass).style('opacity', 0);
        }
    }

    function selectElementContents(_el: any): void {
        const el = _el.node();
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel!.removeAllRanges();
        sel!.addRange(range);
        el.focus();
    }

    function appendEditable(): any {
        const plotDiv = select(gd);
        const container = plotDiv.select('.svg-container');
        const div = container.append('div');
        const cStyle = context.node().style;
        const fontSize = parseFloat(cStyle.fontSize || 12);

        let initialText = options.text;
        if(initialText === undefined) initialText = context.attr('data-unformatted');

        div.classed('plugin-editable editable', true)
            .style('position', 'absolute')
            .style('font-family', cStyle.fontFamily || 'Arial')
            .style('font-size', fontSize)
            .style('color', options.fill || cStyle.fill || 'black')
            .style('opacity', 1)
            .style('background-color', options.background || 'transparent')
            .style('outline', '#ffffff33 1px solid')
            .style('margin', [-fontSize / 8 + 1, 0, 0, -1].join('px ') + 'px')
            .style('padding', '0')
            .style('box-sizing', 'border-box')
            .attr('contenteditable', true)
            .text(initialText)
            .call(alignHTMLWith(context, container, options))
            .on('blur', function(this: any, event: any) {
                gd._editing = false;
                context.text(this.textContent)
                    .style('opacity', 1);
                const svgClass = select(this).attr('class');
                let mathjaxClass: string;
                if(svgClass) mathjaxClass = '.' + svgClass.split(' ')[0] + '-math-group';
                else mathjaxClass = '[class*=-math-group]';
                if(mathjaxClass) {
                    select(context.node().parentNode).select(mathjaxClass).style('opacity', 0);
                }
                const text = this.textContent;
                select(this).transition().duration(0).remove();
                select(document).on('mouseup', null);
                d.call('edit', context, text);
            })
            .on('focus', function(this: any, event: any) {
                const editDiv = this;
                gd._editing = true;
                select(document).on('mouseup', function(event: any) {
                    if(event.target === editDiv) return false;
                    if(document.activeElement === div.node()) div.node().blur();
                });
            })
            .on('keyup', function(this: any, event: any) {
                if(event.which === 27) {
                    gd._editing = false;
                    context.style('opacity', 1);
                    select(this)
                        .style('opacity', 0)
                        .on('blur', function(event: any) { return false; })
                        .transition().remove();
                    d.call('cancel', context, this.textContent);
                } else {
                    d.call('input', context, this.textContent);
                    select(this).call(alignHTMLWith(context, container, options));
                }
            })
            .on('keydown', function(this: any, event: any) {
                if(event.which === 13) this.blur();
            })
            .call(selectElementContents);
    }

    if(options.immediate) handleClick();
    else handlerElement.on('click', handleClick);

    return Object.assign(context, { on: d.on.bind(d) });
};

export default { convertToTspans, NEWLINES, BR_TAG_ALL, plainText, sanitizeHTML, lineCount, positionText, makeTextShadow, makeEditable, convertEntities };
