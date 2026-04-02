import type { FullAxis, FullTrace, GraphDiv } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import svgSdf from 'svg-path-sdf';
import rgba from 'color-normalize';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import { symbolNoDot, symbolNoFill, symbolNumber, getMarkerAngle, symbolFuncs } from '../../components/drawing/index.js';
import AxisIDs from '../../plots/cartesian/axis_ids.js';
import _gl_format_color from '../../lib/gl_format_color.js';
const { formatColor } = _gl_format_color;
import subTypes from '../scatter/subtypes.js';
import makeBubbleSizeFn from '../scatter/make_bubble_size_func.js';
import helpers from './helpers.js';
import constants from './constants.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import { appendArrayPointValue } from '../../components/fx/helpers.js';
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;

const TEXTOFFSETSIGN = {
    start: 1,
    left: 1,
    end: -1,
    right: -1,
    middle: 0,
    center: 0,
    bottom: 1,
    top: -1
};

function convertStyle(gd: GraphDiv, trace: FullTrace) {
    let i;

    const opts: any = {
        marker: undefined,
        markerSel: undefined,
        markerUnsel: undefined,
        line: undefined,
        fill: undefined,
        errorX: undefined,
        errorY: undefined,
        text: undefined,
        textSel: undefined,
        textUnsel: undefined
    };

    const plotGlPixelRatio = gd._context.plotGlPixelRatio;

    if (trace.visible !== true) return opts;

    if (subTypes.hasText(trace)) {
        opts.text = convertTextStyle(gd, trace);
        opts.textSel = convertTextSelection(gd, trace, trace.selected);
        opts.textUnsel = convertTextSelection(gd, trace, trace.unselected);
    }

    if (subTypes.hasMarkers(trace)) {
        opts.marker = convertMarkerStyle(gd, trace);
        opts.markerSel = convertMarkerSelection(gd, trace, trace.selected);
        opts.markerUnsel = convertMarkerSelection(gd, trace, trace.unselected);

        if (!trace.unselected && isArrayOrTypedArray(trace.marker.opacity)) {
            const mo = trace.marker.opacity;
            opts.markerUnsel.opacity = new Array(mo.length);
            for (i = 0; i < mo.length; i++) {
                opts.markerUnsel.opacity[i] = DESELECTDIM * mo[i];
            }
        }
    }

    if (subTypes.hasLines(trace)) {
        opts.line = {
            overlay: true,
            thickness: trace.line.width * plotGlPixelRatio,
            color: trace.line.color,
            opacity: trace.opacity
        };

        const dashes = (constants.DASHES[trace.line.dash] || [1]).slice();
        for (i = 0; i < dashes.length; ++i) {
            dashes[i] *= trace.line.width * plotGlPixelRatio;
        }
        opts.line.dashes = dashes;
    }

    if (trace.error_x && trace.error_x.visible) {
        opts.errorX = convertErrorBarStyle(trace, trace.error_x, plotGlPixelRatio);
    }

    if (trace.error_y && trace.error_y.visible) {
        opts.errorY = convertErrorBarStyle(trace, trace.error_y, plotGlPixelRatio);
    }

    if (!!trace.fill && trace.fill !== 'none') {
        opts.fill = {
            closed: true,
            fill: trace.fillcolor,
            thickness: 0
        };
    }

    return opts;
}

