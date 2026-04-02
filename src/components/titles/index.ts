import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
function d3Round(x: number, n?: number): number { return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x); }
import isNumeric from 'fast-isnumeric';
import { previousPromises } from '../../plots/plots.js';
import Registry from '../../registry.js';
import { bBoxIntersect, ensureSingle, extendFlat, setAttrs, strTranslate, syncOrAsync, templateString } from '../../lib/index.js';
import { bBox, font } from '../drawing/index.js';
import Color from '../color/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import interactConstants from '../../constants/interactions.js';
import _alignment from '../../constants/alignment.js';
const { OPPOSITE_SIDE } = _alignment;
const numStripRE = / [XY][0-9]* /;
const SUBTITLE_PADDING_MATHJAX_EM = 1.6;
const SUBTITLE_PADDING_EM = 1.6;

/**
 * Titles - (re)draw titles on the axes and plot:
 * @param {DOM element} gd - the graphDiv
 * @param {string} titleClass - the css class of this title
 * @param {object} options - how and what to draw
 *      propContainer - the layout object containing the `title` attribute that
 *          applies to this title
 *      propName - the full name of the title property (for Plotly.relayout)
 *      [traceIndex] - include only if this property applies to one trace
 *          (such as a colorbar title) - then editing pipes to Plotly.restyle
 *          instead of Plotly.relayout
 *      placeholder - placeholder text for an empty editable title
 *      [avoid] {object} - include if this title should move to avoid other elements
 *          selection - d3 selection of elements to avoid
 *          side - which direction to move if there is a conflict
 *          [offsetLeft] - if these elements are subject to a translation
 *              wrt the title element
 *          [offsetTop]
 *      attributes {object} - position and alignment attributes
 *          x - pixels
 *          y - pixels
 *          text-anchor - start|middle|end
 *      transform {object} - how to transform the title after positioning
 *          rotate - degrees
 *          offset - shift up/down in the rotated frame (unused?)
 *      containerGroup - if an svg <g> element already exists to hold this
 *          title, include here. Otherwise it will go in fullLayout._infolayer
 *      _meta {object (optional} - meta key-value to for title with
 *          templateString, default to fullLayout._meta, if not provided
 *
 *  @return {selection} d3 selection of title container group
 */
