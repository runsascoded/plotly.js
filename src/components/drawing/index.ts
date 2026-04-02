import { select } from 'd3-selection';
import type { GraphDiv, FullTrace, FullAxis } from '../../../types/core';
function d3Round(x: number, n: number): number { return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x); }
import { ensureSingle, ensureSingleById, extendFlat, extractOption, identity, isArrayOrTypedArray, nestedProperty, numberFormat, strTranslate, texttemplateString } from '../../lib/index.js';
import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import { traceIs } from '../../lib/trace_categories.js';
import Color from '../color/index.js';
import Colorscale from '../colorscale/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import alignment from '../../constants/alignment.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import subTypes from '../../traces/scatter/subtypes.js';
import makeBubbleSizeFn from '../../traces/scatter/make_bubble_size_func.js';
import { appendArrayPointValue } from '../../components/fx/helpers.js';
import SYMBOLDEFS from './symbol_defs.js';
export let tester: any;
export let testref: any;
const LINE_SPACING = alignment.LINE_SPACING;


// -----------------------------------------------------
// styling functions for plot elements
// -----------------------------------------------------

export function font(s: any, font: any): void {
    const variant = font.variant;
    const style = font.style;
    const weight = font.weight;
    const color = font.color;
    const size = font.size;
    const family = font.family;
    const shadow = font.shadow;
    const lineposition = font.lineposition;
    const textcase = font.textcase;

    if (family) s.style('font-family', family);
    if (size + 1) s.style('font-size', size + 'px');
    if (color) s.call(Color.fill, color);

    if (weight) s.style('font-weight', weight);
    if (style) s.style('font-style', style);
    if (variant) s.style('font-variant', variant);

    if (textcase) s.style('text-transform', dropNone(textcase2transform(textcase)));
    if (shadow)
        s.style(
            'text-shadow',
            shadow === 'auto' ? svgTextUtils.makeTextShadow(Color.contrast(color)) : dropNone(shadow)
        );
    if (lineposition) s.style('text-decoration-line', dropNone(lineposition2decorationLine(lineposition)));
}

function dropNone(a: string): string | undefined {
    return a === 'none' ? undefined : a;
}

const textcase2transformOptions: Record<string, string> = {
    normal: 'none',
    lower: 'lowercase',
    upper: 'uppercase',
    'word caps': 'capitalize'
};

function textcase2transform(textcase: string): string {
    return textcase2transformOptions[textcase];
}

function lineposition2decorationLine(lineposition: string): string {
    return lineposition
        .replace('under', 'underline')
        .replace('over', 'overline')
        .replace('through', 'line-through')
        .split('+')
        .join(' ');
}

export function setPosition(s: any, x: number, y: number): void {
    s.attr('x', x).attr('y', y);
}
export function setSize(s: any, w: number, h: number): void {
    s.attr('width', w).attr('height', h);
}
export function setRect(s: any, x: number, y: number, w: number, h: number): void {
    s.call(setPosition, x, y).call(setSize, w, h);
}

export function translatePoint(d: any, sel: any, xa: FullAxis, ya: FullAxis): boolean {
    const x = xa.c2p(d.x);
    const y = ya.c2p(d.y);

    if (isNumeric(x) && isNumeric(y) && sel.node()) {
        if (sel.node().nodeName === 'text') {
            sel.attr('x', x).attr('y', y);
        } else {
            sel.attr('transform', strTranslate(x, y));
        }
    } else {
        return false;
    }

    return true;
}

export function translatePoints(s: any, xa: FullAxis, ya: FullAxis): void {
    s.each(function (this: any, d: any) {
        const sel = select(this);
        translatePoint(d, sel, xa, ya);
    });
}

export function hideOutsideRangePoint(d: any, sel: any, xa: FullAxis, ya: FullAxis, xcalendar: any, ycalendar: any): void {
    sel.attr('display', xa.isPtWithinRange(d, xcalendar) && ya.isPtWithinRange(d, ycalendar) ? null : 'none');
}

export function hideOutsideRangePoints(traceGroups: any, subplot: any): void {
    if (!subplot._hasClipOnAxisFalse) return;

    const xa = subplot.xaxis;
    const ya = subplot.yaxis;

    traceGroups.each(function (this: any, d: any) {
        const trace = d[0].trace;
        const xcalendar = trace.xcalendar;
        const ycalendar = trace.ycalendar;
        const selector = traceIs(trace, 'bar-like') ? '.bartext' : '.point,.textpoint';

        traceGroups.selectAll(selector).each(function (this: any, d: any) {
            hideOutsideRangePoint(d, select(this), xa, ya, xcalendar, ycalendar);
        });
    });
}

export function crispRound(gd: GraphDiv, lineWidth: number, dflt?: number): number {
    if (!lineWidth || !isNumeric(lineWidth)) return dflt || 0;

    if (gd._context.staticPlot) return lineWidth;

    if (lineWidth < 1) return 1;
    return Math.round(lineWidth);
}

export function singleLineStyle(d: any, s: any, lw?: number, lc?: string, ld?: string): void {
    s.style('fill', 'none');
    const line = (((d || [])[0] || {}).trace || {}).line || {};
    const lw1 = lw || line.width || 0;
    const dash = ld || line.dash || '';

    Color.stroke(s, lc || line.color);
    dashLine(s, dash, lw1);
}

export function lineGroupStyle(s: any, lw?: number, lc?: string, ld?: string): void {
    s.style('fill', 'none').each(function (this: any, d: any) {
        const line = (((d || [])[0] || {}).trace || {}).line || {};
        const lw1 = lw || line.width || 0;
        const dash = ld || line.dash || '';

        select(this)
            .call(Color.stroke, lc || line.color)
            .call(dashLine, dash, lw1);
    });
}

export function dashLine(s: any, dash: string, lineWidth: number): void {
    lineWidth = +lineWidth || 0;

    dash = dashStyle(dash, lineWidth);

    s
        .style('stroke-dasharray', dash)
        .style('stroke-width', lineWidth + 'px');
}

export function dashStyle(dash: string, lineWidth: number): string {
    lineWidth = +lineWidth || 1;
    const dlw = Math.max(lineWidth, 3);

    if (dash === 'solid') dash = '';
    else if (dash === 'dot') dash = dlw + 'px,' + dlw + 'px';
    else if (dash === 'dash') dash = 3 * dlw + 'px,' + 3 * dlw + 'px';
    else if (dash === 'longdash') dash = 5 * dlw + 'px,' + 5 * dlw + 'px';
    else if (dash === 'dashdot') {
        dash = 3 * dlw + 'px,' + dlw + 'px,' + dlw + 'px,' + dlw + 'px';
    } else if (dash === 'longdashdot') {
        dash = 5 * dlw + 'px,' + 2 * dlw + 'px,' + dlw + 'px,' + 2 * dlw + 'px';
    }

    return dash;
}

