import type { Font, FullTrace, GraphDiv, LayoutSize } from '../../../types/core';
import { select } from 'd3-selection';
import Plots from '../../plots/plots.js';
import Fx from '../../components/fx/index.js';
import Color from '../../components/color/index.js';
import { bBox, font as drawingFont, tester } from '../../components/drawing/index.js';
import Lib from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import uniformText from '../bar/uniform_text.js';
import _constants from '../bar/constants.js';
const { TEXTPAD } = _constants;
import helpers from './helpers.js';
import eventData from './event_data.js';
import _index from '../../lib/index.js';
const { isValidTextValue } = _index;
const strScale = Lib.strScale;
const strTranslate = Lib.strTranslate;
const recordMinTextSize = uniformText.recordMinTextSize;
const clearMinTextSize = uniformText.clearMinTextSize;

function plot(gd: GraphDiv, cdModule: any[]): any {
    const isStatic = gd._context.staticPlot;

    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;

    clearMinTextSize('pie', fullLayout);

    prerenderTitles(cdModule, gd);
    layoutAreas(cdModule, gs);

    const plotGroups = Lib.makeTraceGroups(fullLayout._pielayer, cdModule, 'trace').each(function (cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;

        setCoords(cd);

        // TODO: miter might look better but can sometimes cause problems
        // maybe miter with a small-ish stroke-miterlimit?
        plotGroup.attr('stroke-linejoin', 'round');

        plotGroup.each(function () {
            const slices = select(this).selectAll('g.slice').data(cd);

            slices.enter().append('g').classed('slice', true);
            slices.exit().remove();

            const quadrants = [
                [[], []], // y<0: x<0, x>=0
                [[], []] // y>=0: x<0, x>=0
            ];
            let hasOutsideText = false;

            slices.each(function (pt, i) {
                if (pt.hidden) {
                    select(this).selectAll('path,g').remove();
                    return;
                }

                // to have consistent event data compared to other traces
                pt.pointNumber = pt.i;
                pt.curveNumber = trace.index;

                quadrants[pt.pxmid[1] < 0 ? 0 : 1][pt.pxmid[0] < 0 ? 0 : 1].push(pt);

                let cx = cd0.cx;
                let cy = cd0.cy;
                const sliceTop = select(this);
                const slicePath = sliceTop.selectAll('path.surface').data([pt]);

                slicePath
                    .enter()
                    .append('path')
                    .classed('surface', true)
                    .style({ 'pointer-events': isStatic ? 'none' : 'all' });

                sliceTop.call(attachFxHandlers, gd, cd);

                if (trace.pull) {
                    const pull = +helpers.castOption(trace.pull, pt.pts) || 0;
                    if (pull > 0) {
                        cx += pull * pt.pxmid[0];
                        cy += pull * pt.pxmid[1];
                    }
                }

                pt.cxFinal = cx;
                pt.cyFinal = cy;

                function arc(start, finish, cw, scale) {
                    const dx = scale * (finish[0] - start[0]);
                    const dy = scale * (finish[1] - start[1]);

                    return (
                        'a' +
                        scale * cd0.r +
                        ',' +
                        scale * cd0.r +
                        ' 0 ' +
                        pt.largeArc +
                        (cw ? ' 1 ' : ' 0 ') +
                        dx +
                        ',' +
                        dy
                    );
                }

                const hole = trace.hole;
                if (pt.v === cd0.vTotal) {
                    // 100% fails bcs arc start and end are identical
                    const outerCircle =
                        'M' +
                        (cx + pt.px0[0]) +
                        ',' +
                        (cy + pt.px0[1]) +
                        arc(pt.px0, pt.pxmid, true, 1) +
                        arc(pt.pxmid, pt.px0, true, 1) +
                        'Z';
                    if (hole) {
                        slicePath.attr(
                            'd',
                            'M' +
                                (cx + hole * pt.px0[0]) +
                                ',' +
                                (cy + hole * pt.px0[1]) +
                                arc(pt.px0, pt.pxmid, false, hole) +
                                arc(pt.pxmid, pt.px0, false, hole) +
                                'Z' +
                                outerCircle
                        );
                    } else slicePath.attr('d', outerCircle);
                } else {
                    const outerArc = arc(pt.px0, pt.px1, true, 1);

                    if (hole) {
                        const rim = 1 - hole;
                        slicePath.attr(
                            'd',
                            'M' +
                                (cx + hole * pt.px1[0]) +
                                ',' +
                                (cy + hole * pt.px1[1]) +
                                arc(pt.px1, pt.px0, false, hole) +
                                'l' +
                                rim * pt.px0[0] +
                                ',' +
                                rim * pt.px0[1] +
                                outerArc +
                                'Z'
                        );
                    } else {
                        slicePath.attr('d', 'M' + cx + ',' + cy + 'l' + pt.px0[0] + ',' + pt.px0[1] + outerArc + 'Z');
                    }
                }

                // add text
                formatSliceLabel(gd, pt, cd0);
                const textPosition = helpers.castOption(trace.textposition, pt.pts);
                const sliceTextGroup = sliceTop
                    .selectAll('g.slicetext')
                    .data(pt.text && textPosition !== 'none' ? [0] : []);

                sliceTextGroup.enter().append('g').classed('slicetext', true);
                sliceTextGroup.exit().remove();

                sliceTextGroup.each(function () {
                    const sliceText = Lib.ensureSingle(select(this), 'text', '', function (s) {
                        // prohibit tex interpretation until we can handle
                        // tex and regular text together
                        s.attr('data-notex', 1);
                    });

                    const font = Lib.ensureUniformFontSize(
                        gd,
                        textPosition === 'outside'
                            ? determineOutsideTextFont(trace, pt, fullLayout.font)
                            : determineInsideTextFont(trace, pt, fullLayout.font)
                    );

                    sliceText
                        .text(pt.text)
                        .attr({
                            class: 'slicetext',
                            transform: '',
                            'text-anchor': 'middle'
                        })
                        .call(drawingFont, font)
                        .call(svgTextUtils.convertToTspans, gd);

                    // position the text relative to the slice
                    let textBB = bBox(sliceText.node());
                    let transform;

                    if (textPosition === 'outside') {
                        transform = transformOutsideText(textBB, pt);
                    } else {
                        transform = transformInsideText(textBB, pt, cd0);
                        if (textPosition === 'auto' && transform.scale < 1) {
                            const newFont = Lib.ensureUniformFontSize(gd, trace.outsidetextfont);

                            sliceText.call(drawingFont, newFont);
                            textBB = bBox(sliceText.node());

                            transform = transformOutsideText(textBB, pt);
                        }
                    }

                    const textPosAngle = transform.textPosAngle;
                    const textXY = textPosAngle === undefined ? pt.pxmid : getCoords(cd0.r, textPosAngle);
                    transform.targetX = cx + textXY[0] * transform.rCenter + (transform.x || 0);
                    transform.targetY = cy + textXY[1] * transform.rCenter + (transform.y || 0);
                    computeTransform(transform, textBB);

                    // save some stuff to use later ensure no labels overlap
                    if (transform.outside) {
                        const targetY = transform.targetY;
                        pt.yLabelMin = targetY - textBB.height / 2;
                        pt.yLabelMid = targetY;
                        pt.yLabelMax = targetY + textBB.height / 2;
                        pt.labelExtraX = 0;
                        pt.labelExtraY = 0;
                        hasOutsideText = true;
                    }

                    transform.fontSize = font.size;
                    recordMinTextSize(trace.type, transform, fullLayout);
                    cd[i].transform = transform;

                    Lib.setTransormAndDisplay(sliceText, transform);
                });
            });

            // add the title
            const titleTextGroup = select(this)
                .selectAll('g.titletext')
                .data(trace.title.text ? [0] : []);

            titleTextGroup.enter().append('g').classed('titletext', true);
            titleTextGroup.exit().remove();

            titleTextGroup.each(function () {
                const titleText = Lib.ensureSingle(select(this), 'text', '', function (s) {
                    // prohibit tex interpretation as above
                    s.attr('data-notex', 1);
                });

                let txt = trace.title.text;
                if (trace._meta) {
                    txt = Lib.templateString(txt, trace._meta);
                }

                titleText
                    .text(txt)
                    .attr({
                        class: 'titletext',
                        transform: '',
                        'text-anchor': 'middle'
                    })
                    .call(drawingFont, trace.title.font)
                    .call(svgTextUtils.convertToTspans, gd);

                let transform;

                if (trace.title.position === 'middle center') {
                    transform = positionTitleInside(cd0);
                } else {
                    transform = positionTitleOutside(cd0, gs);
                }

                titleText.attr(
                    'transform',
                    strTranslate(transform.x, transform.y) +
                        strScale(Math.min(1, transform.scale)) +
                        strTranslate(transform.tx, transform.ty)
                );
            });

            // now make sure no labels overlap (at least within one pie)
            if (hasOutsideText) scootLabels(quadrants, trace);

            plotTextLines(slices, trace);

            if (hasOutsideText && trace.automargin) {
                // TODO if we ever want to improve perf,
                // we could reuse the textBB computed above together
                // with the sliceText transform info
                const traceBbox = bBox(plotGroup.node());

                const domain = trace.domain;
                const vpw = gs.w * (domain.x[1] - domain.x[0]);
                const vph = gs.h * (domain.y[1] - domain.y[0]);
                const xgap = (0.5 * vpw - cd0.r) / gs.w;
                const ygap = (0.5 * vph - cd0.r) / gs.h;

                Plots.autoMargin(gd, 'pie.' + trace.uid + '.automargin', {
                    xl: domain.x[0] - xgap,
                    xr: domain.x[1] + xgap,
                    yb: domain.y[0] - ygap,
                    yt: domain.y[1] + ygap,
                    l: Math.max(cd0.cx - cd0.r - traceBbox.left, 0),
                    r: Math.max(traceBbox.right - (cd0.cx + cd0.r), 0),
                    b: Math.max(traceBbox.bottom - (cd0.cy + cd0.r), 0),
                    t: Math.max(cd0.cy - cd0.r - traceBbox.top, 0),
                    pad: 5
                });
            }
        });
    });

    // This is for a bug in Chrome (as of 2015-07-22, and does not affect FF)
    // if insidetextfont and outsidetextfont are different sizes, sometimes the size
    // of an "em" gets taken from the wrong element at first so lines are
    // spaced wrong. You just have to tell it to try again later and it gets fixed.
    // I have no idea why we haven't seen this in other contexts. Also, sometimes
    // it gets the initial draw correct but on redraw it gets confused.
    setTimeout(function () {
        plotGroups.selectAll('tspan').each(function () {
            const s = select(this);
            if (s.attr('dy')) s.attr('dy', s.attr('dy'));
        });
    }, 0);
}

