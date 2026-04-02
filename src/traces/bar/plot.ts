import type { CalcDatum, FullLayout, GraphDiv, PlotInfo } from '../../../types/core';
import { select } from 'd3-selection';
function d3Round(x: number, n?: number): number { return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x); }
import isNumeric from 'fast-isnumeric';
import { castOption, ensureSingle, ensureUniformFontSize, formatPercent, identity, makeTraceGroups, setTransormAndDisplay, texttemplateString } from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Color from '../../components/color/index.js';
import { bBox, font, hideOutsideRangePoint, makePointStyleFns, setClipUrl, singlePointStyle } from '../../components/drawing/index.js';
import Registry from '../../registry.js';
import _axes from '../../plots/cartesian/axes.js';
const { tickText } = _axes;
import uniformText from './uniform_text.js';
import style from './style.js';
import helpers from './helpers.js';
import constants from './constants.js';
import attributes from './attributes.js';
import { appendArrayPointValue } from '../../components/fx/helpers.js';
const recordMinTextSize = uniformText.recordMinTextSize;
const clearMinTextSize = uniformText.clearMinTextSize;

const attributeText = attributes.text;
const attributeTextPosition = attributes.textposition;

const TEXTPAD = constants.TEXTPAD;

function keyFunc(d: any): string {
    return d.id;
}
function getKeyFunc(trace: any): ((d: any) => string) | undefined {
    if (trace.ids) {
        return keyFunc;
    }
}

// Returns -1 if v < 0, 1 if v > 0, and 0 if v == 0
function sign(v: number): number {
    return (v > 0 ? 1 : 0) - (v < 0 ? 1 : 0);
}

// Returns 1 if a < b and -1 otherwise
// (For the purposes of this module we don't care about the case where a == b)
function dirSign(a: number, b: number): number {
    return a < b ? 1 : -1;
}

function getXY(di: any, xa: any, ya: any, isHorizontal: boolean): number[][] {
    const s: any[] = [];
    const p: any[] = [];

    const sAxis = isHorizontal ? xa : ya;
    const pAxis = isHorizontal ? ya : xa;

    s[0] = (sAxis.c2p(di.s0, true) as any);
    p[0] = (pAxis.c2p(di.p0, true) as any);

    s[1] = (sAxis.c2p(di.s1, true) as any);
    p[1] = (pAxis.c2p(di.p1, true) as any);

    return isHorizontal ? [s, p] : [p, s];
}

function transition(selection: any, fullLayout: FullLayout, opts: any, makeOnCompleteCallback: any): any {
    if (!fullLayout.uniformtext.mode && hasTransition(opts)) {
        let onComplete: any;
        if (makeOnCompleteCallback) {
            onComplete = makeOnCompleteCallback();
        }
        return selection
            .transition()
            .duration(opts.duration)
            .ease(opts.easing)
            .on('end', function () {
                onComplete && onComplete();
            })
            .on('interrupt', function () {
                onComplete && onComplete();
            });
    } else {
        return selection;
    }
}

function hasTransition(transitionOpts: any): boolean {
    return transitionOpts && transitionOpts.duration > 0;
}