function setFillStyle(sel: any, trace: FullTrace, gd: GraphDiv, forLegend: boolean): void {
    const markerPattern = trace.fillpattern;
    const fillgradient = trace.fillgradient;
    const pAttr = getPatternAttr;
    const patternShape = markerPattern && (pAttr(markerPattern.shape, 0, '') || pAttr(markerPattern.path, 0, ''));
    if (patternShape) {
        const patternBGColor = pAttr(markerPattern.bgcolor, 0, null);
        const patternFGColor = pAttr(markerPattern.fgcolor, 0, null);
        const patternFGOpacity = markerPattern.fgopacity;
        const patternSize = pAttr(markerPattern.size, 0, 8);
        const patternSolidity = pAttr(markerPattern.solidity, 0, 0.3);
        const patternID = trace.uid;
        pattern(
            sel,
            'point',
            gd,
            patternID,
            patternShape,
            patternSize,
            patternSolidity,
            undefined,
            markerPattern.fillmode,
            patternBGColor,
            patternFGColor,
            patternFGOpacity
        );
    } else if (fillgradient && fillgradient.type !== 'none') {
        let direction = fillgradient.type;
        let gradientID = 'scatterfill-' + trace.uid;
        if (forLegend) {
            gradientID = 'legendfill-' + trace.uid;
        }

        if (!forLegend && (fillgradient.start !== undefined || fillgradient.stop !== undefined)) {
            let start: any, stop: any;
            if (direction === 'horizontal') {
                start = {
                    x: fillgradient.start,
                    y: 0
                };
                stop = {
                    x: fillgradient.stop,
                    y: 0
                };
            } else if (direction === 'vertical') {
                start = {
                    x: 0,
                    y: fillgradient.start
                };
                stop = {
                    x: 0,
                    y: fillgradient.stop
                };
            }

            start.x = trace._xA.c2p(start.x === undefined ? trace._extremes.x.min[0].val : start.x, true);
            start.y = trace._yA.c2p(start.y === undefined ? trace._extremes.y.min[0].val : start.y, true);

            stop.x = trace._xA.c2p(stop.x === undefined ? trace._extremes.x.max[0].val : stop.x, true);
            stop.y = trace._yA.c2p(stop.y === undefined ? trace._extremes.y.max[0].val : stop.y, true);
            sel.call(
                gradientWithBounds,
                gd,
                gradientID,
                'linear',
                fillgradient.colorscale,
                'fill',
                start,
                stop,
                true,
                false
            );
        } else {
            if (direction === 'horizontal') {
                direction = direction + 'reversed';
            }
            sel.call(gradient, gd, gradientID, direction, fillgradient.colorscale, 'fill');
        }
    } else if (trace.fillcolor) {
        sel.call(Color.fill, trace.fillcolor);
    }
}

export function singleFillStyle(sel: any, gd: GraphDiv): void {
    const node = select(sel.node());
    const data = node.data();
    const trace = ((data[0] || [])[0] || {}).trace || {};
    setFillStyle(sel, trace, gd, false);
}

export function fillGroupStyle(s: any, gd: GraphDiv, forLegend?: boolean): void {
    s.style('stroke-width', 0).each(function (this: any, d: any) {
        const shape = select(this);
        if (d[0].trace) {
            setFillStyle(shape, d[0].trace, gd, forLegend!);
        }
    });
}

export const symbolNames: string[] = [];
export const symbolFuncs: any[] = [];
export const symbolBackOffs: number[] = [];
export const symbolNeedLines: Record<number, boolean> = {};
export const symbolNoDot: Record<number, boolean> = {};
export const symbolNoFill: Record<number, boolean> = {};
export const symbolList: any[] = [];

Object.keys(SYMBOLDEFS).forEach((k: string) => {
    const symDef = SYMBOLDEFS[k];
    const n = symDef.n;
    symbolList.push(
        n,
        String(n),
        k,

        n + 100,
        String(n + 100),
        k + '-open'
    );
    symbolNames[n] = k;
    symbolFuncs[n] = symDef.f;
    symbolBackOffs[n] = symDef.backoff || 0;

    if (symDef.needLine) {
        symbolNeedLines[n] = true;
    }
    if (symDef.noDot) {
        symbolNoDot[n] = true;
    } else {
        symbolList.push(
            n + 200,
            String(n + 200),
            k + '-dot',

            n + 300,
            String(n + 300),
            k + '-open-dot'
        );
    }
    if (symDef.noFill) {
        symbolNoFill[n] = true;
    }
});

const MAXSYMBOL = symbolNames.length;
const DOTPATH = 'M0,0.5L0.5,0L0,-0.5L-0.5,0Z';

export function symbolNumber(v: any): number {
    if (isNumeric(v)) {
        v = +v;
    } else if (typeof v === 'string') {
        let vbase = 0;
        if (v.indexOf('-open') > 0) {
            vbase = 100;
            v = v.replace('-open', '');
        }
        if (v.indexOf('-dot') > 0) {
            vbase += 200;
            v = v.replace('-dot', '');
        }
        v = symbolNames.indexOf(v);
        if (v >= 0) {
            v += vbase;
        }
    }

    return v % 100 >= MAXSYMBOL || v >= 400 ? 0 : Math.floor(Math.max(v, 0));
}

function makePointPath(symbolNumber: number, r: number, t: number, s: number): string {
    const base = symbolNumber % 100;
    return symbolFuncs[base](r, t, s) + (symbolNumber >= 200 ? DOTPATH : '');
}

const stopFormatter = numberFormat('~f');
const gradientInfo: Record<string, any> = {
    radial: { type: 'radial' },
    radialreversed: { type: 'radial', reversed: true },
    horizontal: { type: 'linear', start: { x: 1, y: 0 }, stop: { x: 0, y: 0 } },
    horizontalreversed: { type: 'linear', start: { x: 1, y: 0 }, stop: { x: 0, y: 0 }, reversed: true },
    vertical: { type: 'linear', start: { x: 0, y: 1 }, stop: { x: 0, y: 0 } },
    verticalreversed: { type: 'linear', start: { x: 0, y: 1 }, stop: { x: 0, y: 0 }, reversed: true }
};

export function gradient(sel: any, gd: GraphDiv, gradientID: string, type: string, colorscale: any[], prop: string): any {
    const info = gradientInfo[type];
    return gradientWithBounds(
        sel,
        gd,
        gradientID,
        info.type,
        colorscale,
        prop,
        info.start,
        info.stop,
        false,
        info.reversed
    );
}