// TODO add support for transition
function plotTextLines(slices: any, trace: FullTrace): void {
    slices.each(function (pt) {
        const sliceTop = select(this);

        if (!pt.labelExtraX && !pt.labelExtraY) {
            sliceTop.select('path.textline').remove();
            return;
        }

        // first move the text to its new location
        const sliceText = sliceTop.select('g.slicetext text');

        pt.transform.targetX += pt.labelExtraX;
        pt.transform.targetY += pt.labelExtraY;

        Lib.setTransormAndDisplay(sliceText, pt.transform);

        // then add a line to the new location
        const lineStartX = pt.cxFinal + pt.pxmid[0];
        const lineStartY = pt.cyFinal + pt.pxmid[1];
        let textLinePath = 'M' + lineStartX + ',' + lineStartY;
        const finalX = ((pt.yLabelMax - pt.yLabelMin) * (pt.pxmid[0] < 0 ? -1 : 1)) / 4;

        if (pt.labelExtraX) {
            const yFromX = (pt.labelExtraX * pt.pxmid[1]) / pt.pxmid[0];
            const yNet = pt.yLabelMid + pt.labelExtraY - (pt.cyFinal + pt.pxmid[1]);

            if (Math.abs(yFromX) > Math.abs(yNet)) {
                textLinePath +=
                    'l' +
                    (yNet * pt.pxmid[0]) / pt.pxmid[1] +
                    ',' +
                    yNet +
                    'H' +
                    (lineStartX + pt.labelExtraX + finalX);
            } else {
                textLinePath += 'l' + pt.labelExtraX + ',' + yFromX + 'v' + (yNet - yFromX) + 'h' + finalX;
            }
        } else {
            textLinePath += 'V' + (pt.yLabelMid + pt.labelExtraY) + 'h' + finalX;
        }

        Lib.ensureSingle(sliceTop, 'path', 'textline')
            .call(Color.stroke, trace.outsidetextfont.color)
            .attr({
                'stroke-width': Math.min(2, trace.outsidetextfont.size / 8),
                d: textLinePath,
                fill: 'none'
            });
    });
}