function convertTextStyle(gd: GraphDiv, trace: FullTrace) {
    const fullLayout = gd._fullLayout;
    const count = trace._length;
    const textfontIn = trace.textfont;
    const textpositionIn = trace.textposition;
    const textPos = isArrayOrTypedArray(textpositionIn) ? textpositionIn : [textpositionIn];
    const tfc = textfontIn.color;
    const tfs = textfontIn.size;
    const tff = textfontIn.family;
    const tfw = textfontIn.weight;
    const tfy = textfontIn.style;
    const tfv = textfontIn.variant;
    const optsOut: any = {};
    let i;
    const plotGlPixelRatio = gd._context.plotGlPixelRatio;

    const texttemplate = trace.texttemplate;
    if (texttemplate) {
        optsOut.text = [];

        const d3locale = fullLayout._d3locale;
        const isArray = Array.isArray(texttemplate);
        const N = isArray ? Math.min(texttemplate.length, count) : count;
        const txt = isArray
            ? function (i) {
                  return texttemplate[i];
              }
            : function () {
                  return texttemplate;
              };

        for (i = 0; i < N; i++) {
            const d = { i: i };
            const labels = trace._module.formatLabels(d, trace, fullLayout);
            const pointValues: any = {};
            appendArrayPointValue(pointValues, trace, i);
            optsOut.text.push(
                Lib.texttemplateString({
                    data: [pointValues, d, trace._meta],
                    fallback: trace.texttemplatefallback,
                    labels,
                    locale: d3locale,
                    template: txt(i)
                })
            );
        }
    } else {
        if (isArrayOrTypedArray(trace.text) && trace.text.length < count) {
            // if text array is shorter, we'll need to append to it, so let's slice to prevent mutating
            optsOut.text = trace.text.slice();
        } else {
            optsOut.text = trace.text;
        }
    }
    // pad text array with empty strings
    if (isArrayOrTypedArray(optsOut.text)) {
        for (i = optsOut.text.length; i < count; i++) {
            optsOut.text[i] = '';
        }
    }

    optsOut.opacity = trace.opacity;
    optsOut.font = {};
    optsOut.align = [];
    optsOut.baseline = [];

    for (i = 0; i < textPos.length; i++) {
        const tp = textPos[i].split(/\s+/);

        switch (tp[1]) {
            case 'left':
                optsOut.align.push('right');
                break;
            case 'right':
                optsOut.align.push('left');
                break;
            default:
                optsOut.align.push(tp[1]);
        }
        switch (tp[0]) {
            case 'top':
                optsOut.baseline.push('bottom');
                break;
            case 'bottom':
                optsOut.baseline.push('top');
                break;
            default:
                optsOut.baseline.push(tp[0]);
        }
    }

    if (isArrayOrTypedArray(tfc)) {
        optsOut.color = new Array(count);
        for (i = 0; i < count; i++) {
            optsOut.color[i] = tfc[i];
        }
    } else {
        optsOut.color = tfc;
    }

    if (
        isArrayOrTypedArray(tfs) ||
        Array.isArray(tff) ||
        isArrayOrTypedArray(tfw) ||
        Array.isArray(tfy) ||
        Array.isArray(tfv)
    ) {
        // if any textfont param is array - make render a batch
        optsOut.font = new Array(count);
        for (i = 0; i < count; i++) {
            const fonti: any = (optsOut.font[i] = {});

            fonti.size =
                (Lib.isTypedArray(tfs) ? tfs[i] : isArrayOrTypedArray(tfs) ? (isNumeric(tfs[i]) ? tfs[i] : 0) : tfs) *
                plotGlPixelRatio;

            fonti.family = Array.isArray(tff) ? tff[i] : tff;
            fonti.weight = weightFallBack(isArrayOrTypedArray(tfw) ? tfw[i] : tfw);
            fonti.style = Array.isArray(tfy) ? tfy[i] : tfy;
            fonti.variant = Array.isArray(tfv) ? tfv[i] : tfv;
        }
    } else {
        // if both are single values, make render fast single-value
        optsOut.font = {
            size: tfs * plotGlPixelRatio,
            family: tff,
            weight: weightFallBack(tfw),
            style: tfy,
            variant: tfv
        };
    }

    return optsOut;
}

// scattergl rendering pipeline has limited support of numeric weight values
// Here we map the numbers to be either bold or normal.
function weightFallBack(w) {
    if (w <= 1000) {
        return w > 500 ? 'bold' : 'normal';
    }
    return w;
}