function gradientWithBounds(sel: any, gd: GraphDiv, gradientID: string, type: string, colorscale: any[], prop: string, start: any, stop: any, inUserSpace: boolean, reversed: boolean): void {
    const len = colorscale.length;

    let info: any;
    if (type === 'linear') {
        info = {
            node: 'linearGradient',
            attrs: {
                x1: start.x,
                y1: start.y,
                x2: stop.x,
                y2: stop.y,
                gradientUnits: inUserSpace ? 'userSpaceOnUse' : 'objectBoundingBox'
            },
            reversed: reversed
        };
    } else if (type === 'radial') {
        info = {
            node: 'radialGradient',
            reversed: reversed
        };
    }

    const colorStops = new Array(len);
    for (let i = 0; i < len; i++) {
        if (info.reversed) {
            colorStops[len - 1 - i] = [stopFormatter((1 - colorscale[i][0]) * 100), colorscale[i][1]];
        } else {
            colorStops[i] = [stopFormatter(colorscale[i][0] * 100), colorscale[i][1]];
        }
    }

    const fullLayout = gd._fullLayout;
    const fullID = 'g' + fullLayout._uid + '-' + gradientID;

    const gradient = fullLayout._defs
        .select('.gradients')
        .selectAll('#' + fullID)
        .data([type + colorStops.join(';')], identity);

    gradient.exit().remove();

    gradient
        .enter()
        .append(info.node)
        .each(function (this: any) {
            const el = select(this);
            if (info.attrs) {
                for(const k in info.attrs) el.attr(k, info.attrs[k]);
            }

            el.attr('id', fullID);

            const stops = el.selectAll('stop').data(colorStops);
            stops.exit().remove();
            const stopsEnter = stops.enter().append('stop');

            stops.merge(stopsEnter).each(function (this: any, d: any) {
                const tc = tinycolor(d[1]);
                select(this)
                    .attr('offset', d[0] + '%')
                    .attr('stop-color', Color.tinyRGB(tc))
                    .attr('stop-opacity', tc.getAlpha());
            });
        });

    sel.style(prop, getFullUrl(fullID, gd)).style(prop + '-opacity', null);

    sel.classed('gradient_filled', true);
}

export function pattern(
    sel: any,
    calledBy: string,
    gd: GraphDiv,
    patternID: string,
    shape: string,
    size: number,
    solidity: number,
    mcc: string | undefined,
    fillmode: string,
    bgcolor: string,
    fgcolor: string,
    fgopacity: number
): void {
    const isLegend = calledBy === 'legend';

    if (mcc) {
        if (fillmode === 'overlay') {
            bgcolor = mcc;
            fgcolor = Color.contrast(bgcolor);
        } else {
            bgcolor = undefined as any;
            fgcolor = mcc;
        }
    }

    const fullLayout = gd._fullLayout;
    const fullID = 'p' + fullLayout._uid + '-' + patternID;
    let width: number, height: number;

    const linearFn = function (x: number, x0: number, x1: number, y0: number, y1: number): number {
        return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    };

    let path: string, linewidth: number, radius: number;
    let patternTag: string;
    let patternAttrs: Record<string, any> = {};

    const fgC = tinycolor(fgcolor);
    const fgRGB = Color.tinyRGB(fgC);
    const fgAlpha = fgC.getAlpha();
    const opacity = fgopacity * fgAlpha;

    switch (shape) {
        case '/':
            width = size * Math.sqrt(2);
            height = size * Math.sqrt(2);
            path =
                'M-' +
                width / 4 +
                ',' +
                height / 4 +
                'l' +
                width / 2 +
                ',-' +
                height / 2 +
                'M0,' +
                height +
                'L' +
                width +
                ',0' +
                'M' +
                (width / 4) * 3 +
                ',' +
                (height / 4) * 5 +
                'l' +
                width / 2 +
                ',-' +
                height / 2;
            linewidth = solidity * size;
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case '\\':
            width = size * Math.sqrt(2);
            height = size * Math.sqrt(2);
            path =
                'M' +
                (width / 4) * 3 +
                ',-' +
                height / 4 +
                'l' +
                width / 2 +
                ',' +
                height / 2 +
                'M0,0L' +
                width +
                ',' +
                height +
                'M-' +
                width / 4 +
                ',' +
                (height / 4) * 3 +
                'l' +
                width / 2 +
                ',' +
                height / 2;
            linewidth = solidity * size;
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case 'x':
            width = size * Math.sqrt(2);
            height = size * Math.sqrt(2);
            path =
                'M-' +
                width / 4 +
                ',' +
                height / 4 +
                'l' +
                width / 2 +
                ',-' +
                height / 2 +
                'M0,' +
                height +
                'L' +
                width +
                ',0' +
                'M' +
                (width / 4) * 3 +
                ',' +
                (height / 4) * 5 +
                'l' +
                width / 2 +
                ',-' +
                height / 2 +
                'M' +
                (width / 4) * 3 +
                ',-' +
                height / 4 +
                'l' +
                width / 2 +
                ',' +
                height / 2 +
                'M0,0L' +
                width +
                ',' +
                height +
                'M-' +
                width / 4 +
                ',' +
                (height / 4) * 3 +
                'l' +
                width / 2 +
                ',' +
                height / 2;
            linewidth = size - size * Math.sqrt(1.0 - solidity);
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case '|':
            width = size;
            height = size;
            patternTag = 'path';
            path = 'M' + width / 2 + ',0L' + width / 2 + ',' + height;
            linewidth = solidity * size;
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case '-':
            width = size;
            height = size;
            patternTag = 'path';
            path = 'M0,' + height / 2 + 'L' + width + ',' + height / 2;
            linewidth = solidity * size;
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case '+':
            width = size;
            height = size;
            patternTag = 'path';
            path =
                'M' +
                width / 2 +
                ',0L' +
                width / 2 +
                ',' +
                height +
                'M0,' +
                height / 2 +
                'L' +
                width +
                ',' +
                height / 2;
            linewidth = size - size * Math.sqrt(1.0 - solidity);
            patternTag = 'path';
            patternAttrs = {
                d: path,
                opacity: opacity,
                stroke: fgRGB,
                'stroke-width': linewidth + 'px'
            };
            break;
        case '.':
            width = size;
            height = size;
            if (solidity < Math.PI / 4) {
                radius = Math.sqrt((solidity * size * size) / Math.PI);
            } else {
                radius = linearFn(solidity, Math.PI / 4, 1.0, size / 2, size / Math.sqrt(2));
            }
            patternTag = 'circle';
            patternAttrs = {
                cx: width / 2,
                cy: height / 2,
                r: radius,
                opacity: opacity,
                fill: fgRGB
            };
            break;
        default:
            width = size;
            height = size;
            patternTag = 'path';
            patternAttrs = {
                d: shape,
                opacity: opacity,
                fill: fgRGB
            };
            break;
    }

    const str = [shape || 'noSh', bgcolor || 'noBg', fgcolor || 'noFg', size, solidity].join(';');

    const pattern = fullLayout._defs
        .select('.patterns')
        .selectAll('#' + fullID)
        .data([str], identity);

    pattern.exit().remove();

    pattern
        .enter()
        .append('pattern')
        .each(function (this: any) {
            const el = select(this);

            el
                .attr('id', fullID)
                .attr('width', width + 'px')
                .attr('height', height + 'px')
                .attr('patternUnits', 'userSpaceOnUse')
                .attr('patternTransform', isLegend ? 'scale(0.8)' : '');

            if (bgcolor) {
                const bgC = tinycolor(bgcolor);
                const bgRGB = Color.tinyRGB(bgC);
                const bgAlpha = bgC.getAlpha();

                const rects = el.selectAll('rect').data([0]);
                rects.exit().remove();
                rects
                    .enter()
                    .append('rect')
                    .attr('width', width + 'px')
                    .attr('height', height + 'px')
                    .attr('fill', bgRGB)
                    .attr('fill-opacity', bgAlpha);
            }

            const patterns = el.selectAll(patternTag).data([0]);
            patterns.exit().remove();
            const patternEl = patterns.enter().append(patternTag);
            for(const k in patternAttrs) patternEl.attr(k, (patternAttrs as any)[k]);
        });

    sel.style('fill', getFullUrl(fullID, gd)).style('fill-opacity', null);

    sel.classed('pattern_filled', true);
}