function attachFxHandlers(sliceTop: any, gd: GraphDiv, cd: any[]): any {
    const cd0 = cd[0];
    const cx = cd0.cx;
    const cy = cd0.cy;
    const trace = cd0.trace;
    const isFunnelArea = trace.type === 'funnelarea';

    // hover state vars
    // have we drawn a hover label, so it should be cleared later
    if (!('_hasHoverLabel' in trace)) trace._hasHoverLabel = false;
    // have we emitted a hover event, so later an unhover event should be emitted
    // note that click events do not depend on this - you can still get them
    // with hovermode: false or if you were earlier dragging, then clicked
    // in the same slice that you moused up in
    if (!('_hasHoverEvent' in trace)) trace._hasHoverEvent = false;

    sliceTop.on('mouseover', function (event: any, pt: any) {
        // in case fullLayout or fullData has changed without a replot
        const fullLayout2 = gd._fullLayout;
        const trace2 = gd._fullData[trace.index];

        if (gd._dragging || fullLayout2.hovermode === false) return;

        let hoverinfo = trace2.hoverinfo;
        if (Array.isArray(hoverinfo)) {
            // super hacky: we need to pull out the *first* hoverinfo from
            // pt.pts, then put it back into an array in a dummy trace
            // and call castHoverinfo on that.
            // TODO: do we want to have Fx.castHoverinfo somehow handle this?
            // it already takes an array for index, for 2D, so this seems tricky.
            hoverinfo = Fx.castHoverinfo(
                {
                    hoverinfo: [helpers.castOption(hoverinfo, pt.pts)],
                    _module: trace._module
                } as any,
                fullLayout2,
                0
            );
        }

        if (hoverinfo === 'all') hoverinfo = 'label+text+value+percent+name';

        // in case we dragged over the pie from another subplot,
        // or if hover is turned off
        if (trace2.hovertemplate || (hoverinfo !== 'none' && hoverinfo !== 'skip' && hoverinfo)) {
            const rInscribed = pt.rInscribed || 0;
            const hoverCenterX = cx + pt.pxmid[0] * (1 - rInscribed);
            const hoverCenterY = cy + pt.pxmid[1] * (1 - rInscribed);
            const separators = fullLayout2.separators;
            const text = [];

            if (hoverinfo && hoverinfo.indexOf('label') !== -1) text.push(pt.label);
            pt.text = helpers.castOption(trace2.hovertext || trace2.text, pt.pts);
            if (hoverinfo && hoverinfo.indexOf('text') !== -1) {
                const tx = pt.text;
                if (Lib.isValidTextValue(tx)) text.push(tx);
            }
            pt.value = pt.v;
            pt.valueLabel = helpers.formatPieValue(pt.v, separators);
            if (hoverinfo && hoverinfo.indexOf('value') !== -1) text.push(pt.valueLabel);
            pt.percent = pt.v / cd0.vTotal;
            pt.percentLabel = helpers.formatPiePercent(pt.percent, separators);
            if (hoverinfo && hoverinfo.indexOf('percent') !== -1) text.push(pt.percentLabel);

            const hoverLabel = trace2.hoverlabel;
            const hoverFont = hoverLabel.font;

            const bbox = [];
            Fx.loneHover(
                {
                    trace: trace,
                    x0: hoverCenterX - rInscribed * cd0.r,
                    x1: hoverCenterX + rInscribed * cd0.r,
                    y: hoverCenterY,
                    _x0: isFunnelArea ? cx + pt.TL[0] : hoverCenterX - rInscribed * cd0.r,
                    _x1: isFunnelArea ? cx + pt.TR[0] : hoverCenterX + rInscribed * cd0.r,
                    _y0: isFunnelArea ? cy + pt.TL[1] : hoverCenterY - rInscribed * cd0.r,
                    _y1: isFunnelArea ? cy + pt.BL[1] : hoverCenterY + rInscribed * cd0.r,
                    text: text.join('<br>'),
                    name: trace2.hovertemplate || hoverinfo.indexOf('name') !== -1 ? trace2.name : undefined,
                    idealAlign: pt.pxmid[0] < 0 ? 'left' : 'right',
                    color: helpers.castOption(hoverLabel.bgcolor, pt.pts) || pt.color,
                    borderColor: helpers.castOption(hoverLabel.bordercolor, pt.pts),
                    fontFamily: helpers.castOption(hoverFont.family, pt.pts),
                    fontSize: helpers.castOption(hoverFont.size, pt.pts),
                    fontColor: helpers.castOption(hoverFont.color, pt.pts),
                    nameLength: helpers.castOption(hoverLabel.namelength, pt.pts),
                    textAlign: helpers.castOption(hoverLabel.align, pt.pts),
                    hovertemplate: helpers.castOption(trace2.hovertemplate, pt.pts),
                    hovertemplateLabels: pt,
                    eventData: [eventData(pt, trace2)]
                },
                {
                    container: fullLayout2._hoverlayer.node(),
                    outerContainer: fullLayout2._paper.node(),
                    gd: gd,
                    inOut_bbox: bbox
                }
            );
            pt.bbox = bbox[0];

            trace._hasHoverLabel = true;
        }

        trace._hasHoverEvent = true;
        gd.emit('plotly_hover', {
            points: [eventData(pt, trace2)],
            event: event
        });
    });

    sliceTop.on('mouseout', function (evt) {
        const fullLayout2 = gd._fullLayout;
        const trace2 = gd._fullData[trace.index];
        const pt = select(this).datum();

        if (trace._hasHoverEvent) {
            evt.originalEvent = event;
            gd.emit('plotly_unhover', {
                points: [eventData(pt, trace2)],
                event: event
            });
            trace._hasHoverEvent = false;
        }

        if (trace._hasHoverLabel) {
            Fx.loneUnhover(fullLayout2._hoverlayer.node());
            trace._hasHoverLabel = false;
        }
    });

    sliceTop.on('click', function (event: any, pt: any) {
        // TODO: this does not support right-click. If we want to support it, we
        // would likely need to change pie to use dragElement instead of straight
        // map subplot event binding. Or perhaps better, make a simple wrapper with the
        // right mousedown, mousemove, and mouseup handlers just for a left/right click
        // map subplots would use this too.
        const fullLayout2 = gd._fullLayout;
        const trace2 = gd._fullData[trace.index];

        if (gd._dragging || fullLayout2.hovermode === false) return;

        gd._hoverdata = [eventData(pt, trace2)];
        Fx.click(gd, event as any);
    });
}