function plot(gd: GraphDiv, plotinfo: PlotInfo, cdModule: CalcDatum[][], traceLayer: any, opts: any, makeOnCompleteCallback: any): any {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;
    const fullLayout = gd._fullLayout;
    const isStatic = gd._context.staticPlot;

    if (!opts) {
        opts = {
            mode: fullLayout.barmode,
            norm: fullLayout.barmode,
            gap: fullLayout.bargap,
            groupgap: fullLayout.bargroupgap
        };

        // don't clear bar when this is called from waterfall or funnel
        clearMinTextSize('bar', fullLayout);
    }

    const bartraces = makeTraceGroups(traceLayer, cdModule, 'trace bars').each(function (this: any, cd: any) {
        const plotGroup = select(this);
        const trace = cd[0].trace;
        const t = cd[0].t;
        const isWaterfall = trace.type === 'waterfall';
        const isFunnel = trace.type === 'funnel';
        const isHistogram = trace.type === 'histogram';
        const isBar = trace.type === 'bar';
        const shouldDisplayZeros = isBar || isFunnel;
        let adjustPixel = 0;
        if (isWaterfall && trace.connector.visible && trace.connector.mode === 'between') {
            adjustPixel = trace.connector.line.width / 2;
        }

        const isHorizontal = trace.orientation === 'h';
        const withTransition = hasTransition(opts);

        const pointGroup = ensureSingle(plotGroup, 'g', 'points');

        const keyFunc = getKeyFunc(trace);
        const bars = pointGroup.selectAll('g.point').data(identity, keyFunc);

        const barsEnter = bars.enter().append('g').classed('point', true);

        bars.exit().remove();

        bars.merge(barsEnter).each(function (this: any, di: any, i: any) {
            const bar = select(this);

            // now display the bar
            // clipped xf/yf (2nd arg true): non-positive
            // log values go off-screen by plotwidth
            // so you see them continue if you drag the plot
            const xy = getXY(di, xa, ya, isHorizontal);

            let x0 = xy[0][0];
            let x1 = xy[0][1];
            let y0 = xy[1][0];
            let y1 = xy[1][1];

            // empty bars
            let isBlank = (isHorizontal ? x1 - x0 : y1 - y0) === 0;

            // display zeros if line.width > 0
            if (isBlank && shouldDisplayZeros && helpers.getLineWidth(trace, di)) {
                isBlank = false;
            }

            // skip nulls
            if (!isBlank) {
                isBlank = !isNumeric(x0) || !isNumeric(x1) || !isNumeric(y0) || !isNumeric(y1);
            }

            // record isBlank
            di.isBlank = isBlank;

            // for blank bars, ensure start and end positions are equal - important for smooth transitions
            if (isBlank) {
                if (isHorizontal) {
                    x1 = x0;
                } else {
                    y1 = y0;
                }
            }

            // in waterfall mode `between` we need to adjust bar end points to match the connector width
            if (adjustPixel && !isBlank) {
                if (isHorizontal) {
                    x0 -= dirSign(x0, x1) * adjustPixel;
                    x1 += dirSign(x0, x1) * adjustPixel;
                } else {
                    y0 -= dirSign(y0, y1) * adjustPixel;
                    y1 += dirSign(y0, y1) * adjustPixel;
                }
            }

            let lw: any;
            let mc;

            if (trace.type === 'waterfall') {
                if (!isBlank) {
                    const cont = trace[di.dir].marker;
                    lw = cont.line.width;
                    mc = cont.color;
                }
            } else {
                lw = helpers.getLineWidth(trace, di);
                mc = di.mc || trace.marker.color;
            }

            function roundWithLine(v: number, _vc?: number, _hideZeroSpan?: boolean): number {
                const offset = d3Round((lw / 2) % 1, 2);

                // if there are explicit gaps, don't round,
                // it can make the gaps look crappy
                return opts.gap === 0 && opts.groupgap === 0 ? d3Round(Math.round(v) - offset, 2) : v;
            }

            function expandToVisible(v: number, vc?: number, hideZeroSpan?: boolean): number {
                if (hideZeroSpan && v === vc) {
                    // should not expand zero span bars
                    // when start and end positions are identical
                    // i.e. for vertical when y0 === y1
                    // and for horizontal when x0 === x1
                    return v;
                }

                // if it's not in danger of disappearing entirely,
                // round more precisely
                return Math.abs(v - vc!) >= 2
                    ? roundWithLine(v)
                    : // but if it's very thin, expand it so it's
                      // necessarily visible, even if it might overlap
                      // its neighbor
                      v > vc!
                      ? Math.ceil(v)
                      : Math.floor(v);
            }

            const op = Color.opacity(mc);
            const fixpx = op < 1 || lw > 0.01 ? roundWithLine : expandToVisible;
            if (!gd._context.staticPlot) {
                // if bars are not fully opaque or they have a line
                // around them, round to integer pixels, mainly for
                // safari so we prevent overlaps from its expansive
                // pixelation. if the bars ARE fully opaque and have
                // no line, expand to a full pixel to make sure we
                // can see them
                x0 = fixpx(x0, x1, isHorizontal);
                x1 = fixpx(x1, x0, isHorizontal);
                y0 = fixpx(y0, y1, !isHorizontal);
                y1 = fixpx(y1, y0, !isHorizontal);
            }

            // Function to convert from size axis values to pixels
            const c2p = isHorizontal ? xa.c2p : ya.c2p;

            // Decide whether to use upper or lower bound of current bar stack
            // as reference point for rounding
            let outerBound: any;
            if (di.s0 > 0) {
                outerBound = di._sMax;
            } else if (di.s0 < 0) {
                outerBound = di._sMin;
            } else {
                outerBound = di.s1 > 0 ? di._sMax : di._sMin;
            }

            // Calculate corner radius of bar in pixels
            function calcCornerRadius(crValue: any, crForm: any) {
                if (!crValue) return 0;

                const barWidth = isHorizontal ? Math.abs(y1 - y0) : Math.abs(x1 - x0);
                const barLength = isHorizontal ? Math.abs(x1 - x0) : Math.abs(y1 - y0);
                const stackedBarTotalLength = fixpx(Math.abs(c2p(outerBound, true) - c2p(0, true)));
                const maxRadius = di.hasB
                    ? Math.min(barWidth / 2, barLength / 2)
                    : Math.min(barWidth / 2, stackedBarTotalLength);
                let crPx;

                if (crForm === '%') {
                    // If radius is given as a % string, convert to number of pixels
                    const crPercent = Math.min(50, crValue);
                    crPx = barWidth * (crPercent / 100);
                } else {
                    // Otherwise, it's already a number of pixels, use the given value
                    crPx = crValue;
                }
                return fixpx(Math.max(Math.min(crPx, maxRadius), 0));
            }
            // Exclude anything which is not explicitly a bar or histogram chart from rounding
            const r = isBar || isHistogram ? calcCornerRadius(t.cornerradiusvalue, t.cornerradiusform) : 0;
            // Construct path string for bar
            let path, h;
            // Default rectangular path (used if no rounding)
            const rectanglePath = 'M' + x0 + ',' + y0 + 'V' + y1 + 'H' + x1 + 'V' + y0 + 'Z';
            let overhead = 0;
            if (r && di.s) {
                // Bar has cornerradius, and nonzero size
                // Check amount of 'overhead' (bars stacked above this one)
                // to see whether we need to round or not
                const refPoint = sign(di.s0) === 0 || sign(di.s) === sign(di.s0) ? di.s1 : di.s0;
                overhead = fixpx(!di.hasB ? Math.abs(c2p(outerBound, true) - c2p(refPoint, true)) : 0);
                if (overhead < r) {
                    // Calculate parameters for rounded corners
                    const xdir = dirSign(x0, x1);
                    const ydir = dirSign(y0, y1);
                    // Sweep direction for rounded corner arcs
                    const cornersweep = xdir === -ydir ? 1 : 0;
                    if (isHorizontal) {
                        // Horizontal bars
                        if (di.hasB) {
                            // Floating base: Round 1st & 2nd, and 3rd & 4th corners
                            path =
                                'M' +
                                (x0 + r * xdir) +
                                ',' +
                                y0 +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                x0 +
                                ',' +
                                (y0 + r * ydir) +
                                'V' +
                                (y1 - r * ydir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x0 + r * xdir) +
                                ',' +
                                y1 +
                                'H' +
                                (x1 - r * xdir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                x1 +
                                ',' +
                                (y1 - r * ydir) +
                                'V' +
                                (y0 + r * ydir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x1 - r * xdir) +
                                ',' +
                                y0 +
                                'Z';
                        } else {
                            // Base on axis: Round 3rd and 4th corners

                            // Helper variables to help with extending rounding down to lower bars
                            h = Math.abs(x1 - x0) + overhead;
                            const dy1 = h < r ? r - Math.sqrt(h * (2 * r - h)) : 0;
                            const dy2 = overhead > 0 ? Math.sqrt(overhead * (2 * r - overhead)) : 0;
                            const xminfunc = xdir > 0 ? Math.max : Math.min;

                            path =
                                'M' +
                                x0 +
                                ',' +
                                y0 +
                                'V' +
                                (y1 - dy1 * ydir) +
                                'H' +
                                xminfunc(x1 - (r - overhead) * xdir, x0) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                x1 +
                                ',' +
                                (y1 - r * ydir - dy2) +
                                'V' +
                                (y0 + r * ydir + dy2) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                xminfunc(x1 - (r - overhead) * xdir, x0) +
                                ',' +
                                (y0 + dy1 * ydir) +
                                'Z';
                        }
                    } else {
                        // Vertical bars
                        if (di.hasB) {
                            // Floating base: Round 1st & 4th, and 2nd & 3rd corners
                            path =
                                'M' +
                                (x0 + r * xdir) +
                                ',' +
                                y0 +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                x0 +
                                ',' +
                                (y0 + r * ydir) +
                                'V' +
                                (y1 - r * ydir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x0 + r * xdir) +
                                ',' +
                                y1 +
                                'H' +
                                (x1 - r * xdir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                x1 +
                                ',' +
                                (y1 - r * ydir) +
                                'V' +
                                (y0 + r * ydir) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x1 - r * xdir) +
                                ',' +
                                y0 +
                                'Z';
                        } else {
                            // Base on axis: Round 2nd and 3rd corners

                            // Helper variables to help with extending rounding down to lower bars
                            h = Math.abs(y1 - y0) + overhead;
                            const dx1 = h < r ? r - Math.sqrt(h * (2 * r - h)) : 0;
                            const dx2 = overhead > 0 ? Math.sqrt(overhead * (2 * r - overhead)) : 0;
                            const yminfunc = ydir > 0 ? Math.max : Math.min;

                            path =
                                'M' +
                                (x0 + dx1 * xdir) +
                                ',' +
                                y0 +
                                'V' +
                                yminfunc(y1 - (r - overhead) * ydir, y0) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x0 + r * xdir - dx2) +
                                ',' +
                                y1 +
                                'H' +
                                (x1 - r * xdir + dx2) +
                                'A ' +
                                r +
                                ',' +
                                r +
                                ' 0 0 ' +
                                cornersweep +
                                ' ' +
                                (x1 - dx1 * xdir) +
                                ',' +
                                yminfunc(y1 - (r - overhead) * ydir, y0) +
                                'V' +
                                y0 +
                                'Z';
                        }
                    }
                } else {
                    // There is a cornerradius, but bar is too far down the stack to be rounded; just draw a rectangle
                    path = rectanglePath;
                }
            } else {
                // No cornerradius, just draw a rectangle
                path = rectanglePath;
            }

            const sel = transition(ensureSingle(bar, 'path'), fullLayout, opts, makeOnCompleteCallback);
            sel.style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
                .attr('d', isNaN((x1 - x0) * (y1 - y0)) || (isBlank && gd._context.staticPlot) ? 'M0,0Z' : path)
                .call(setClipUrl, plotinfo.layerClipId, gd);

            if (!fullLayout.uniformtext.mode && withTransition) {
                const styleFns = makePointStyleFns(trace);
                singlePointStyle(di, sel, trace, styleFns, gd);
            }

            appendBarText(gd, plotinfo, bar, cd, i, x0, x1, y0, y1, r, overhead, opts, makeOnCompleteCallback);

            if (plotinfo.layerClipId) {
                hideOutsideRangePoint(di, bar.select('text'), xa, ya, trace.xcalendar, trace.ycalendar);
            }
        });

        // lastly, clip points groups of `cliponaxis !== false` traces
        // on `plotinfo._hasClipOnAxisFalse === true` subplots
        const hasClipOnAxisFalse = trace.cliponaxis === false;
        setClipUrl(plotGroup, (hasClipOnAxisFalse ? null : plotinfo.layerClipId as any), gd);
    });

    // error bars are on the top
    Registry.getComponentMethod('errorbars', 'plot')(gd, bartraces, plotinfo, opts);
}