function convertMarkerStyle(gd: GraphDiv, trace: FullTrace) {
    const count = trace._length;
    const optsIn = trace.marker;
    const optsOut: any = {};
    let i;

    const multiSymbol = isArrayOrTypedArray(optsIn.symbol);
    const multiAngle = isArrayOrTypedArray(optsIn.angle);
    const multiColor = isArrayOrTypedArray(optsIn.color);
    const multiLineColor = isArrayOrTypedArray(optsIn.line.color);
    const multiOpacity = isArrayOrTypedArray(optsIn.opacity);
    const multiSize = isArrayOrTypedArray(optsIn.size);
    const multiLineWidth = isArrayOrTypedArray(optsIn.line.width);

    let isOpen;
    if (!multiSymbol) isOpen = helpers.isOpenSymbol(optsIn.symbol);

    // prepare colors
    if (multiSymbol || multiColor || multiLineColor || multiOpacity || multiAngle) {
        optsOut.symbols = new Array(count);
        optsOut.angles = new Array(count);
        optsOut.colors = new Array(count);
        optsOut.borderColors = new Array(count);

        let symbols = optsIn.symbol;
        let angles = optsIn.angle;
        let colors: any = formatColor(optsIn, optsIn.opacity, count);
        let borderColors: any = formatColor(optsIn.line, optsIn.opacity, count);

        if (!isArrayOrTypedArray(borderColors[0])) {
            const borderColor = borderColors;
            borderColors = Array(count);
            for (i = 0; i < count; i++) {
                borderColors[i] = borderColor;
            }
        }
        if (!isArrayOrTypedArray(colors[0])) {
            const color = colors;
            colors = Array(count);
            for (i = 0; i < count; i++) {
                colors[i] = color;
            }
        }
        if (!isArrayOrTypedArray(symbols)) {
            const symbol = symbols;
            symbols = Array(count);
            for (i = 0; i < count; i++) {
                symbols[i] = symbol;
            }
        }
        if (!isArrayOrTypedArray(angles)) {
            const angle = angles;
            angles = Array(count);
            for (i = 0; i < count; i++) {
                angles[i] = angle;
            }
        }

        optsOut.symbols = symbols;
        optsOut.angles = angles;
        optsOut.colors = colors;
        optsOut.borderColors = borderColors;

        for (i = 0; i < count; i++) {
            if (multiSymbol) {
                isOpen = helpers.isOpenSymbol(optsIn.symbol[i]);
            }
            if (isOpen) {
                borderColors[i] = colors[i].slice();
                colors[i] = colors[i].slice();
                colors[i][3] = 0;
            }
        }

        optsOut.opacity = trace.opacity;

        optsOut.markers = new Array(count);
        for (i = 0; i < count; i++) {
            optsOut.markers[i] = getSymbolSdf(
                {
                    mx: optsOut.symbols[i],
                    ma: optsOut.angles[i]
                },
                trace
            );
        }
    } else {
        if (isOpen) {
            optsOut.color = rgba(optsIn.color, 'uint8');
            optsOut.color[3] = 0;
            optsOut.borderColor = rgba(optsIn.color, 'uint8');
        } else {
            optsOut.color = rgba(optsIn.color, 'uint8');
            optsOut.borderColor = rgba(optsIn.line.color, 'uint8');
        }

        optsOut.opacity = trace.opacity * optsIn.opacity;

        optsOut.marker = getSymbolSdf(
            {
                mx: optsIn.symbol,
                ma: optsIn.angle
            },
            trace
        );
    }

    // prepare sizes
    const sizeFactor = 1;
    const markerSizeFunc = makeBubbleSizeFn(trace, sizeFactor);
    let s;

    if (multiSize || multiLineWidth) {
        const sizes = (optsOut.sizes = new Array(count));
        const borderSizes = (optsOut.borderSizes = new Array(count));
        let sizeTotal = 0;
        let sizeAvg;

        if (multiSize) {
            for (i = 0; i < count; i++) {
                sizes[i] = markerSizeFunc(optsIn.size[i]);
                sizeTotal += sizes[i];
            }
            sizeAvg = sizeTotal / count;
        } else {
            s = markerSizeFunc(optsIn.size);
            for (i = 0; i < count; i++) {
                sizes[i] = s;
            }
        }

        // See  https://github.com/plotly/plotly.js/pull/1781#discussion_r121820798
        if (multiLineWidth) {
            for (i = 0; i < count; i++) {
                borderSizes[i] = optsIn.line.width[i];
            }
        } else {
            s = optsIn.line.width;
            for (i = 0; i < count; i++) {
                borderSizes[i] = s;
            }
        }

        optsOut.sizeAvg = sizeAvg;
    } else {
        optsOut.size = markerSizeFunc((optsIn && optsIn.size) || 10);
        optsOut.borderSizes = markerSizeFunc(optsIn.line.width);
    }

    return optsOut;
}