function determineOutsideTextFont(trace: FullTrace, pt: any, layoutFont: Partial<Font>): any {
    const color =
        helpers.castOption(trace.outsidetextfont.color, pt.pts) ||
        helpers.castOption(trace.textfont.color, pt.pts) ||
        layoutFont.color;

    const family =
        helpers.castOption(trace.outsidetextfont.family, pt.pts) ||
        helpers.castOption(trace.textfont.family, pt.pts) ||
        layoutFont.family;

    const size =
        helpers.castOption(trace.outsidetextfont.size, pt.pts) ||
        helpers.castOption(trace.textfont.size, pt.pts) ||
        layoutFont.size;

    const weight =
        helpers.castOption(trace.outsidetextfont.weight, pt.pts) ||
        helpers.castOption(trace.textfont.weight, pt.pts) ||
        layoutFont.weight;

    const style =
        helpers.castOption(trace.outsidetextfont.style, pt.pts) ||
        helpers.castOption(trace.textfont.style, pt.pts) ||
        layoutFont.style;

    const variant =
        helpers.castOption(trace.outsidetextfont.variant, pt.pts) ||
        helpers.castOption(trace.textfont.variant, pt.pts) ||
        layoutFont.variant;

    const textcase =
        helpers.castOption(trace.outsidetextfont.textcase, pt.pts) ||
        helpers.castOption(trace.textfont.textcase, pt.pts) ||
        layoutFont.textcase;

    const lineposition =
        helpers.castOption(trace.outsidetextfont.lineposition, pt.pts) ||
        helpers.castOption(trace.textfont.lineposition, pt.pts) ||
        layoutFont.lineposition;

    const shadow =
        helpers.castOption(trace.outsidetextfont.shadow, pt.pts) ||
        helpers.castOption(trace.textfont.shadow, pt.pts) ||
        layoutFont.shadow;

    return {
        color: color,
        family: family,
        size: size,
        weight: weight,
        style: style,
        variant: variant,
        textcase: textcase,
        lineposition: lineposition,
        shadow: shadow
    };
}

function determineInsideTextFont(trace: FullTrace, pt: any, layoutFont: Partial<Font>): any {
    let customColor = helpers.castOption(trace.insidetextfont.color, pt.pts);
    if (!customColor && trace._input.textfont) {
        // Why not simply using trace.textfont? Because if not set, it
        // defaults to layout.font which has a default color. But if
        // textfont.color and insidetextfont.color don't supply a value,
        // a contrasting color shall be used.
        customColor = helpers.castOption(trace._input.textfont.color, pt.pts);
    }

    const family =
        helpers.castOption(trace.insidetextfont.family, pt.pts) ||
        helpers.castOption(trace.textfont.family, pt.pts) ||
        layoutFont.family;

    const size =
        helpers.castOption(trace.insidetextfont.size, pt.pts) ||
        helpers.castOption(trace.textfont.size, pt.pts) ||
        layoutFont.size;

    const weight =
        helpers.castOption(trace.insidetextfont.weight, pt.pts) ||
        helpers.castOption(trace.textfont.weight, pt.pts) ||
        layoutFont.weight;

    const style =
        helpers.castOption(trace.insidetextfont.style, pt.pts) ||
        helpers.castOption(trace.textfont.style, pt.pts) ||
        layoutFont.style;

    const variant =
        helpers.castOption(trace.insidetextfont.variant, pt.pts) ||
        helpers.castOption(trace.textfont.variant, pt.pts) ||
        layoutFont.variant;

    const textcase =
        helpers.castOption(trace.insidetextfont.textcase, pt.pts) ||
        helpers.castOption(trace.textfont.textcase, pt.pts) ||
        layoutFont.textcase;

    const lineposition =
        helpers.castOption(trace.insidetextfont.lineposition, pt.pts) ||
        helpers.castOption(trace.textfont.lineposition, pt.pts) ||
        layoutFont.lineposition;

    const shadow =
        helpers.castOption(trace.insidetextfont.shadow, pt.pts) ||
        helpers.castOption(trace.textfont.shadow, pt.pts) ||
        layoutFont.shadow;

    return {
        color: customColor || Color.contrast(pt.color),
        family: family,
        size: size,
        weight: weight,
        style: style,
        variant: variant,
        textcase: textcase,
        lineposition: lineposition,
        shadow: shadow
    };
}