function appendBarText(gd: GraphDiv, plotinfo: any, bar: any, cd: any[], i: number, x0: number, x1: number, y0: number, y1: number, r: number, overhead: number, opts: any, makeOnCompleteCallback: any): void {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    const fullLayout = gd._fullLayout;
    let textPosition: any;

    function appendTextNode(bar: any, text: any, textFont: any) {
        const textSelection = ensureSingle(bar, 'text')
            .text(text)
            .attr('class', 'bartext bartext-' + textPosition)
            .attr('text-anchor', 'middle')
            // prohibit tex interpretation until we can handle
            // tex and regular text together
            .attr('data-notex', 1)
            .call(font, textFont)
            .call(svgTextUtils.convertToTspans, gd);

        return textSelection;
    }

    // get trace attributes
    const trace = cd[0].trace;
    const isHorizontal = trace.orientation === 'h';

    const text = getText(fullLayout, cd, i, xa, ya);

    textPosition = getTextPosition(trace, i);

    // compute text position
    const inStackOrRelativeMode = opts.mode === 'stack' || opts.mode === 'relative';

    const calcBar = cd[i];
    const isOutmostBar = !inStackOrRelativeMode || calcBar._outmost;
    const hasB = calcBar.hasB;
    const barIsRounded = r && r - overhead > TEXTPAD;

    if (
        !text ||
        textPosition === 'none' ||
        ((calcBar.isBlank || x0 === x1 || y0 === y1) && (textPosition === 'auto' || textPosition === 'inside'))
    ) {
        bar.select('text').remove();
        return;
    }

    const layoutFont = fullLayout.font;
    const barColor = style.getBarColor(cd[i], trace);
    const insideTextFont = style.getInsideTextFont(trace, i, layoutFont, barColor);
    const outsideTextFont = style.getOutsideTextFont(trace, i, layoutFont);
    const insidetextanchor = trace.insidetextanchor || 'end';

    // Special case: don't use the c2p(v, true) value on log size axes,
    // so that we can get correctly inside text scaling
    const di = bar.datum();
    if (isHorizontal) {
        if (xa.type === 'log' && di.s0 <= 0) {
            if (xa.range[0] < xa.range[1]) {
                x0 = 0;
            } else {
                x0 = xa._length;
            }
        }
    } else {
        if (ya.type === 'log' && di.s0 <= 0) {
            if (ya.range[0] < ya.range[1]) {
                y0 = ya._length;
            } else {
                y0 = 0;
            }
        }
    }

    // Compute width and height of bar
    const lx = Math.abs(x1 - x0);
    const ly = Math.abs(y1 - y0);

    // padding excluded
    const barWidth = lx - 2 * TEXTPAD;
    const barHeight = ly - 2 * TEXTPAD;

    let textSelection;

    let textBB;
    let textWidth;
    let textHeight;
    let textFont;

    if (textPosition === 'outside') {
        if (!isOutmostBar && !calcBar.hasB) textPosition = 'inside';
    }

    if (textPosition === 'auto') {
        if (isOutmostBar) {
            // draw text using insideTextFont and check if it fits inside bar
            textPosition = 'inside';

            textFont = ensureUniformFontSize(gd, insideTextFont);

            textSelection = appendTextNode(bar, text, textFont);

            textBB = bBox(textSelection.node());
            textWidth = textBB.width;
            textHeight = textBB.height;

            const textHasSize = textWidth > 0 && textHeight > 0;

            let fitsInside;
            if (barIsRounded) {
                // If bar is rounded, check if text fits between rounded corners
                if (hasB) {
                    fitsInside =
                        textfitsInsideBar(barWidth - 2 * r, barHeight, textWidth, textHeight, isHorizontal) ||
                        textfitsInsideBar(barWidth, barHeight - 2 * r, textWidth, textHeight, isHorizontal);
                } else if (isHorizontal) {
                    fitsInside =
                        textfitsInsideBar(barWidth - (r - overhead), barHeight, textWidth, textHeight, isHorizontal) ||
                        textfitsInsideBar(
                            barWidth,
                            barHeight - 2 * (r - overhead),
                            textWidth,
                            textHeight,
                            isHorizontal
                        );
                } else {
                    fitsInside =
                        textfitsInsideBar(barWidth, barHeight - (r - overhead), textWidth, textHeight, isHorizontal) ||
                        textfitsInsideBar(
                            barWidth - 2 * (r - overhead),
                            barHeight,
                            textWidth,
                            textHeight,
                            isHorizontal
                        );
                }
            } else {
                fitsInside = textfitsInsideBar(barWidth, barHeight, textWidth, textHeight, isHorizontal);
            }

            if (textHasSize && fitsInside) {
                textPosition = 'inside';
            } else {
                textPosition = 'outside';
                textSelection.remove();
                textSelection = null;
            }
        } else {
            textPosition = 'inside';
        }
    }

    if (!textSelection) {
        textFont = ensureUniformFontSize(gd, textPosition === 'outside' ? outsideTextFont : insideTextFont);

        textSelection = appendTextNode(bar, text, textFont);

        const currentTransform = textSelection.attr('transform');
        textSelection.attr('transform', '');
        (textBB = bBox(textSelection.node())), (textWidth = textBB.width), (textHeight = textBB.height);
        textSelection.attr('transform', currentTransform);

        if (textWidth <= 0 || textHeight <= 0) {
            textSelection.remove();
            return;
        }
    }

    const angle = trace.textangle;

    // compute text transform
    let transform, constrained;
    if (textPosition === 'outside') {
        constrained = trace.constraintext === 'both' || trace.constraintext === 'outside';

        transform = toMoveOutsideBar(x0, x1, y0, y1, textBB, {
            isHorizontal: isHorizontal,
            constrained: constrained,
            angle: angle
        });
    } else {
        constrained = trace.constraintext === 'both' || trace.constraintext === 'inside';

        transform = toMoveInsideBar(x0, x1, y0, y1, textBB, {
            isHorizontal: isHorizontal,
            constrained: constrained,
            angle: angle,
            anchor: insidetextanchor,
            hasB: hasB,
            r: r,
            overhead: overhead
        });
    }

    transform.fontSize = (font as any).size;
    recordMinTextSize(trace.type === 'histogram' ? 'bar' : trace.type, transform, fullLayout);
    calcBar.transform = transform;

    const s = transition(textSelection, fullLayout, opts, makeOnCompleteCallback);
    setTransormAndDisplay(s, transform);
}