function convertMarkerSelection(gd: GraphDiv, trace: FullTrace, target) {
    const optsIn = trace.marker;
    let optsOut: any = {};

    if (!target) return optsOut;

    if (target.marker && target.marker.symbol) {
        optsOut = convertMarkerStyle(gd, Lib.extendFlat({}, optsIn, target.marker));
    } else if (target.marker) {
        if (target.marker.size) optsOut.size = target.marker.size;
        if (target.marker.color) optsOut.colors = target.marker.color;
        if (target.marker.opacity !== undefined) optsOut.opacity = target.marker.opacity;
    }

    return optsOut;
}

function convertTextSelection(gd: GraphDiv, trace: FullTrace, target) {
    let optsOut: any = {};

    if (!target) return optsOut;

    if (target.textfont) {
        const optsIn = {
            opacity: 1,
            text: trace.text,
            texttemplate: trace.texttemplate,
            textposition: trace.textposition,
            textfont: Lib.extendFlat({}, trace.textfont)
        };
        if (target.textfont) {
            Lib.extendFlat(optsIn.textfont, target.textfont);
        }
        optsOut = convertTextStyle(gd, optsIn as any);
    }

    return optsOut;
}

function convertErrorBarStyle(trace: FullTrace, target, plotGlPixelRatio) {
    let optsOut: any = {
        capSize: target.width * 2 * plotGlPixelRatio,
        lineWidth: target.thickness * plotGlPixelRatio,
        color: target.color
    };

    if (target.copy_ystyle) {
        optsOut = trace.error_y;
    }

    return optsOut;
}

const SYMBOL_SDF_SIZE = constants.SYMBOL_SDF_SIZE;
const SYMBOL_SIZE = constants.SYMBOL_SIZE;
const SYMBOL_STROKE = constants.SYMBOL_STROKE;
const SYMBOL_SDF: any = {};
const SYMBOL_SVG_CIRCLE = symbolFuncs[0](SYMBOL_SIZE * 0.05);

function getSymbolSdf(d, trace: FullTrace) {
    let symbol = d.mx;
    if (symbol === 'circle') return null;

    let symbolPath, symbolSdf;
    const symNum = symbolNumber(symbol);
    const symbolFunc = symbolFuncs[symNum % 100];
    const isNoDot = !!symbolNoDot[symNum % 100];
    const isNoFill = !!symbolNoFill[symNum % 100];

    const isDot = helpers.isDotSymbol(symbol);

    // until we may handle angles in shader?
    if (d.ma) symbol += '_' + d.ma;

    // get symbol sdf from cache or generate it
    if (SYMBOL_SDF[symbol]) return SYMBOL_SDF[symbol];

    const angle = getMarkerAngle(d, trace);
    if (isDot && !isNoDot) {
        symbolPath = symbolFunc(SYMBOL_SIZE * 1.1, angle) + SYMBOL_SVG_CIRCLE;
    } else {
        symbolPath = symbolFunc(SYMBOL_SIZE, angle);
    }

    symbolSdf = svgSdf(symbolPath, {
        w: SYMBOL_SDF_SIZE,
        h: SYMBOL_SDF_SIZE,
        viewBox: [-SYMBOL_SIZE, -SYMBOL_SIZE, SYMBOL_SIZE, SYMBOL_SIZE],
        stroke: isNoFill ? SYMBOL_STROKE : -SYMBOL_STROKE
    });

    SYMBOL_SDF[symbol] = symbolSdf;

    return symbolSdf || null;
}