function prerenderTitles(cdModule: any[], gd: GraphDiv): void {
    let cd0, trace;

    // Determine the width and height of the title for each pie.
    for (let i = 0; i < cdModule.length; i++) {
        cd0 = cdModule[i][0];
        trace = cd0.trace;

        if (trace.title.text) {
            let txt = trace.title.text;
            if (trace._meta) {
                txt = Lib.templateString(txt, trace._meta);
            }

            const dummyTitle = tester
                .append('text')
                .attr('data-notex', 1)
                .text(txt)
                .call(drawingFont, trace.title.font)
                .call(svgTextUtils.convertToTspans, gd);
            const bb = bBox(dummyTitle.node(), true);
            cd0.titleBox = {
                width: bb.width,
                height: bb.height
            };
            dummyTitle.remove();
        }
    }
}

function transformInsideText(textBB: any, pt: any, cd0: any): any {
    const r = cd0.r || pt.rpx1;
    const rInscribed = pt.rInscribed;

    const isEmpty = pt.startangle === pt.stopangle;
    if (isEmpty) {
        return {
            rCenter: 1 - rInscribed,
            scale: 0,
            rotate: 0,
            textPosAngle: 0
        };
    }

    const ring = pt.ring;
    const isCircle = ring === 1 && Math.abs(pt.startangle - pt.stopangle) === Math.PI * 2;

    const halfAngle = pt.halfangle;
    const midAngle = pt.midangle;

    const orientation = cd0.trace.insidetextorientation;
    const isHorizontal = orientation === 'horizontal';
    const isTangential = orientation === 'tangential';
    const isRadial = orientation === 'radial';
    const isAuto = orientation === 'auto';

    const allTransforms = [];
    let newT;

    if (!isAuto) {
        // max size if text is placed (horizontally) at the top or bottom of the arc

        const considerCrossing = function (angle, key) {
            if (isCrossing(pt, angle)) {
                const dStart = Math.abs(angle - pt.startangle);
                const dStop = Math.abs(angle - pt.stopangle);

                const closestEdge = dStart < dStop ? dStart : dStop;

                if (key === 'tan') {
                    newT = calcTanTransform(textBB, r, ring, closestEdge, 0);
                } else {
                    // case of 'rad'
                    newT = calcRadTransform(textBB, r, ring, closestEdge, Math.PI / 2);
                }
                newT.textPosAngle = angle;

                allTransforms.push(newT);
            }
        };

        // to cover all cases with trace.rotation added
        let i;
        if (isHorizontal || isTangential) {
            // top
            for (i = 4; i >= -4; i -= 2) considerCrossing(Math.PI * i, 'tan');
            // bottom
            for (i = 4; i >= -4; i -= 2) considerCrossing(Math.PI * (i + 1), 'tan');
        }
        if (isHorizontal || isRadial) {
            // left
            for (i = 4; i >= -4; i -= 2) considerCrossing(Math.PI * (i + 1.5), 'rad');
            // right
            for (i = 4; i >= -4; i -= 2) considerCrossing(Math.PI * (i + 0.5), 'rad');
        }
    }

    if (isCircle || isAuto || isHorizontal) {
        // max size text can be inserted inside without rotating it
        // this inscribes the text rectangle in a circle, which is then inscribed
        // in the slice, so it will be an underestimate, which some day we may want
        // to improve so this case can get more use
        const textDiameter = Math.sqrt(textBB.width * textBB.width + textBB.height * textBB.height);

        newT = {
            scale: (rInscribed * r * 2) / textDiameter,

            // and the center position and rotation in this case
            rCenter: 1 - rInscribed,
            rotate: 0
        };

        newT.textPosAngle = (pt.startangle + pt.stopangle) / 2;
        if (newT.scale >= 1) return newT;

        allTransforms.push(newT);
    }

    if (isAuto || isRadial) {
        newT = calcRadTransform(textBB, r, ring, halfAngle, midAngle);
        newT.textPosAngle = (pt.startangle + pt.stopangle) / 2;
        allTransforms.push(newT);
    }

    if (isAuto || isTangential) {
        newT = calcTanTransform(textBB, r, ring, halfAngle, midAngle);
        newT.textPosAngle = (pt.startangle + pt.stopangle) / 2;
        allTransforms.push(newT);
    }

    let id = 0;
    let maxScale = 0;
    for (let k = 0; k < allTransforms.length; k++) {
        const s = allTransforms[k].scale;
        if (maxScale < s) {
            maxScale = s;
            id = k;
        }

        if (!isAuto && maxScale >= 1) {
            // respect test order for non-auto options
            break;
        }
    }
    return allTransforms[id];
}

function isCrossing(pt: any, angle: number): boolean {
    const start = pt.startangle;
    const stop = pt.stopangle;
    return (start > angle && angle > stop) || (start < angle && angle < stop);
}

function calcRadTransform(textBB: any, r: number, ring: number, halfAngle: number, midAngle: number): any {
    r = Math.max(0, r - 2 * TEXTPAD);

    // max size if text is rotated radially
    const a = textBB.width / textBB.height;
    const s = calcMaxHalfSize(a, halfAngle, r, ring);
    return {
        scale: (s * 2) / textBB.height,
        rCenter: calcRCenter(a, s / r),
        rotate: calcRotate(midAngle)
    };
}

function calcTanTransform(textBB: any, r: number, ring: number, halfAngle: number, midAngle: number): any {
    r = Math.max(0, r - 2 * TEXTPAD);

    // max size if text is rotated tangentially
    const a = textBB.height / textBB.width;
    const s = calcMaxHalfSize(a, halfAngle, r, ring);
    return {
        scale: (s * 2) / textBB.width,
        rCenter: calcRCenter(a, s / r),
        rotate: calcRotate(midAngle + Math.PI / 2)
    };
}