function textfitsInsideBar(barWidth: number, barHeight: number, textWidth: number, textHeight: number, isHorizontal: boolean): boolean {
    if (barWidth < 0 || barHeight < 0) return false;
    const fitsInside = textWidth <= barWidth && textHeight <= barHeight;
    const fitsInsideIfRotated = textWidth <= barHeight && textHeight <= barWidth;
    const fitsInsideIfShrunk = isHorizontal
        ? barWidth >= textWidth * (barHeight / textHeight)
        : barHeight >= textHeight * (barWidth / textWidth);
    return fitsInside || fitsInsideIfRotated || fitsInsideIfShrunk;
}

function getRotateFromAngle(angle: any): number {
    return angle === 'auto' ? 0 : angle;
}

function getRotatedTextSize(textBB: any, rotate: number): { x: number; y: number } {
    const a = (Math.PI / 180) * rotate;
    const absSin = Math.abs(Math.sin(a));
    const absCos = Math.abs(Math.cos(a));

    return {
        x: textBB.width * absCos + textBB.height * absSin,
        y: textBB.width * absSin + textBB.height * absCos
    };
}

function toMoveInsideBar(x0: number, x1: number, y0: number, y1: number, textBB: any, opts: any): any {
    const isHorizontal = !!opts.isHorizontal;
    const constrained = !!opts.constrained;
    const angle = opts.angle || 0;
    const anchor = opts.anchor;
    const isEnd = anchor === 'end';
    const isStart = anchor === 'start';
    const leftToRight = opts.leftToRight || 0; // left: -1, center: 0, right: 1
    const toRight = (leftToRight + 1) / 2;
    const toLeft = 1 - toRight;
    const hasB = opts.hasB;
    const r = opts.r;
    const overhead = opts.overhead;

    const textWidth = textBB.width;
    const textHeight = textBB.height;

    let lx = Math.abs(x1 - x0);
    let ly = Math.abs(y1 - y0);

    // compute remaining space
    let textpad = lx > 2 * TEXTPAD && ly > 2 * TEXTPAD ? TEXTPAD : 0;

    lx -= 2 * textpad;
    ly -= 2 * textpad;

    let rotate = getRotateFromAngle(angle);
    if (
        angle === 'auto' &&
        !(textWidth <= lx && textHeight <= ly) &&
        (textWidth > lx || textHeight > ly) &&
        (!(textWidth > ly || textHeight > lx) || textWidth < textHeight !== lx < ly)
    ) {
        rotate += 90;
    }

    const t = getRotatedTextSize(textBB, rotate);

    let scale, padForRounding;
    // Scale text for rounded bars
    if (r && r - overhead > TEXTPAD) {
        const scaleAndPad = scaleTextForRoundedBar(x0, x1, y0, y1, t, r, overhead, isHorizontal, hasB);
        scale = scaleAndPad.scale;
        padForRounding = scaleAndPad.pad;
        // Scale text for non-rounded bars
    } else {
        scale = 1;
        if (constrained) {
            scale = Math.min(1, lx / t.x, ly / t.y);
        }
        padForRounding = 0;
    }

    // compute text and target positions
    const textX = textBB.left * toLeft + textBB.right * toRight;
    const textY = (textBB.top + textBB.bottom) / 2;
    let targetX = (x0 + TEXTPAD) * toLeft + (x1 - TEXTPAD) * toRight;
    let targetY = (y0 + y1) / 2;
    let anchorX = 0;
    let anchorY = 0;
    if (isStart || isEnd) {
        const extrapad = (isHorizontal ? t.x : t.y) / 2;

        if (r && (isEnd || hasB)) {
            textpad += padForRounding;
        }

        const dir = isHorizontal ? dirSign(x0, x1) : dirSign(y0, y1);

        if (isHorizontal) {
            if (isStart) {
                targetX = x0 + dir * textpad;
                anchorX = -dir * extrapad;
            } else {
                targetX = x1 - dir * textpad;
                anchorX = dir * extrapad;
            }
        } else {
            if (isStart) {
                targetY = y0 + dir * textpad;
                anchorY = -dir * extrapad;
            } else {
                targetY = y1 - dir * textpad;
                anchorY = dir * extrapad;
            }
        }
    }

    return {
        textX: textX,
        textY: textY,
        targetX: targetX,
        targetY: targetY,
        anchorX: anchorX,
        anchorY: anchorY,
        scale: scale,
        rotate: rotate
    };
}