function convertLinePositions(gd: GraphDiv, trace: FullTrace, positions) {
    const len = positions.length;
    const count = len / 2;
    let linePositions;
    let i;

    if (subTypes.hasLines(trace) && count) {
        if (trace.line.shape === 'hv') {
            linePositions = [];
            for (i = 0; i < count - 1; i++) {
                if (isNaN(positions[i * 2]) || isNaN(positions[i * 2 + 1])) {
                    linePositions.push(NaN, NaN, NaN, NaN);
                } else {
                    linePositions.push(positions[i * 2], positions[i * 2 + 1]);
                    if (!isNaN(positions[i * 2 + 2]) && !isNaN(positions[i * 2 + 3])) {
                        linePositions.push(positions[i * 2 + 2], positions[i * 2 + 1]);
                    } else {
                        linePositions.push(NaN, NaN);
                    }
                }
            }
            linePositions.push(positions[len - 2], positions[len - 1]);
        } else if (trace.line.shape === 'hvh') {
            linePositions = [];
            for (i = 0; i < count - 1; i++) {
                if (
                    isNaN(positions[i * 2]) ||
                    isNaN(positions[i * 2 + 1]) ||
                    isNaN(positions[i * 2 + 2]) ||
                    isNaN(positions[i * 2 + 3])
                ) {
                    if (!isNaN(positions[i * 2]) && !isNaN(positions[i * 2 + 1])) {
                        linePositions.push(positions[i * 2], positions[i * 2 + 1]);
                    } else {
                        linePositions.push(NaN, NaN);
                    }
                    linePositions.push(NaN, NaN);
                } else {
                    const midPtX = (positions[i * 2] + positions[i * 2 + 2]) / 2;
                    linePositions.push(
                        positions[i * 2],
                        positions[i * 2 + 1],
                        midPtX,
                        positions[i * 2 + 1],
                        midPtX,
                        positions[i * 2 + 3]
                    );
                }
            }
            linePositions.push(positions[len - 2], positions[len - 1]);
        } else if (trace.line.shape === 'vhv') {
            linePositions = [];
            for (i = 0; i < count - 1; i++) {
                if (
                    isNaN(positions[i * 2]) ||
                    isNaN(positions[i * 2 + 1]) ||
                    isNaN(positions[i * 2 + 2]) ||
                    isNaN(positions[i * 2 + 3])
                ) {
                    if (!isNaN(positions[i * 2]) && !isNaN(positions[i * 2 + 1])) {
                        linePositions.push(positions[i * 2], positions[i * 2 + 1]);
                    } else {
                        linePositions.push(NaN, NaN);
                    }
                    linePositions.push(NaN, NaN);
                } else {
                    const midPtY = (positions[i * 2 + 1] + positions[i * 2 + 3]) / 2;
                    linePositions.push(
                        positions[i * 2],
                        positions[i * 2 + 1],
                        positions[i * 2],
                        midPtY,
                        positions[i * 2 + 2],
                        midPtY
                    );
                }
            }
            linePositions.push(positions[len - 2], positions[len - 1]);
        } else if (trace.line.shape === 'vh') {
            linePositions = [];
            for (i = 0; i < count - 1; i++) {
                if (isNaN(positions[i * 2]) || isNaN(positions[i * 2 + 1])) {
                    linePositions.push(NaN, NaN, NaN, NaN);
                } else {
                    linePositions.push(positions[i * 2], positions[i * 2 + 1]);
                    if (!isNaN(positions[i * 2 + 2]) && !isNaN(positions[i * 2 + 3])) {
                        linePositions.push(positions[i * 2], positions[i * 2 + 3]);
                    } else {
                        linePositions.push(NaN, NaN);
                    }
                }
            }
            linePositions.push(positions[len - 2], positions[len - 1]);
        } else {
            linePositions = positions;
        }
    }

    // If we have data with gaps, we ought to use rect joins
    // FIXME: get rid of this
    let hasNaN = false;
    for (i = 0; i < linePositions.length; i++) {
        if (isNaN(linePositions[i])) {
            hasNaN = true;
            break;
        }
    }

    const join =
        hasNaN || linePositions.length > constants.TOO_MANY_POINTS
            ? 'rect'
            : subTypes.hasMarkers(trace)
              ? 'rect'
              : 'round';

    // fill gaps
    if (hasNaN && trace.connectgaps) {
        let lastX = linePositions[0];
        let lastY = linePositions[1];

        for (i = 0; i < linePositions.length; i += 2) {
            if (isNaN(linePositions[i]) || isNaN(linePositions[i + 1])) {
                linePositions[i] = lastX;
                linePositions[i + 1] = lastY;
            } else {
                lastX = linePositions[i];
                lastY = linePositions[i + 1];
            }
        }
    }

    return {
        join: join,
        positions: linePositions
    };
}