export function initGradients(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    const gradientsGroup = ensureSingle(fullLayout._defs, 'g', 'gradients');
    gradientsGroup.selectAll('linearGradient,radialGradient').remove();

    select(gd).selectAll('.gradient_filled').classed('gradient_filled', false);
}

export function initPatterns(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    const patternsGroup = ensureSingle(fullLayout._defs, 'g', 'patterns');
    patternsGroup.selectAll('pattern').remove();

    select(gd).selectAll('.pattern_filled').classed('pattern_filled', false);
}

export function getPatternAttr(mp: any, i: number, dflt: any): any {
    if (mp && isArrayOrTypedArray(mp)) {
        return i < mp.length ? mp[i] : dflt;
    }
    return mp;
}

export function pointStyle(s: any, trace: FullTrace, gd: GraphDiv, pt?: any): void {
    if (!s.size()) return;

    const fns = makePointStyleFns(trace);

    s.each(function (this: any, d: any) {
        singlePointStyle(d, select(this), trace, fns, gd, pt);
    });
}

export function singlePointStyle(d: any, sel: any, trace: FullTrace, fns: any, gd: GraphDiv, pt?: any): void {
    const marker = trace.marker;
    const markerLine = marker.line;

    if (pt && pt.i >= 0 && d.i === undefined) d.i = pt.i;

    sel.style('opacity', fns.selectedOpacityFn ? fns.selectedOpacityFn(d) : d.mo === undefined ? marker.opacity : d.mo);

    if (fns.ms2mrc) {
        let r: number;

        if (d.ms === 'various' || marker.size === 'various') {
            r = 3;
        } else {
            r = fns.ms2mrc(d.ms);
        }

        d.mrc = r;

        if (fns.selectedSizeFn) {
            r = d.mrc = fns.selectedSizeFn(d);
        }

        const x = symbolNumber(d.mx || marker.symbol) || 0;

        d.om = x % 200 >= 100;

        const angle = getMarkerAngle(d, trace);
        const standoff = getMarkerStandoff(d, trace);

        sel.attr('d', makePointPath(x, r, (angle as any), standoff));
    }

    let perPointGradient = false;
    let fillColor: any, lineColor: any, lineWidth: number;

    if (d.so) {
        lineWidth = markerLine.outlierwidth;
        lineColor = markerLine.outliercolor;
        fillColor = marker.outliercolor;
    } else {
        const markerLineWidth = (markerLine || {}).width;

        lineWidth =
            (d.mlw + 1 ||
                markerLineWidth + 1 ||
                (d.trace ? (d.trace.marker.line || {}).width : 0) + 1) - 1 || 0;

        if ('mlc' in d) lineColor = d.mlcc = fns.lineScale(d.mlc);
        else if (isArrayOrTypedArray(markerLine.color)) lineColor = Color.defaultLine;
        else lineColor = markerLine.color;

        if (isArrayOrTypedArray(marker.color)) {
            fillColor = Color.defaultLine;
            perPointGradient = true;
        }

        if ('mc' in d) {
            fillColor = d.mcc = fns.markerScale(d.mc);
        } else {
            fillColor = marker.color || marker.colors || 'rgba(0,0,0,0)';
        }

        if (fns.selectedColorFn) {
            fillColor = fns.selectedColorFn(d);
        }
    }

    if (d.om) {
        sel.call(Color.stroke, fillColor)
            .style('stroke-width', (lineWidth || 1) + 'px')
            .style('fill', 'none');
    } else {
        sel.style('stroke-width', (d.isBlank ? 0 : lineWidth) + 'px');

        const markerGradient = marker.gradient;

        let gradientType = d.mgt;
        if (gradientType) perPointGradient = true;
        else gradientType = markerGradient && markerGradient.type;

        if (isArrayOrTypedArray(gradientType)) {
            gradientType = gradientType[0];
            if (!gradientInfo[gradientType]) gradientType = 0;
        }

        const markerPattern = marker.pattern;
        const pAttr = getPatternAttr;
        const patternShape = markerPattern && (pAttr(markerPattern.shape, d.i, '') || pAttr(markerPattern.path, d.i, ''));

        if (gradientType && gradientType !== 'none') {
            let gradientColor = d.mgc;
            if (gradientColor) perPointGradient = true;
            else gradientColor = markerGradient.color;

            let gradientID = trace.uid;
            if (perPointGradient) gradientID += '-' + d.i;

            gradient(
                sel,
                gd,
                gradientID,
                gradientType,
                [
                    [0, gradientColor],
                    [1, fillColor]
                ],
                'fill'
            );
        } else if (patternShape) {
            let perPointPattern = false;
            let fgcolor = markerPattern.fgcolor;
            if (!fgcolor && pt && pt.color) {
                fgcolor = pt.color;
                perPointPattern = true;
            }
            const patternFGColor = pAttr(fgcolor, d.i, (pt && pt.color) || null);

            const patternBGColor = pAttr(markerPattern.bgcolor, d.i, null);
            const patternFGOpacity = markerPattern.fgopacity;
            const patternSize = pAttr(markerPattern.size, d.i, 8);
            const patternSolidity = pAttr(markerPattern.solidity, d.i, 0.3);
            perPointPattern =
                perPointPattern ||
                d.mcc ||
                isArrayOrTypedArray(markerPattern.shape) ||
                isArrayOrTypedArray(markerPattern.path) ||
                isArrayOrTypedArray(markerPattern.bgcolor) ||
                isArrayOrTypedArray(markerPattern.fgcolor) ||
                isArrayOrTypedArray(markerPattern.size) ||
                isArrayOrTypedArray(markerPattern.solidity);

            let patternID = trace.uid;
            if (perPointPattern) patternID += '-' + d.i;

            pattern(
                sel,
                'point',
                gd,
                patternID,
                patternShape,
                patternSize,
                patternSolidity,
                d.mcc,
                markerPattern.fillmode,
                patternBGColor,
                patternFGColor,
                patternFGOpacity
            );
        } else {
            isArrayOrTypedArray(fillColor) ? Color.fill(sel, fillColor[d.i]) : Color.fill(sel, fillColor);
        }

        if (lineWidth) {
            Color.stroke(sel, lineColor);
        }
    }
}