function calcRCenter(a: number, b: number): number {
    return Math.cos(b) - a * b;
}

function calcRotate(t: number): number {
    return (((180 / Math.PI) * t + 720) % 180) - 90;
}

function calcMaxHalfSize(a: number, halfAngle: number, r: number, ring: number): number {
    const q = a + 1 / (2 * Math.tan(halfAngle));
    return r * Math.min(1 / (Math.sqrt(q * q + 0.5) + q), ring / (Math.sqrt(a * a + ring / 2) + a));
}

function getInscribedRadiusFraction(pt: any, cd0: any): number {
    if (pt.v === cd0.vTotal && !cd0.trace.hole) return 1; // special case of 100% with no hole

    return Math.min(1 / (1 + 1 / Math.sin(pt.halfangle)), pt.ring / 2);
}

function transformOutsideText(textBB: any, pt: any): any {
    const x = pt.pxmid[0];
    const y = pt.pxmid[1];
    let dx = textBB.width / 2;
    let dy = textBB.height / 2;

    if (x < 0) dx *= -1;
    if (y < 0) dy *= -1;

    return {
        scale: 1,
        rCenter: 1,
        rotate: 0,
        x: dx + (Math.abs(dy) * (dx > 0 ? 1 : -1)) / 2,
        y: dy / (1 + (x * x) / (y * y)),
        outside: true
    };
}

function positionTitleInside(cd0: any): any {
    const textDiameter = Math.sqrt(cd0.titleBox.width * cd0.titleBox.width + cd0.titleBox.height * cd0.titleBox.height);
    return {
        x: cd0.cx,
        y: cd0.cy,
        scale: (cd0.trace.hole * cd0.r * 2) / textDiameter,
        tx: 0,
        ty: -cd0.titleBox.height / 2 + cd0.trace.title.font.size
    };
}

function positionTitleOutside(cd0: any, plotSize: LayoutSize): any {
    let scaleX = 1;
    let scaleY = 1;
    let maxPull;

    const trace = cd0.trace;
    // position of the baseline point of the text box in the plot, before scaling.
    // we anchored the text in the middle, so the baseline is on the bottom middle
    // of the first line of text.
    const topMiddle = {
        x: cd0.cx,
        y: cd0.cy
    };
    // relative translation of the text box after scaling
    const translate = {
        tx: 0,
        ty: 0
    };

    // we reason below as if the baseline is the top middle point of the text box.
    // so we must add the font size to approximate the y-coord. of the top.
    // note that this correction must happen after scaling.
    translate.ty += trace.title.font.size;
    maxPull = getMaxPull(trace);

    if (trace.title.position.indexOf('top') !== -1) {
        topMiddle.y -= (1 + maxPull) * cd0.r;
        translate.ty -= cd0.titleBox.height;
    } else if (trace.title.position.indexOf('bottom') !== -1) {
        topMiddle.y += (1 + maxPull) * cd0.r;
    }

    const rx = applyAspectRatio(cd0.r, cd0.trace.aspectratio);

    let maxWidth = (plotSize.w * (trace.domain.x[1] - trace.domain.x[0])) / 2;
    if (trace.title.position.indexOf('left') !== -1) {
        // we start the text at the left edge of the pie
        maxWidth = maxWidth + rx;
        topMiddle.x -= (1 + maxPull) * rx;
        translate.tx += cd0.titleBox.width / 2;
    } else if (trace.title.position.indexOf('center') !== -1) {
        maxWidth *= 2;
    } else if (trace.title.position.indexOf('right') !== -1) {
        maxWidth = maxWidth + rx;
        topMiddle.x += (1 + maxPull) * rx;
        translate.tx -= cd0.titleBox.width / 2;
    }
    scaleX = maxWidth / cd0.titleBox.width;
    scaleY = getTitleSpace(cd0, plotSize) / cd0.titleBox.height;
    return {
        x: topMiddle.x,
        y: topMiddle.y,
        scale: Math.min(scaleX, scaleY),
        tx: translate.tx,
        ty: translate.ty
    };
}

function applyAspectRatio(x: number, aspectratio: number | undefined): number {
    return x / (aspectratio === undefined ? 1 : aspectratio);
}

function getTitleSpace(cd0: any, plotSize: LayoutSize): number {
    const trace = cd0.trace;
    const pieBoxHeight = plotSize.h * (trace.domain.y[1] - trace.domain.y[0]);
    // use at most half of the plot for the title
    return Math.min(cd0.titleBox.height, pieBoxHeight / 2);
}

function getMaxPull(trace: FullTrace): number {
    let maxPull = trace.pull;
    if (!maxPull) return 0;

    let j;
    if (Lib.isArrayOrTypedArray(maxPull)) {
        maxPull = 0;
        for (j = 0; j < trace.pull.length; j++) {
            if (trace.pull[j] > maxPull) maxPull = trace.pull[j];
        }
    }
    return maxPull;
}