function scaleTextForRoundedBar(x0: number, x1: number, y0: number, y1: number, t: any, r: number, overhead: number, isHorizontal: boolean, hasB: boolean): { scale: number; pad: number } {
    const barWidth = Math.max(0, Math.abs(x1 - x0) - 2 * TEXTPAD);
    const barHeight = Math.max(0, Math.abs(y1 - y0) - 2 * TEXTPAD);
    const R = r - TEXTPAD;
    const clippedR = overhead ? R - Math.sqrt(R * R - (R - overhead) * (R - overhead)) : R;
    const rX = hasB ? R * 2 : isHorizontal ? R - overhead : 2 * clippedR;
    const rY = hasB ? R * 2 : isHorizontal ? 2 * clippedR : R - overhead;
    let a, b, c;
    let scale, pad;

    if (t.y / t.x >= barHeight / (barWidth - rX)) {
        // Case 1 (Tall text)
        scale = barHeight / t.y;
    } else if (t.y / t.x <= (barHeight - rY) / barWidth) {
        // Case 2 (Wide text)
        scale = barWidth / t.x;
    } else if (!hasB && isHorizontal) {
        // Case 3a (Quadratic case, two side corners are rounded)
        a = t.x * t.x + (t.y * t.y) / 4;
        b = -2 * t.x * (barWidth - R) - t.y * (barHeight / 2 - R);
        c = (barWidth - R) * (barWidth - R) + (barHeight / 2 - R) * (barHeight / 2 - R) - R * R;

        scale = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    } else if (!hasB) {
        // Case 3b (Quadratic case, two top/bottom corners are rounded)
        a = (t.x * t.x) / 4 + t.y * t.y;
        b = -t.x * (barWidth / 2 - R) - 2 * t.y * (barHeight - R);
        c = (barWidth / 2 - R) * (barWidth / 2 - R) + (barHeight - R) * (barHeight - R) - R * R;

        scale = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    } else {
        // Case 4 (Quadratic case, all four corners are rounded)
        a = (t.x * t.x + t.y * t.y) / 4;
        b = -t.x * (barWidth / 2 - R) - t.y * (barHeight / 2 - R);
        c = (barWidth / 2 - R) * (barWidth / 2 - R) + (barHeight / 2 - R) * (barHeight / 2 - R) - R * R;
        scale = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
    }

    // Scale should not be larger than 1
    scale = Math.min(1, scale);

    if (isHorizontal) {
        pad = Math.max(
            0,
            R -
                Math.sqrt(
                    Math.max(0, R * R - (R - (barHeight - t.y * scale) / 2) * (R - (barHeight - t.y * scale) / 2))
                ) -
                overhead
        );
    } else {
        pad = Math.max(
            0,
            R -
                Math.sqrt(
                    Math.max(0, R * R - (R - (barWidth - t.x * scale) / 2) * (R - (barWidth - t.x * scale) / 2))
                ) -
                overhead
        );
    }

    return { scale: scale, pad: pad };
}