export function makePointStyleFns(trace: FullTrace): any {
    const out: Record<string, any> = {};
    const marker = trace.marker;

    out.markerScale = tryColorscale(marker, '');
    out.lineScale = tryColorscale(marker, 'line');

    if (traceIs(trace, 'symbols')) {
        out.ms2mrc = subTypes.isBubble(trace)
            ? makeBubbleSizeFn(trace)
            : function () {
                  return (marker.size || 6) / 2;
              };
    }

    if (trace.selectedpoints) {
        extendFlat(out, makeSelectedPointStyleFns(trace));
    }

    return out;
}

export function makeSelectedPointStyleFns(trace: FullTrace): any {
    const out: Record<string, any> = {};

    const selectedAttrs = trace.selected || {};
    const unselectedAttrs = trace.unselected || {};

    const marker = trace.marker || {};
    const selectedMarker = selectedAttrs.marker || {};
    const unselectedMarker = unselectedAttrs.marker || {};

    const mo = marker.opacity;
    const smo = selectedMarker.opacity;
    const usmo = unselectedMarker.opacity;
    const smoIsDefined = smo !== undefined;
    const usmoIsDefined = usmo !== undefined;

    if (isArrayOrTypedArray(mo) || smoIsDefined || usmoIsDefined) {
        out.selectedOpacityFn = function (d: any): number {
            const base = d.mo === undefined ? marker.opacity : d.mo;

            if (d.selected) {
                return smoIsDefined ? smo : base;
            } else {
                return usmoIsDefined ? usmo : DESELECTDIM * base;
            }
        };
    }

    const mc = marker.color;
    const smc = selectedMarker.color;
    const usmc = unselectedMarker.color;

    if (smc || usmc) {
        out.selectedColorFn = function (d: any): string {
            const base = d.mcc || mc;

            if (d.selected) {
                return smc || base;
            } else {
                return usmc || base;
            }
        };
    }

    const ms = marker.size;
    const sms = selectedMarker.size;
    const usms = unselectedMarker.size;
    const smsIsDefined = sms !== undefined;
    const usmsIsDefined = usms !== undefined;

    if (traceIs(trace, 'symbols') && (smsIsDefined || usmsIsDefined)) {
        out.selectedSizeFn = function (d: any): number {
            const base = d.mrc || ms / 2;

            if (d.selected) {
                return smsIsDefined ? sms / 2 : base;
            } else {
                return usmsIsDefined ? usms / 2 : base;
            }
        };
    }

    return out;
}

export function makeSelectedTextStyleFns(trace: FullTrace): any {
    const out: Record<string, any> = {};

    const selectedAttrs = trace.selected || {};
    const unselectedAttrs = trace.unselected || {};

    const textFont = trace.textfont || {};
    const selectedTextFont = selectedAttrs.textfont || {};
    const unselectedTextFont = unselectedAttrs.textfont || {};

    const tc = textFont.color;
    const stc = selectedTextFont.color;
    const utc = unselectedTextFont.color;

    out.selectedTextColorFn = function (d: any): string {
        const base = d.tc || tc;

        if (d.selected) {
            return stc || base;
        } else {
            if (utc) return utc;
            else return stc ? base : Color.addOpacity(base, DESELECTDIM);
        }
    };

    return out;
}

export function selectedPointStyle(s: any, trace: FullTrace): void {
    if (!s.size() || !trace.selectedpoints) return;

    const fns = makeSelectedPointStyleFns(trace);
    const marker = trace.marker || {};
    const seq: any[] = [];

    if (fns.selectedOpacityFn) {
        seq.push(function (pt: any, d: any) {
            pt.style('opacity', fns.selectedOpacityFn(d));
        });
    }

    if (fns.selectedColorFn) {
        seq.push(function (pt: any, d: any) {
            Color.fill(pt, fns.selectedColorFn(d));
        });
    }

    if (fns.selectedSizeFn) {
        seq.push(function (pt: any, d: any) {
            const mx = d.mx || marker.symbol || 0;
            const mrc2 = fns.selectedSizeFn(d);

            pt.attr(
                'd',
                makePointPath(symbolNumber(mx), mrc2, (getMarkerAngle(d, trace) as any), getMarkerStandoff(d, trace))
            );

            d.mrc2 = mrc2;
        });
    }

    if (seq.length) {
        s.each(function (this: any, d: any) {
            const pt = select(this);
            for (let i = 0; i < seq.length; i++) {
                seq[i](pt, d);
            }
        });
    }
}

export function tryColorscale(marker: any, prefix?: string): any {
    const cont = prefix ? nestedProperty(marker, prefix).get() : marker;

    if (cont) {
        const colorArray = cont.color;
        if ((cont.colorscale || cont._colorAx) && isArrayOrTypedArray(colorArray)) {
            return Colorscale.makeColorScaleFuncFromTrace(cont);
        }
    }
    return identity;
}

const TEXTOFFSETSIGN: Record<string, number> = {
    start: 1,
    end: -1,
    middle: 0,
    bottom: 1,
    top: -1
};

function textPointPosition(s: any, textPosition: string, fontSize: number, markerRadius: number, dontTouchParent?: boolean): void {
    const group = select(s.node().parentNode);

    const v = textPosition.indexOf('top') !== -1 ? 'top' : textPosition.indexOf('bottom') !== -1 ? 'bottom' : 'middle';
    const h = textPosition.indexOf('left') !== -1 ? 'end' : textPosition.indexOf('right') !== -1 ? 'start' : 'middle';

    const r = markerRadius ? markerRadius / 0.8 + 1 : 0;

    const numLines = (svgTextUtils.lineCount(s) - 1) * LINE_SPACING + 1;
    const dx = TEXTOFFSETSIGN[h] * r;
    const dy = fontSize * 0.75 + TEXTOFFSETSIGN[v] * r + ((TEXTOFFSETSIGN[v] - 1) * numLines * fontSize) / 2;

    s.attr('text-anchor', h);
    if (!dontTouchParent) {
        group.attr('transform', strTranslate(dx, dy));
    }
}