function scootLabels(quadrants: any[][], trace: FullTrace): any {
    let xHalf,
        yHalf,
        equatorFirst,
        farthestX,
        farthestY,
        xDiffSign,
        yDiffSign,
        thisQuad,
        oppositeQuad,
        wholeSide,
        i,
        thisQuadOutside,
        firstOppositeOutsidePt;

    function topFirst(a, b) {
        return a.pxmid[1] - b.pxmid[1];
    }
    function bottomFirst(a, b) {
        return b.pxmid[1] - a.pxmid[1];
    }

    function scootOneLabel(thisPt, prevPt) {
        if (!prevPt) prevPt = {};

        const prevOuterY = prevPt.labelExtraY + (yHalf ? prevPt.yLabelMax : prevPt.yLabelMin);
        const thisInnerY = yHalf ? thisPt.yLabelMin : thisPt.yLabelMax;
        const thisOuterY = yHalf ? thisPt.yLabelMax : thisPt.yLabelMin;
        const thisSliceOuterY = thisPt.cyFinal + farthestY(thisPt.px0[1], thisPt.px1[1]);
        let newExtraY = prevOuterY - thisInnerY;

        let xBuffer, i, otherPt, otherOuterY, otherOuterX, newExtraX;

        // make sure this label doesn't overlap other labels
        // this *only* has us move these labels vertically
        if (newExtraY * yDiffSign > 0) thisPt.labelExtraY = newExtraY;

        // make sure this label doesn't overlap any slices
        if (!Lib.isArrayOrTypedArray(trace.pull)) return; // this can only happen with array pulls

        for (i = 0; i < wholeSide.length; i++) {
            otherPt = wholeSide[i];

            // overlap can only happen if the other point is pulled more than this one
            if (
                otherPt === thisPt ||
                (helpers.castOption(trace.pull, thisPt.pts) || 0) >= (helpers.castOption(trace.pull, otherPt.pts) || 0)
            ) {
                continue;
            }

            if ((thisPt.pxmid[1] - otherPt.pxmid[1]) * yDiffSign > 0) {
                // closer to the equator - by construction all of these happen first
                // move the text vertically to get away from these slices
                otherOuterY = otherPt.cyFinal + farthestY(otherPt.px0[1], otherPt.px1[1]);
                newExtraY = otherOuterY - thisInnerY - thisPt.labelExtraY;

                if (newExtraY * yDiffSign > 0) thisPt.labelExtraY += newExtraY;
            } else if ((thisOuterY + thisPt.labelExtraY - thisSliceOuterY) * yDiffSign > 0) {
                // farther from the equator - happens after we've done all the
                // vertical moving we're going to do
                // move horizontally to get away from these more polar slices

                // if we're moving horz. based on a slice that's several slices away from this one
                // then we need some extra space for the lines to labels between them
                xBuffer = 3 * xDiffSign * Math.abs(i - wholeSide.indexOf(thisPt));

                otherOuterX = otherPt.cxFinal + farthestX(otherPt.px0[0], otherPt.px1[0]);
                newExtraX = otherOuterX + xBuffer - (thisPt.cxFinal + thisPt.pxmid[0]) - thisPt.labelExtraX;

                if (newExtraX * xDiffSign > 0) thisPt.labelExtraX += newExtraX;
            }
        }
    }

    for (yHalf = 0; yHalf < 2; yHalf++) {
        equatorFirst = yHalf ? topFirst : bottomFirst;
        farthestY = yHalf ? Math.max : Math.min;
        yDiffSign = yHalf ? 1 : -1;

        for (xHalf = 0; xHalf < 2; xHalf++) {
            farthestX = xHalf ? Math.max : Math.min;
            xDiffSign = xHalf ? 1 : -1;

            // first sort the array
            // note this is a copy of cd, so cd itself doesn't get sorted
            // but we can still modify points in place.
            thisQuad = quadrants[yHalf][xHalf];
            thisQuad.sort(equatorFirst);

            oppositeQuad = quadrants[1 - yHalf][xHalf];
            wholeSide = oppositeQuad.concat(thisQuad);

            thisQuadOutside = [];
            for (i = 0; i < thisQuad.length; i++) {
                if (thisQuad[i].yLabelMid !== undefined) thisQuadOutside.push(thisQuad[i]);
            }

            firstOppositeOutsidePt = false;
            for (i = 0; yHalf && i < oppositeQuad.length; i++) {
                if (oppositeQuad[i].yLabelMid !== undefined) {
                    firstOppositeOutsidePt = oppositeQuad[i];
                    break;
                }
            }

            // each needs to avoid the previous
            for (i = 0; i < thisQuadOutside.length; i++) {
                let prevPt = i && thisQuadOutside[i - 1];
                // bottom half needs to avoid the first label of the top half
                // top half we still need to call scootOneLabel on the first slice
                // so we can avoid other slices, but we don't pass a prevPt
                if (firstOppositeOutsidePt && !i) prevPt = firstOppositeOutsidePt;
                scootOneLabel(thisQuadOutside[i], prevPt);
            }
        }
    }
}

function layoutAreas(cdModule: any[], plotSize: LayoutSize): void {
    const scaleGroups = [];

    // figure out the center and maximum radius
    for (let i = 0; i < cdModule.length; i++) {
        const cd0 = cdModule[i][0];
        const trace = cd0.trace;

        const domain = trace.domain;
        const width = plotSize.w * (domain.x[1] - domain.x[0]);
        let height = plotSize.h * (domain.y[1] - domain.y[0]);
        // leave some space for the title, if it will be displayed outside
        if (trace.title.text && trace.title.position !== 'middle center') {
            height -= getTitleSpace(cd0, plotSize);
        }

        const rx = width / 2;
        let ry = height / 2;
        if (trace.type === 'funnelarea' && !trace.scalegroup) {
            ry /= trace.aspectratio;
        }

        cd0.r = Math.min(rx, ry) / (1 + getMaxPull(trace));

        cd0.cx = plotSize.l + (plotSize.w * (trace.domain.x[1] + trace.domain.x[0])) / 2;
        cd0.cy = plotSize.t + plotSize.h * (1 - trace.domain.y[0]) - height / 2;
        if (trace.title.text && trace.title.position.indexOf('bottom') !== -1) {
            cd0.cy -= getTitleSpace(cd0, plotSize);
        }

        if (trace.scalegroup && scaleGroups.indexOf(trace.scalegroup) === -1) {
            scaleGroups.push(trace.scalegroup);
        }
    }

    groupScale(cdModule, scaleGroups);
}