function toMoveOutsideBar(x0: number, x1: number, y0: number, y1: number, textBB: any, opts: any): any {
    const isHorizontal = !!opts.isHorizontal;
    const constrained = !!opts.constrained;
    const angle = opts.angle || 0;

    const textWidth = textBB.width;
    const textHeight = textBB.height;
    const lx = Math.abs(x1 - x0);
    const ly = Math.abs(y1 - y0);

    let textpad;
    // Keep the padding so the text doesn't sit right against
    // the bars, but don't factor it into barWidth
    if (isHorizontal) {
        textpad = ly > 2 * TEXTPAD ? TEXTPAD : 0;
    } else {
        textpad = lx > 2 * TEXTPAD ? TEXTPAD : 0;
    }

    // compute rotate and scale
    let scale = 1;
    if (constrained) {
        scale = isHorizontal ? Math.min(1, ly / textHeight) : Math.min(1, lx / textWidth);
    }

    const rotate = getRotateFromAngle(angle);
    const t = getRotatedTextSize(textBB, rotate);

    // compute text and target positions
    const extrapad = (isHorizontal ? t.x : t.y) / 2;
    const textX = (textBB.left + textBB.right) / 2;
    const textY = (textBB.top + textBB.bottom) / 2;
    let targetX = (x0 + x1) / 2;
    let targetY = (y0 + y1) / 2;
    let anchorX = 0;
    let anchorY = 0;

    const dir = isHorizontal ? dirSign(x1, x0) : dirSign(y0, y1);
    if (isHorizontal) {
        targetX = x1 - dir * textpad;
        anchorX = dir * extrapad;
    } else {
        targetY = y1 + dir * textpad;
        anchorY = -dir * extrapad;
    }

    return {
        textX: textX,
        textY: textY,
        targetX: targetX,
        targetY: targetY,
        anchorX: anchorX,
        anchorY: anchorY,
        scale: scale,
        rotate: rotate
    };
}