function convertErrorBarPositions(gd: GraphDiv, trace: FullTrace, positions, x, y) {
    const makeComputeError = Registry.getComponentMethod('errorbars', 'makeComputeError');
    const xa = AxisIDs.getFromId(gd, trace.xaxis, 'x');
    const ya = AxisIDs.getFromId(gd, trace.yaxis, 'y');
    const count = positions.length / 2;
    const out: any = {};

    function convertOneAxis(coords, ax: FullAxis) {
        const axLetter = ax._id.charAt(0);
        const opts = trace['error_' + axLetter];

        if (opts && opts.visible && (ax.type === 'linear' || ax.type === 'log')) {
            const computeError = makeComputeError(opts);
            const pOffset = { x: 0, y: 1 }[axLetter];
            const eOffset: any = { x: [0, 1, 2, 3], y: [2, 3, 0, 1] }[axLetter];
            const errors = new Float64Array(4 * count);
            let minShoe = Infinity;
            let maxHat = -Infinity;

            for (let i = 0, j = 0; i < count; i++, j += 4) {
                const dc = coords[i];

                if (isNumeric(dc)) {
                    const dl = positions[i * 2 + pOffset];
                    const vals = computeError(dc, i);
                    const lv = vals[0];
                    const hv = vals[1];

                    if (isNumeric(lv) && isNumeric(hv)) {
                        const shoe = dc - lv;
                        const hat = dc + hv;

                        errors[j + eOffset[0]] = dl - ax.c2l(shoe);
                        errors[j + eOffset[1]] = ax.c2l(hat) - dl;
                        errors[j + eOffset[2]] = 0;
                        errors[j + eOffset[3]] = 0;

                        minShoe = Math.min(minShoe, dc - lv);
                        maxHat = Math.max(maxHat, dc + hv);
                    }
                }
            }

            out[axLetter] = {
                positions: positions,
                errors: errors,
                _bnds: [minShoe, maxHat]
            };
        }
    }

    convertOneAxis(x, xa);
    convertOneAxis(y, ya);
    return out;
}

function convertTextPosition(gd: GraphDiv, trace: FullTrace, textOpts, markerOpts) {
    const count = trace._length;
    const out: any = {};
    let i;

    // corresponds to textPointPosition from component.drawing
    if (subTypes.hasMarkers(trace)) {
        const fontOpts = textOpts.font;
        const align = textOpts.align;
        const baseline = textOpts.baseline;
        out.offset = new Array(count);

        for (i = 0; i < count; i++) {
            const ms = markerOpts.sizes ? markerOpts.sizes[i] : markerOpts.size;
            const fs = isArrayOrTypedArray(fontOpts) ? fontOpts[i].size : fontOpts.size;

            const a = isArrayOrTypedArray(align) ? (align.length > 1 ? align[i] : align[0]) : align;
            const b = isArrayOrTypedArray(baseline) ? (baseline.length > 1 ? baseline[i] : baseline[0]) : baseline;

            const hSign = TEXTOFFSETSIGN[a];
            const vSign = TEXTOFFSETSIGN[b];
            const xPad = ms ? ms / 0.8 + 1 : 0;
            const yPad = -vSign * xPad - vSign * 0.5;
            out.offset[i] = [(hSign * xPad) / fs, yPad / fs];
        }
    }

    return out;
}

export default {
    style: convertStyle,

    markerStyle: convertMarkerStyle,
    markerSelection: convertMarkerSelection,

    linePositions: convertLinePositions,
    errorBarPositions: convertErrorBarPositions,
    textPosition: convertTextPosition
};