function groupScale(cdModule: any[], scaleGroups: string[]): void {
    let cd0, i, trace;

    // scale those that are grouped
    for (let k = 0; k < scaleGroups.length; k++) {
        let min = Infinity;
        const g = scaleGroups[k];

        for (i = 0; i < cdModule.length; i++) {
            cd0 = cdModule[i][0];
            trace = cd0.trace;

            if (trace.scalegroup === g) {
                let area;
                if (trace.type === 'pie') {
                    area = cd0.r * cd0.r;
                } else if (trace.type === 'funnelarea') {
                    let rx, ry;

                    if (trace.aspectratio > 1) {
                        rx = cd0.r;
                        ry = rx / trace.aspectratio;
                    } else {
                        ry = cd0.r;
                        rx = ry * trace.aspectratio;
                    }

                    rx *= (1 + trace.baseratio) / 2;

                    area = rx * ry;
                }

                min = Math.min(min, area / cd0.vTotal);
            }
        }

        for (i = 0; i < cdModule.length; i++) {
            cd0 = cdModule[i][0];
            trace = cd0.trace;
            if (trace.scalegroup === g) {
                let v = min * cd0.vTotal;
                if (trace.type === 'funnelarea') {
                    v /= (1 + trace.baseratio) / 2;
                    v /= trace.aspectratio;
                }

                cd0.r = Math.sqrt(v);
            }
        }
    }
}

function setCoords(cd: any[]): void {
    const cd0 = cd[0];
    const r = cd0.r;
    const trace = cd0.trace;
    let currentAngle = helpers.getRotationAngle(trace.rotation);
    let angleFactor = (2 * Math.PI) / cd0.vTotal;
    let firstPt = 'px0';
    let lastPt = 'px1';

    let i, cdi, currentCoords;

    if (trace.direction === 'counterclockwise') {
        for (i = 0; i < cd.length; i++) {
            if (!cd[i].hidden) break; // find the first non-hidden slice
        }
        if (i === cd.length) return; // all slices hidden

        currentAngle += angleFactor * cd[i].v;
        angleFactor *= -1;
        firstPt = 'px1';
        lastPt = 'px0';
    }

    currentCoords = getCoords(r, currentAngle);

    for (i = 0; i < cd.length; i++) {
        cdi = cd[i];
        if (cdi.hidden) continue;

        cdi[firstPt] = currentCoords;

        cdi.startangle = currentAngle;
        currentAngle += (angleFactor * cdi.v) / 2;
        cdi.pxmid = getCoords(r, currentAngle);
        cdi.midangle = currentAngle;
        currentAngle += (angleFactor * cdi.v) / 2;
        currentCoords = getCoords(r, currentAngle);
        cdi.stopangle = currentAngle;

        cdi[lastPt] = currentCoords;

        cdi.largeArc = cdi.v > cd0.vTotal / 2 ? 1 : 0;

        cdi.halfangle = Math.PI * Math.min(cdi.v / cd0.vTotal, 0.5);
        cdi.ring = 1 - trace.hole;
        cdi.rInscribed = getInscribedRadiusFraction(cdi, cd0);
    }
}

function getCoords(r: number, angle: number): [number, number] {
    return [r * Math.sin(angle), -r * Math.cos(angle)];
}

function formatSliceLabel(gd: GraphDiv, pt: any, cd0: any): any {
    const fullLayout = gd._fullLayout;
    const trace = cd0.trace;
    // look for textemplate
    const texttemplate = trace.texttemplate;

    // now insert text
    const textinfo = trace.textinfo;
    if (!texttemplate && textinfo && textinfo !== 'none') {
        const parts = textinfo.split('+');
        const hasFlag = function (flag) {
            return parts.indexOf(flag) !== -1;
        };
        const hasLabel = hasFlag('label');
        const hasText = hasFlag('text');
        const hasValue = hasFlag('value');
        const hasPercent = hasFlag('percent');

        const separators = fullLayout.separators;
        let text;

        text = hasLabel ? [pt.label] : [];
        if (hasText) {
            const tx = helpers.getFirstFilled(trace.text, pt.pts);
            if (isValidTextValue(tx)) text.push(tx);
        }
        if (hasValue) text.push(helpers.formatPieValue(pt.v, separators));
        if (hasPercent) text.push(helpers.formatPiePercent(pt.v / cd0.vTotal, separators));
        pt.text = text.join('<br>');
    }

    function makeTemplateVariables(pt) {
        return {
            label: pt.label,
            value: pt.v,
            valueLabel: helpers.formatPieValue(pt.v, fullLayout.separators),
            percent: pt.v / cd0.vTotal,
            percentLabel: helpers.formatPiePercent(pt.v / cd0.vTotal, fullLayout.separators),
            color: pt.color,
            text: pt.text,
            customdata: Lib.castOption(trace, pt.i, 'customdata')
        };
    }

    if (texttemplate) {
        const txt = Lib.castOption(trace, pt.i, 'texttemplate');
        if (!txt) {
            pt.text = '';
        } else {
            const obj = makeTemplateVariables(pt);
            const ptTx = helpers.getFirstFilled(trace.text, pt.pts);
            if (isValidTextValue(ptTx) || ptTx === '') obj.text = ptTx;
            pt.text = Lib.texttemplateString({
                data: [obj, trace._meta],
                fallback: trace.texttemplatefallback,
                labels: obj,
                locale: gd._fullLayout._d3locale,
                template: txt
            });
        }
    }
}

function computeTransform(
    transform: any, // inout
    textBB: any // in
): void {
    const a = (transform.rotate * Math.PI) / 180;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    const midX = (textBB.left + textBB.right) / 2;
    const midY = (textBB.top + textBB.bottom) / 2;
    transform.textX = midX * cosA - midY * sinA;
    transform.textY = midX * sinA + midY * cosA;
    transform.noCenter = true;
}

export default {
    plot: plot,
    formatSliceLabel: formatSliceLabel,
    transformInsideText: transformInsideText,
    determineInsideTextFont: determineInsideTextFont,
    positionTitleOutside: positionTitleOutside,
    prerenderTitles: prerenderTitles,
    layoutAreas: layoutAreas,
    attachFxHandlers: attachFxHandlers,
    computeTransform: computeTransform
};