function getText(fullLayout: any, cd: any[], index: number, xa: any, ya: any): string {
    const trace = cd[0].trace;
    const texttemplate = trace.texttemplate;

    let value;
    if (texttemplate) {
        value = calcTexttemplate(fullLayout, cd, index, xa, ya);
    } else if (trace.textinfo) {
        value = calcTextinfo(cd, index, xa, ya);
    } else {
        value = helpers.getValue(trace.text, index);
    }

    return helpers.coerceString(attributeText, value);
}

function getTextPosition(trace: any, index: number): string {
    const value = helpers.getValue(trace.textposition, index);
    return helpers.coerceEnumerated(attributeTextPosition, value);
}

function calcTexttemplate(fullLayout: any, cd: any[], index: number, xa: any, ya: any): any {
    const trace = cd[0].trace;
    const texttemplate = castOption(trace, index, 'texttemplate');
    if (!texttemplate) return '';
    const isHistogram = trace.type === 'histogram';
    const isWaterfall = trace.type === 'waterfall';
    const isFunnel = trace.type === 'funnel';
    const isHorizontal = trace.orientation === 'h';

    let pLetter, pAxis: any;
    let vLetter, vAxis: any;
    if (isHorizontal) {
        pLetter = 'y';
        pAxis = ya;
        vLetter = 'x';
        vAxis = xa;
    } else {
        pLetter = 'x';
        pAxis = xa;
        vLetter = 'y';
        vAxis = ya;
    }

    function formatLabel(u: any) {
        return tickText(pAxis, pAxis.c2l(u), true).text;
    }

    function formatNumber(v: any) {
        return tickText(vAxis, vAxis.c2l(v), true).text;
    }

    const cdi = cd[index];
    const obj: any = {};

    obj.label = cdi.p;
    obj.labelLabel = obj[pLetter + 'Label'] = formatLabel(cdi.p);

    const tx = castOption(trace, cdi.i, 'text');
    if (tx === 0 || tx) obj.text = tx;

    obj.value = cdi.s;
    obj.valueLabel = obj[vLetter + 'Label'] = formatNumber(cdi.s);

    const pt: any = {};
    appendArrayPointValue(pt, trace, cdi.i);

    if (isHistogram || pt.x === undefined) pt.x = isHorizontal ? obj.value : obj.label;
    if (isHistogram || pt.y === undefined) pt.y = isHorizontal ? obj.label : obj.value;
    if (isHistogram || pt.xLabel === undefined) pt.xLabel = isHorizontal ? obj.valueLabel : obj.labelLabel;
    if (isHistogram || pt.yLabel === undefined) pt.yLabel = isHorizontal ? obj.labelLabel : obj.valueLabel;

    if (isWaterfall) {
        obj.delta = +cdi.rawS || cdi.s;
        obj.deltaLabel = formatNumber(obj.delta);
        obj.final = cdi.v;
        obj.finalLabel = formatNumber(obj.final);
        obj.initial = obj.final - obj.delta;
        obj.initialLabel = formatNumber(obj.initial);
    }

    if (isFunnel) {
        obj.value = cdi.s;
        obj.valueLabel = formatNumber(obj.value);

        obj.percentInitial = cdi.begR;
        obj.percentInitialLabel = formatPercent(cdi.begR);
        obj.percentPrevious = cdi.difR;
        obj.percentPreviousLabel = formatPercent(cdi.difR);
        obj.percentTotal = cdi.sumR;
        obj.percenTotalLabel = formatPercent(cdi.sumR);
    }

    const customdata = castOption(trace, cdi.i, 'customdata');
    if (customdata) obj.customdata = customdata;
    return texttemplateString({
        data: [pt, obj, trace._meta],
        fallback: trace.texttemplatefallback,
        labels: obj,
        locale: fullLayout._d3locale,
        template: texttemplate
    });
}