function draw(gd: GraphDiv, titleClass: string, options: any): any {
    const fullLayout = gd._fullLayout;

    const cont = options.propContainer;
    const prop = options.propName;
    const placeholder = options.placeholder;
    const traceIndex = options.traceIndex;
    const avoid = options.avoid || {};
    const attributes = options.attributes;
    let transform = options.transform;
    let group = options.containerGroup;
    let opacity = 1;
    const title = cont.title;
    let txt = (title && title.text ? title.text : '').trim();
    let titleIsPlaceholder = false;

    const titleFont = title && title.font ? title.font : {};
    const fontFamily = titleFont.family;
    const fontSize = titleFont.size;
    const fontColor = titleFont.color;
    const fontWeight = titleFont.weight;
    const fontStyle = titleFont.style;
    const fontVariant = titleFont.variant;
    const fontTextcase = titleFont.textcase;
    const fontLineposition = titleFont.lineposition;
    const fontShadow = titleFont.shadow;

    // Get subtitle properties
    const subtitleProp = options.subtitlePropName;
    const subtitleEnabled = !!subtitleProp;
    const subtitlePlaceholder = options.subtitlePlaceholder;
    const subtitle = (cont.title || {}).subtitle || {text: '', font: {}};
    let subtitleTxt = (subtitle.text || '').trim();
    let subtitleIsPlaceholder = false;
    let subtitleOpacity = 1;

    const subtitleFont = subtitle.font;
    const subFontFamily = subtitleFont.family;
    const subFontSize = subtitleFont.size;
    const subFontColor = subtitleFont.color;
    const subFontWeight = subtitleFont.weight;
    const subFontStyle = subtitleFont.style;
    const subFontVariant = subtitleFont.variant;
    const subFontTextcase = subtitleFont.textcase;
    const subFontLineposition = subtitleFont.lineposition;
    const subFontShadow = subtitleFont.shadow;

    // only make this title editable if we positively identify its property
    // as one that has editing enabled.
    // Subtitle is editable if and only if title is editable
    let editAttr: string | undefined;
    if(prop === 'title.text') editAttr = 'titleText';
    else if(prop.indexOf('axis') !== -1) editAttr = 'axisTitleText';
    else if(prop.indexOf('colorbar') !== -1) editAttr = 'colorbarTitleText';
    const editable = gd._context.edits[editAttr!];

    function matchesPlaceholder(text: string | undefined, placeholder: string | undefined): boolean {
        if(text === undefined || placeholder === undefined) return false;
        // look for placeholder text while stripping out numbers from eg X2, Y3
        // this is just for backward compatibility with the old version that had
        // "Click to enter X2 title" and may have gotten saved in some old plots,
        // we don't want this to show up when these are displayed.
        return text.replace(numStripRE, ' % ') === placeholder.replace(numStripRE, ' % ');
    }

    if(txt === '') opacity = 0;
    else if(matchesPlaceholder(txt, placeholder)) {
        if(!editable) txt = '';
        opacity = 0.2;
        titleIsPlaceholder = true;
    }

    if(subtitleEnabled) {
        if(subtitleTxt === '') subtitleOpacity = 0;
        else if(matchesPlaceholder(subtitleTxt, subtitlePlaceholder)) {
            if(!editable) subtitleTxt = '';
            subtitleOpacity = 0.2;
            subtitleIsPlaceholder = true;
        }
    }

    if(options._meta) {
        txt = templateString(txt, options._meta);
    } else if(fullLayout._meta) {
        txt = templateString(txt, fullLayout._meta);
    }

    const elShouldExist = txt || subtitleTxt || editable;

    let hColorbarMoveTitle: any;
    if(!group) {
        group = ensureSingle(fullLayout._infolayer, 'g', 'g-' + titleClass);
        hColorbarMoveTitle = fullLayout._hColorbarMoveTitle;
    }

    const elJoin = group.selectAll('text.' + titleClass)
        .data(elShouldExist ? [0] : []);
    elJoin.exit().remove();
    const el = elJoin.enter().append('text').merge(elJoin);
    el.text(txt)
        // this is hacky, but convertToTspans uses the class
        // to determine whether to rotate mathJax...
        // so we need to clear out any old class and put the
        // correct one (only relevant for colorbars, at least
        // for now) - ie don't use .classed
        .attr('class', titleClass);

    let subtitleEl: any = null;
    const subtitleClass = titleClass + '-subtitle';
    const subtitleElShouldExist = subtitleTxt || editable;

    if(subtitleEnabled) {
        const subtitleJoin = group.selectAll('text.' + subtitleClass)
            .data(subtitleElShouldExist ? [0] : []);
        subtitleJoin.exit().remove();
        subtitleEl = subtitleJoin.enter().append('text').merge(subtitleJoin);
        subtitleEl.text(subtitleTxt).attr('class', subtitleClass);
    }

    if(!elShouldExist) return group;

    function titleLayout(titleEl: any, subtitleEl: any): void {
        syncOrAsync([drawTitle, scootTitle], { title: titleEl, subtitle: subtitleEl });
    }

    function drawTitle(titleAndSubtitleEls: any): any {
        const titleEl = titleAndSubtitleEls.title;
        const subtitleEl = titleAndSubtitleEls.subtitle;

        let transformVal: string | null;

        if(!transform && hColorbarMoveTitle) {
            transform = {};
        }

        if(transform) {
            transformVal = '';
            if(transform.rotate) {
                transformVal += 'rotate(' + [transform.rotate, attributes.x, attributes.y] + ')';
            }
            if(transform.offset || hColorbarMoveTitle) {
                transformVal += strTranslate(0, (transform.offset || 0) - (hColorbarMoveTitle || 0));
            }
        } else {
            transformVal = null;
        }

        titleEl.attr('transform', transformVal);

        // Callback to adjust the subtitle position after mathjax is rendered
        // Mathjax is rendered asynchronously, which is why this step needs to be
        // passed as a callback
        function adjustSubtitlePosition(titleElMathGroup: any): void {
            if(!titleElMathGroup) return;

            const subtitleElement = select(titleElMathGroup.node().parentNode).select('.' + subtitleClass);
            if(!subtitleElement.empty()) {
                const titleElMathBbox = titleElMathGroup.node().getBBox();
                if(titleElMathBbox.height) {
                    // Position subtitle based on bottom of Mathjax title
                    const subtitleY = titleElMathBbox.y + titleElMathBbox.height + (SUBTITLE_PADDING_MATHJAX_EM * subFontSize);
                    subtitleElement.attr('y', subtitleY);
                }
            }
        }

        titleEl.style('opacity', opacity * Color.opacity(fontColor))
        .call(font, {
            color: Color.rgb(fontColor),
            size: d3Round(fontSize, 2),
            family: fontFamily,
            weight: fontWeight,
            style: fontStyle,
            variant: fontVariant,
            textcase: fontTextcase,
            shadow: fontShadow,
            lineposition: fontLineposition,
        })
        .call(setAttrs, attributes)
            .call(svgTextUtils.convertToTspans, gd, adjustSubtitlePosition);

        if(subtitleEl && !subtitleEl.empty()) {
            // Set subtitle y position based on bottom of title
            // We need to check the Mathjax group as well, in case the Mathjax
            // has already rendered
            const titleElMathGroup = group.select('.' + titleClass + '-math-group');
            const titleElBbox = titleEl.node().getBBox();
            const titleElMathBbox = titleElMathGroup.node() ? titleElMathGroup.node().getBBox() : undefined;
            const subtitleY = titleElMathBbox ? titleElMathBbox.y + titleElMathBbox.height + (SUBTITLE_PADDING_MATHJAX_EM * subFontSize) : titleElBbox.y + titleElBbox.height + (SUBTITLE_PADDING_EM * subFontSize);

            const subtitleAttributes = extendFlat({}, attributes, {
                y: subtitleY
            });

            subtitleEl.attr('transform', transformVal);
            subtitleEl.style('opacity', subtitleOpacity * Color.opacity(subFontColor))
            .call(font, {
                color: Color.rgb(subFontColor),
                size: d3Round(subFontSize, 2),
                family: subFontFamily,
                weight: subFontWeight,
                style: subFontStyle,
                variant: subFontVariant,
                textcase: subFontTextcase,
                shadow: subFontShadow,
                lineposition: subFontLineposition,
            })
            .call(setAttrs, subtitleAttributes)
                .call(svgTextUtils.convertToTspans, gd);
        }

        return previousPromises(gd);
    }

    function scootTitle(titleAndSubtitleEls: any): void {
        const titleElIn = titleAndSubtitleEls.title;
        const titleGroup = select(titleElIn.node().parentNode);

        if(avoid && avoid.selection && avoid.side && txt) {
            titleGroup.attr('transform', null);

            // move toward avoid.side (= left, right, top, bottom) if needed
            // can include pad (pixels, default 2)
            const backside = OPPOSITE_SIDE[avoid.side as keyof typeof OPPOSITE_SIDE];
            const shiftSign = (avoid.side === 'left' || avoid.side === 'top') ? -1 : 1;
            const pad = isNumeric(avoid.pad) ? avoid.pad : 2;

            const titlebb = bBox(titleGroup.node());

            // Account for reservedMargins
            const reservedMargins: Record<string, number> = {t: 0, b: 0, l: 0, r: 0};
            const margins = gd._fullLayout._reservedMargin;
            for(const key in margins) {
                for(const side in margins[key]) {
                    const val = margins[key][side];
                    reservedMargins[side] = Math.max(reservedMargins[side], val);
                }
            }
            const paperbb: Record<string, number> = {
                left: reservedMargins.l,
                top: reservedMargins.t,
                right: fullLayout.width! - reservedMargins.r,
                bottom: fullLayout.height! - reservedMargins.b
            };

            const maxshift = avoid.maxShift ||
                shiftSign * (paperbb[avoid.side] - titlebb[avoid.side]);
            let shift = 0;

            // Prevent the title going off the paper
            if(maxshift < 0) {
                shift = maxshift;
            } else {
                // so we don't have to offset each avoided element,
                // give the title the opposite offset
                const offsetLeft = avoid.offsetLeft || 0;
                const offsetTop = avoid.offsetTop || 0;
                titlebb.left -= offsetLeft;
                titlebb.right -= offsetLeft;
                titlebb.top -= offsetTop;
                titlebb.bottom -= offsetTop;

                // iterate over a set of elements (avoid.selection)
                // to avoid collisions with
                avoid.selection.each(function(this: any) {
                    const avoidbb = bBox(this);

                    if(bBoxIntersect(titlebb, avoidbb, pad)) {
                        shift = Math.max(shift, shiftSign * (
                            avoidbb[avoid.side] - titlebb[backside]) + pad);
                    }
                });
                shift = Math.min(maxshift, shift);
                // Keeping track of this for calculation of full axis size if needed
                cont._titleScoot = Math.abs(shift);
            }

            if(shift > 0 || maxshift < 0) {
                const shiftTemplate: Record<string, [number, number]> = {
                    left: [-shift, 0],
                    right: [shift, 0],
                    top: [0, -shift],
                    bottom: [0, shift]
                };
                titleGroup.attr('transform', strTranslate(shiftTemplate[avoid.side][0], shiftTemplate[avoid.side][1]));
            }
        }
    }

    el.call(titleLayout, subtitleEl);

    function setPlaceholder(element: any, placeholderText: string): void {
        element.text(placeholderText)
            .on('mouseover.opacity', function(this: any) {
                select(this).transition()
                    .duration(interactConstants.SHOW_PLACEHOLDER).style('opacity', 1);
            })
            .on('mouseout.opacity', function(this: any) {
                select(this).transition()
                    .duration(interactConstants.HIDE_PLACEHOLDER).style('opacity', 0);
            });
    }

    if(editable) {
        if(!txt) {
            setPlaceholder(el, placeholder);
            titleIsPlaceholder = true;
        } else el.on('.opacity', null);

        el.call(svgTextUtils.makeEditable, {gd: gd})
            .on('edit', function(this: any, text: string) {
                if(traceIndex !== undefined) {
                    Registry.call('_guiRestyle', gd, prop, text, traceIndex);
                } else {
                    Registry.call('_guiRelayout', gd, prop, text);
                }
            })
            .on('cancel', function(this: any) {
                this.text(this.attr('data-unformatted'))
                    .call(titleLayout);
            })
            .on('input', function(this: any, d: string) {
                this.text(d || ' ')
                    .call(svgTextUtils.positionText, attributes.x, attributes.y);
            });

        if(subtitleEnabled) {
            // Adjust subtitle position now that title placeholder has been added
            // Only adjust if subtitle is enabled and title text was originally empty
            if(subtitleEnabled && !txt) {
                const titleElBbox = el.node().getBBox();
                const subtitleY = titleElBbox.y + titleElBbox.height + (SUBTITLE_PADDING_EM * subFontSize);
                subtitleEl.attr('y', subtitleY);
            }

            if(!subtitleTxt) {
                setPlaceholder(subtitleEl, subtitlePlaceholder);
                subtitleIsPlaceholder = true;
            } else subtitleEl.on('.opacity', null);
            subtitleEl.call(svgTextUtils.makeEditable, {gd: gd})
                .on('edit', function(this: any, text: string) {
                    Registry.call('_guiRelayout', gd, 'title.subtitle.text', text);
                })
                .on('cancel', function(this: any) {
                    this.text(this.attr('data-unformatted'))
                        .call(titleLayout);
                })
                .on('input', function(this: any, d: string) {
                    this.text(d || ' ')
                        .call(svgTextUtils.positionText, subtitleEl.attr('x'), subtitleEl.attr('y'));
                });
        }
    }

    el.classed('js-placeholder', titleIsPlaceholder);
    if(subtitleEl && !subtitleEl.empty()) subtitleEl.classed('js-placeholder', subtitleIsPlaceholder);

    return group;
}

export default {
    draw: draw,
    SUBTITLE_PADDING_EM: SUBTITLE_PADDING_EM,
    SUBTITLE_PADDING_MATHJAX_EM: SUBTITLE_PADDING_MATHJAX_EM,
};