function extracTextFontSize(d: any, trace: FullTrace): number {
    const fontSize = d.ts || trace.textfont.size;
    return isNumeric(fontSize) && fontSize > 0 ? fontSize : 0;
}

export function textPointStyle(s: any, trace: FullTrace, gd: GraphDiv): any {
    if (!s.size()) return;

    let selectedTextColorFn: any;
    if (trace.selectedpoints) {
        const fns = makeSelectedTextStyleFns(trace);
        selectedTextColorFn = fns.selectedTextColorFn;
    }

    const texttemplate = trace.texttemplate;
    const fullLayout = gd._fullLayout;

    s.each(function (this: any, d: any) {
        const p = select(this);

        let text = texttemplate
            ? extractOption(d, trace, 'txt', 'texttemplate')
            : extractOption(d, trace, 'tx', 'text');

        if (!text && text !== 0) {
            p.remove();
            return;
        }

        if (texttemplate) {
            const fn = trace._module.formatLabels;
            const labels = fn ? fn(d, trace, fullLayout) : {};
            const pointValues: Record<string, any> = {};
            appendArrayPointValue(pointValues, trace, d.i);
            text = texttemplateString({
                data: [pointValues, d, trace._meta],
                fallback: trace.texttemplatefallback,
                labels,
                locale: fullLayout._d3locale,
                template: text
            });
        }

        const pos = d.tp || trace.textposition;
        const fontSize = extracTextFontSize(d, trace);
        const fontColor = selectedTextColorFn ? selectedTextColorFn(d) : d.tc || trace.textfont.color;

        p.call(font, {
            family: d.tf || trace.textfont.family,
            weight: d.tw || trace.textfont.weight,
            style: d.ty || trace.textfont.style,
            variant: d.tv || trace.textfont.variant,
            textcase: d.tC || trace.textfont.textcase,
            lineposition: d.tE || trace.textfont.lineposition,
            shadow: d.tS || trace.textfont.shadow,
            size: fontSize,
            color: fontColor
        })
            .text(text)
            .call(svgTextUtils.convertToTspans, gd)
            .call(textPointPosition, pos, fontSize, d.mrc);
    });
}

export function selectedTextStyle(s: any, trace: FullTrace): void {
    if (!s.size() || !trace.selectedpoints) return;

    const fns = makeSelectedTextStyleFns(trace);

    s.each(function (this: any, d: any) {
        const tx = select(this);
        const tc = fns.selectedTextColorFn(d);
        const tp = d.tp || trace.textposition;
        const fontSize = extracTextFontSize(d, trace);

        Color.fill(tx, tc);
        const dontTouchParent = traceIs(trace, 'bar-like');
        textPointPosition(tx, tp, fontSize, d.mrc2 || d.mrc, dontTouchParent);
    });
}

const CatmullRomExp = 0.5;
export function smoothopen(pts: number[][], smoothness: number): string {
    if (pts.length < 3) {
        return 'M' + pts.join('L');
    }
    let path = 'M' + pts[0];
    const tangents: number[][][] = [];
    let i: number;
    for (i = 1; i < pts.length - 1; i++) {
        tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
    }
    path += 'Q' + tangents[0][0] + ' ' + pts[1];
    for (i = 2; i < pts.length - 1; i++) {
        path += 'C' + tangents[i - 2][1] + ' ' + tangents[i - 1][0] + ' ' + pts[i];
    }
    path += 'Q' + tangents[pts.length - 3][1] + ' ' + pts[pts.length - 1];
    return path;
}

export function smoothclosed(pts: number[][], smoothness: number): string {
    if (pts.length < 3) {
        return 'M' + pts.join('L') + 'Z';
    }
    let path = 'M' + pts[0];
    const pLast = pts.length - 1;
    const tangents = [makeTangent(pts[pLast], pts[0], pts[1], smoothness)];
    let i: number;
    for (i = 1; i < pLast; i++) {
        tangents.push(makeTangent(pts[i - 1], pts[i], pts[i + 1], smoothness));
    }
    tangents.push(makeTangent(pts[pLast - 1], pts[pLast], pts[0], smoothness));

    for (i = 1; i <= pLast; i++) {
        path += 'C' + tangents[i - 1][1] + ' ' + tangents[i][0] + ' ' + pts[i];
    }
    path += 'C' + tangents[pLast][1] + ' ' + tangents[0][0] + ' ' + pts[0] + 'Z';
    return path;
}

let lastDrawnX: number, lastDrawnY: number;

function roundEnd(pt: any, isY: number, isLastPoint: boolean): number {
    if (isLastPoint) pt = applyBackoff(pt);

    return isY ? roundY(pt[1]) : roundX(pt[0]);
}

function roundX(p: number): number {
    const v = d3Round(p, 2);
    lastDrawnX = v;
    return v;
}

function roundY(p: number): number {
    const v = d3Round(p, 2);
    lastDrawnY = v;
    return v;
}

function makeTangent(prevpt: number[], thispt: number[], nextpt: number[], smoothness: number): number[][] {
    const d1x = prevpt[0] - thispt[0];
    const d1y = prevpt[1] - thispt[1];
    const d2x = nextpt[0] - thispt[0];
    const d2y = nextpt[1] - thispt[1];
    const d1a = Math.pow(d1x * d1x + d1y * d1y, CatmullRomExp / 2);
    const d2a = Math.pow(d2x * d2x + d2y * d2y, CatmullRomExp / 2);
    const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
    const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;
    const denom1 = 3 * d2a * (d1a + d2a);
    const denom2 = 3 * d1a * (d1a + d2a);
    return [
        [roundX(thispt[0] + (denom1 && numx / denom1)), roundY(thispt[1] + (denom1 && numy / denom1))],
        [roundX(thispt[0] - (denom2 && numx / denom2)), roundY(thispt[1] - (denom2 && numy / denom2))]
    ];
}