function calcTextinfo(cd: any[], index: number, xa: any, ya: any): string {
    const trace = cd[0].trace;
    const isHorizontal = trace.orientation === 'h';
    const isWaterfall = trace.type === 'waterfall';
    const isFunnel = trace.type === 'funnel';

    function formatLabel(u: any) {
        const pAxis = isHorizontal ? ya : xa;
        return tickText(pAxis, u, true).text;
    }

    function formatNumber(v: any) {
        const sAxis = isHorizontal ? xa : ya;
        return tickText(sAxis, +v, true).text;
    }

    const textinfo = trace.textinfo;
    const cdi = cd[index];

    const parts = textinfo.split('+');
    const text: any[] = [];
    let tx;

    const hasFlag = function (flag: any) {
        return parts.indexOf(flag) !== -1;
    };

    if (hasFlag('label')) {
        text.push(formatLabel(cd[index].p));
    }

    if (hasFlag('text')) {
        tx = castOption(trace, cdi.i, 'text');
        if (tx === 0 || tx) text.push(tx);
    }

    if (isWaterfall) {
        const delta = +cdi.rawS || cdi.s;
        const final = cdi.v;
        const initial = final - delta;

        if (hasFlag('initial')) text.push(formatNumber(initial));
        if (hasFlag('delta')) text.push(formatNumber(delta));
        if (hasFlag('final')) text.push(formatNumber(final));
    }

    if (isFunnel) {
        if (hasFlag('value')) text.push(formatNumber(cdi.s));

        let nPercent = 0;
        if (hasFlag('percent initial')) nPercent++;
        if (hasFlag('percent previous')) nPercent++;
        if (hasFlag('percent total')) nPercent++;

        const hasMultiplePercents = nPercent > 1;

        if (hasFlag('percent initial')) {
            tx = formatPercent(cdi.begR);
            if (hasMultiplePercents) tx += ' of initial';
            text.push(tx);
        }
        if (hasFlag('percent previous')) {
            tx = formatPercent(cdi.difR);
            if (hasMultiplePercents) tx += ' of previous';
            text.push(tx);
        }
        if (hasFlag('percent total')) {
            tx = formatPercent(cdi.sumR);
            if (hasMultiplePercents) tx += ' of total';
            text.push(tx);
        }
    }

    return text.join('<br>');
}

export default {
    plot: plot,
    toMoveInsideBar: toMoveInsideBar
};