const STEPPATH: Record<string, (p0: number[], p1: any, isLastPoint: boolean) => string> = {
    hv: function (p0: number[], p1: any, isLastPoint: boolean): string {
        return 'H' + roundX(p1[0]) + 'V' + roundEnd(p1, 1, isLastPoint);
    },
    vh: function (p0: number[], p1: any, isLastPoint: boolean): string {
        return 'V' + roundY(p1[1]) + 'H' + roundEnd(p1, 0, isLastPoint);
    },
    hvh: function (p0: number[], p1: any, isLastPoint: boolean): string {
        return 'H' + roundX((p0[0] + p1[0]) / 2) + 'V' + roundY(p1[1]) + 'H' + roundEnd(p1, 0, isLastPoint);
    },
    vhv: function (p0: number[], p1: any, isLastPoint: boolean): string {
        return 'V' + roundY((p0[1] + p1[1]) / 2) + 'H' + roundX(p1[0]) + 'V' + roundEnd(p1, 1, isLastPoint);
    }
};
const STEPLINEAR = function (p0: number[], p1: any, isLastPoint: boolean): string {
    return 'L' + roundEnd(p1, 0, isLastPoint) + ',' + roundEnd(p1, 1, isLastPoint);
};
export function steps(shape: string): (pts: number[][]) => string {
    const onestep = STEPPATH[shape] || STEPLINEAR;
    return function (pts: number[][]): string {
        let path = 'M' + roundX(pts[0][0]) + ',' + roundY(pts[0][1]);
        const len = pts.length;
        for (let i = 1; i < len; i++) {
            path += onestep(pts[i - 1], pts[i], i === len - 1);
        }
        return path;
    };
}

function applyBackoff(pt: any, start?: number[]): any {
    const backoff = pt.backoff;
    const trace = pt.trace;
    const d = pt.d;
    const i = pt.i;

    if (
        backoff &&
        trace &&
        trace.marker &&
        trace.marker.angle % 360 === 0 &&
        trace.line &&
        trace.line.shape !== 'spline'
    ) {
        const arrayBackoff = isArrayOrTypedArray(backoff);
        const end = pt;

        const x1 = start ? start[0] : lastDrawnX || 0;
        const y1 = start ? start[1] : lastDrawnY || 0;

        const x2 = end[0];
        const y2 = end[1];

        const dx = x2 - x1;
        const dy = y2 - y1;

        const t = Math.atan2(dy, dx);

        let b = arrayBackoff ? backoff[i] : backoff;

        if (b === 'auto') {
            let endI = end.i;
            if (trace.type === 'scatter') endI--;

            const endMarker = end.marker;
            let endMarkerSymbol = endMarker.symbol;
            if (isArrayOrTypedArray(endMarkerSymbol)) endMarkerSymbol = endMarkerSymbol[endI];

            let endMarkerSize = endMarker.size;
            if (isArrayOrTypedArray(endMarkerSize)) endMarkerSize = endMarkerSize[endI];

            b = endMarker ? symbolBackOffs[symbolNumber(endMarkerSymbol)] * endMarkerSize : 0;
            b += getMarkerStandoff(d[endI], trace) || 0;
        }

        const x = x2 - b * Math.cos(t);
        const y = y2 - b * Math.sin(t);

        if (((x <= x2 && x >= x1) || (x >= x2 && x <= x1)) && ((y <= y2 && y >= y1) || (y >= y2 && y <= y1))) {
            pt = [x, y];
        }
    }

    return pt;
}

export { applyBackoff };

export function makeTester(): void {
    const _tester = ensureSingleById(select('body'), 'svg', 'js-plotly-tester', function (s: any) {
        s.attr('xmlns', xmlnsNamespaces.svg)
            .attr('xmlns:xlink', xmlnsNamespaces.xlink)
            .style('position', 'absolute')
            .style('left', '-10000px')
            .style('top', '-10000px')
            .style('width', '9000px')
            .style('height', '9000px')
            .style('z-index', '1');
    });

    const _testref = ensureSingle(_tester, 'path', 'js-reference-point', function (s: any) {
        s.attr('d', 'M0,0H1V1H0Z')
            .style('stroke-width', 0)
            .style('fill', 'black');
    });

    tester = _tester;
    testref = _testref;
}

export let savedBBoxes: Record<string, any> = {};
let savedBBoxesCount = 0;
const maxSavedBBoxes = 10000;

export function bBox(node: any, inTester?: boolean, hash?: string): any {
    if (!hash) hash = nodeHash(node);
    let out: any;
    if (hash) {
        out = savedBBoxes[hash];
        if (out) return extendFlat({}, out);
    } else if (node.childNodes.length === 1) {
        const innerNode = node.childNodes[0];

        hash = nodeHash(innerNode);
        if (hash) {
            const x = +innerNode.getAttribute('x') || 0;
            const y = +innerNode.getAttribute('y') || 0;
            const transform = innerNode.getAttribute('transform');

            if (!transform) {
                const innerBB = bBox(innerNode, false, hash);
                if (x) {
                    innerBB.left += x;
                    innerBB.right += x;
                }
                if (y) {
                    innerBB.top += y;
                    innerBB.bottom += y;
                }
                return innerBB;
            }
            hash += '~' + x + '~' + y + '~' + transform;

            out = savedBBoxes[hash];
            if (out) return extendFlat({}, out);
        }
    }
    let testNode: any, testerNode: any;
    if (inTester) {
        testNode = node;
    } else {
        testerNode = tester.node();

        testNode = node.cloneNode(true);
        testerNode.appendChild(testNode);
    }

    select(testNode).attr('transform', null).call(svgTextUtils.positionText, 0, 0);

    const testRect = testNode.getBoundingClientRect();
    const refRect = testref.node().getBoundingClientRect();

    if (!inTester) testerNode.removeChild(testNode);

    const bb = {
        height: testRect.height,
        width: testRect.width,
        left: testRect.left - refRect.left,
        top: testRect.top - refRect.top,
        right: testRect.right - refRect.left,
        bottom: testRect.bottom - refRect.top
    };

    if (savedBBoxesCount >= maxSavedBBoxes) {
        savedBBoxes = {};
        savedBBoxesCount = 0;
    }

    if (hash) savedBBoxes[hash] = bb;
    savedBBoxesCount++;

    return extendFlat({}, bb);
}

function nodeHash(node: any): string | undefined {
    const inputText = node.getAttribute('data-unformatted');
    if (inputText === null) return;
    return inputText + node.getAttribute('data-math') + node.getAttribute('text-anchor') + node.getAttribute('style');
}

export function setClipUrl(s: any, localId: string, gd: GraphDiv): void {
    s.attr('clip-path', getFullUrl(localId, gd));
}

function getFullUrl(localId: string, gd: GraphDiv): string | null {
    if (!localId) return null;

    const context = gd._context;
    const baseUrl = context._exportedPlot ? '' : context._baseUrl || '';
    return baseUrl ? "url('" + baseUrl + '#' + localId + "')" : 'url(#' + localId + ')';
}

export function getTranslate(element: any): { x: number; y: number } {
    const re = /.*\btranslate\((-?\d*\.?\d*)[^-\d]*(-?\d*\.?\d*)[^\d].*/;
    const getter = element.attr ? 'attr' : 'getAttribute';
    const transform = element[getter]('transform') || '';

    const translate = transform
        .replace(re, function (match: string, p1: string, p2: string) {
            return [p1, p2].join(' ');
        })
        .split(' ');

    return {
        x: +translate[0] || 0,
        y: +translate[1] || 0
    };
}

export function setTranslate(element: any, x: number, y: number): string {
    const re = /(\btranslate\(.*?\);?)/;
    const getter = element.attr ? 'attr' : 'getAttribute';
    const setter = element.attr ? 'attr' : 'setAttribute';
    let transform = element[getter]('transform') || '';

    x = x || 0;
    y = y || 0;

    transform = transform.replace(re, '').trim();
    transform += strTranslate(x, y);
    transform = transform.trim();

    element[setter]('transform', transform);

    return transform;
}

export function getScale(element: any): { x: number; y: number } {
    const re = /.*\bscale\((\d*\.?\d*)[^\d]*(\d*\.?\d*)[^\d].*/;
    const getter = element.attr ? 'attr' : 'getAttribute';
    const transform = element[getter]('transform') || '';

    const translate = transform
        .replace(re, function (match: string, p1: string, p2: string) {
            return [p1, p2].join(' ');
        })
        .split(' ');

    return {
        x: +translate[0] || 1,
        y: +translate[1] || 1
    };
}

export function setScale(element: any, x: number, y: number): string {
    const re = /(\bscale\(.*?\);?)/;
    const getter = element.attr ? 'attr' : 'getAttribute';
    const setter = element.attr ? 'attr' : 'setAttribute';
    let transform = element[getter]('transform') || '';

    x = x || 1;
    y = y || 1;

    transform = transform.replace(re, '').trim();
    transform += 'scale(' + x + ',' + y + ')';
    transform = transform.trim();

    element[setter]('transform', transform);

    return transform;
}

const SCALE_RE = /\s*sc.*/;

export function setPointGroupScale(selection: any, xScale: number, yScale: number): void {
    xScale = xScale || 1;
    yScale = yScale || 1;

    if (!selection) return;

    const scale = xScale === 1 && yScale === 1 ? '' : 'scale(' + xScale + ',' + yScale + ')';

    selection.each(function (this: any) {
        let t = (this.getAttribute('transform') || '').replace(SCALE_RE, '');
        t += scale;
        t = t.trim();
        this.setAttribute('transform', t);
    });
}

const TEXT_POINT_LAST_TRANSLATION_RE = /translate\([^)]*\)\s*$/;

export function setTextPointsScale(selection: any, xScale: number, yScale: number): void {
    if (!selection) return;

    selection.each(function (this: any) {
        let transforms: any[];
        const el = select(this);
        const text = el.select('text');

        if (!text.node()) return;

        const x = parseFloat(text.attr('x') || 0);
        const y = parseFloat(text.attr('y') || 0);

        const existingTransform = (el.attr('transform') || '').match(TEXT_POINT_LAST_TRANSLATION_RE);

        if (xScale === 1 && yScale === 1) {
            transforms = [];
        } else {
            transforms = [strTranslate(x, y), 'scale(' + xScale + ',' + yScale + ')', strTranslate(-x, -y)];
        }

        if (existingTransform) {
            transforms.push(existingTransform);
        }

        el.attr('transform', transforms.join(''));
    });
}

function getMarkerStandoff(d: any, trace: FullTrace): number {
    let standoff: number;

    if (d) standoff = d.mf;

    if (standoff! === undefined) {
        standoff = trace.marker ? trace.marker.standoff || 0 : 0;
    }

    if (!trace._geo && !trace._xA) {
        return -standoff;
    }

    return standoff;
}

export { getMarkerStandoff };

const atan2 = Math.atan2;
const cos = Math.cos;
const sin = Math.sin;

function rotate(t: number, xy: number[]): number[] {
    const x = xy[0];
    const y = xy[1];
    return [x * cos(t) - y * sin(t), x * sin(t) + y * cos(t)];
}

let previousLon: number;
let previousLat: number;
let previousX: number;
let previousY: number;
let previousI: number;
let previousTraceUid: string;

function getMarkerAngle(d: any, trace: FullTrace): number | null {
    let angle: any = d.ma;

    if (angle === undefined) {
        angle = trace.marker.angle;
        if (!angle || isArrayOrTypedArray(angle)) {
            angle = 0;
        }
    }

    let x: number, y: number;
    const ref = trace.marker.angleref;
    if (ref === 'previous' || ref === 'north') {
        if (trace._geo) {
            const p = trace._geo.project(d.lonlat);
            x = p[0];
            y = p[1];
        } else {
            const xa = trace._xA;
            const ya = trace._yA;
            if (xa && ya) {
                x = xa.c2p(d.x);
                y = ya.c2p(d.y);
            } else {
                return 90;
            }
        }

        if (trace._geo) {
            const lon = d.lonlat[0];
            const lat = d.lonlat[1];

            const north = trace._geo.project([
                lon,
                lat + 1e-5
            ]);

            const east = trace._geo.project([
                lon + 1e-5,
                lat
            ]);

            const u = atan2(east[1] - y, east[0] - x);

            const v = atan2(north[1] - y, north[0] - x);

            let t: number;
            if (ref === 'north') {
                t = (angle / 180) * Math.PI;
            } else if (ref === 'previous') {
                const lon1 = (lon / 180) * Math.PI;
                const lat1 = (lat / 180) * Math.PI;
                const lon2 = (previousLon / 180) * Math.PI;
                const lat2 = (previousLat / 180) * Math.PI;

                const dLon = lon2 - lon1;

                const deltaY = cos(lat2) * sin(dLon);
                const deltaX = sin(lat2) * cos(lat1) - cos(lat2) * sin(lat1) * cos(dLon);

                t = -atan2(deltaY, deltaX) - Math.PI;

                previousLon = lon;
                previousLat = lat;
            }

            const A = rotate(u, [cos(t!), 0]);
            const B = rotate(v, [sin(t!), 0]);

            angle = (atan2(A[1] + B[1], A[0] + B[0]) / Math.PI) * 180;

            if (ref === 'previous' && !(previousTraceUid === trace.uid && d.i === previousI + 1)) {
                angle = null;
            }
        }

        if (ref === 'previous' && !trace._geo) {
            if (previousTraceUid === trace.uid && d.i === previousI + 1 && isNumeric(x!) && isNumeric(y!)) {
                let dX = x! - previousX;
                let dY = y! - previousY;

                const shape = trace.line ? trace.line.shape || '' : '';

                const lastShapeChar = shape.slice(shape.length - 1);
                if (lastShapeChar === 'h') dY = 0;
                if (lastShapeChar === 'v') dX = 0;

                angle += (atan2(dY, dX) / Math.PI) * 180 + 90;
            } else {
                angle = null;
            }
        }
    }

    previousX = x!;
    previousY = y!;
    previousI = d.i;
    previousTraceUid = trace.uid;

    return angle;
}

export { getMarkerAngle };
