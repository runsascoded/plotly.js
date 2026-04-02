import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { font as drawingFont, bBox } from '../../components/drawing/index.js';
import Lib from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import barPlot from '../bar/plot.js';
import uniformText from '../bar/uniform_text.js';
import pieHelpers from '../pie/helpers.js';
import piePlot from '../pie/plot.js';
const strScale = Lib.strScale;
const strTranslate = Lib.strTranslate;
const toMoveInsideBar = barPlot.toMoveInsideBar;
const recordMinTextSize = uniformText.recordMinTextSize;
const clearMinTextSize = uniformText.clearMinTextSize;

const attachFxHandlers = piePlot.attachFxHandlers;
const determineInsideTextFont = piePlot.determineInsideTextFont;

const layoutAreas = piePlot.layoutAreas;
const prerenderTitles = piePlot.prerenderTitles;
const positionTitleOutside = piePlot.positionTitleOutside;
const formatSliceLabel = piePlot.formatSliceLabel;

export default function plot(gd: GraphDiv,  cdModule) {
    const isStatic = gd._context.staticPlot;

    const fullLayout = gd._fullLayout;

    clearMinTextSize('funnelarea', fullLayout);

    prerenderTitles(cdModule, gd);
    layoutAreas(cdModule, fullLayout._size);

    Lib.makeTraceGroups(fullLayout._funnelarealayer, cdModule, 'trace').each(function(this: any, cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;

        setCoords(cd);

        plotGroup.each(function(this: any) {
            const slices = select(this).selectAll('g.slice').data(cd);

            slices.enter().append('g')
                .classed('slice', true);
            slices.exit().remove();

            slices.each(function(this: any, pt, i) {
                if(pt.hidden) {
                    select(this).selectAll('path,g').remove();
                    return;
                }

                // to have consistent event data compared to other traces
                pt.pointNumber = pt.i;
                pt.curveNumber = trace.index;

                const cx = cd0.cx;
                const cy = cd0.cy;
                const sliceTop = select(this);
                const slicePath = sliceTop.selectAll('path.surface').data([pt]);

                slicePath.enter().append('path')
                    .classed('surface', true)
                    .style({'pointer-events': isStatic ? 'none' : 'all'});

                sliceTop.call(attachFxHandlers, gd, cd);

                const shape =
                    'M' + (cx + pt.TR[0]) + ',' + (cy + pt.TR[1]) +
                    line(pt.TR, pt.BR) +
                    line(pt.BR, pt.BL) +
                    line(pt.BL, pt.TL) +
                    'Z';

                slicePath.attr('d', shape);

                // add text
                formatSliceLabel(gd, pt, cd0);
                const textPosition = pieHelpers.castOption(trace.textposition, pt.pts);
                const sliceTextGroup = sliceTop.selectAll('g.slicetext')
                    .data(pt.text && (textPosition !== 'none') ? [0] : []);

                sliceTextGroup.enter().append('g')
                    .classed('slicetext', true);
                sliceTextGroup.exit().remove();

                sliceTextGroup.each(function(this: any) {
                    const sliceText = Lib.ensureSingle(select(this), 'text', '', function(this: any, s) {
                        // prohibit tex interpretation until we can handle
                        // tex and regular text together
                        s.attr('data-notex', 1);
                    });

                    const font = Lib.ensureUniformFontSize(gd, determineInsideTextFont(trace, pt, (fullLayout.font as any)));

                    sliceText.text(pt.text)
                        .attr({
                            class: 'slicetext',
                            transform: '',
                            'text-anchor': 'middle'
                        })
                        .call(drawingFont, font)
                        .call(svgTextUtils.convertToTspans, gd);

                    // position the text relative to the slice
                    const textBB = bBox(sliceText.node());
                    let transform;

                    let x0, x1;
                    const y0 = Math.min(pt.BL[1], pt.BR[1]) + cy;
                    const y1 = Math.max(pt.TL[1], pt.TR[1]) + cy;

                    x0 = Math.max(pt.TL[0], pt.BL[0]) + cx;
                    x1 = Math.min(pt.TR[0], pt.BR[0]) + cx;

                    transform = toMoveInsideBar(x0, x1, y0, y1, textBB, {
                        isHorizontal: true,
                        constrained: true,
                        angle: 0,
                        anchor: 'middle'
                    });

                    transform.fontSize = font.size;
                    recordMinTextSize(trace.type, transform, fullLayout);
                    cd[i].transform = transform;

                    Lib.setTransormAndDisplay(sliceText, transform);
                });
            });

            // add the title
            const titleTextGroup = select(this).selectAll('g.titletext')
                .data(trace.title.text ? [0] : []);

            titleTextGroup.enter().append('g')
                .classed('titletext', true);
            titleTextGroup.exit().remove();

            titleTextGroup.each(function(this: any) {
                const titleText = Lib.ensureSingle(select(this), 'text', '', function(this: any, s) {
                    // prohibit tex interpretation as above
                    s.attr('data-notex', 1);
                });

                let txt = trace.title.text;
                if(trace._meta) {
                    txt = Lib.templateString(txt, trace._meta);
                }

                titleText.text(txt)
                    .attr({
                        class: 'titletext',
                        transform: '',
                        'text-anchor': 'middle',
                    })
                .call(drawingFont, trace.title.font)
                .call(svgTextUtils.convertToTspans, gd);

                const transform = positionTitleOutside(cd0, fullLayout._size);

                titleText.attr('transform',
                    strTranslate(transform.x, transform.y) +
                    strScale(Math.min(1, transform.scale)) +
                    strTranslate(transform.tx, transform.ty));
            });
        });
    });
}

function line(a,  b) {
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];

    return 'l' + dx + ',' + dy;
}

function getBetween(a,  b) {
    return [
        0.5 * (a[0] + b[0]),
        0.5 * (a[1] + b[1])
    ];
}

function setCoords(cd) {
    if(!cd.length) return;

    const cd0 = cd[0];
    const trace = cd0.trace;

    const aspectratio = trace.aspectratio;

    let h = trace.baseratio;
    if(h > 0.999) h = 0.999; // TODO: may handle this case separately
    const h2 = Math.pow(h, 2);

    const v1 = cd0.vTotal;
    const v0 = v1 * h2 / (1 - h2);

    const totalValues = v1;
    let sumSteps = v0 / v1;

    function calcPos() {
        const q = Math.sqrt(sumSteps);
        return {
            x: q,
            y: -q
        };
    }

    function getPoint() {
        const pos = calcPos();
        return [pos.x, pos.y];
    }

    let p;
    const allPoints: any[] = [];
    allPoints.push(getPoint());

    let i, cdi;
    for(i = cd.length - 1; i > -1; i--) {
        cdi = cd[i];
        if(cdi.hidden) continue;

        const step = cdi.v / totalValues;
        sumSteps += step;

        allPoints.push(getPoint());
    }

    let minY = Infinity;
    let maxY = -Infinity;
    for(i = 0; i < allPoints.length; i++) {
        p = allPoints[i];
        minY = Math.min(minY, p[1]);
        maxY = Math.max(maxY, p[1]);
    }

    // center the shape
    for(i = 0; i < allPoints.length; i++) {
        allPoints[i][1] -= (maxY + minY) / 2;
    }

    const lastX = allPoints[allPoints.length - 1][0];

    // get pie r
    const r = cd0.r;

    const rY = (maxY - minY) / 2;
    const scaleX = r / lastX;
    const scaleY = r / rY * aspectratio;

    // set funnelarea r
    cd0.r = scaleY * rY;

    // scale the shape
    for(i = 0; i < allPoints.length; i++) {
        allPoints[i][0] *= scaleX;
        allPoints[i][1] *= scaleY;
    }

    // record first position
    p = allPoints[0];
    let prevLeft = [-p[0], p[1]];
    let prevRight = [p[0], p[1]];

    let n = 0; // note we skip the very first point.
    for(i = cd.length - 1; i > -1; i--) {
        cdi = cd[i];
        if(cdi.hidden) continue;

        n += 1;
        const x = allPoints[n][0];
        const y = allPoints[n][1];

        cdi.TL = [-x, y];
        cdi.TR = [x, y];

        cdi.BL = prevLeft;
        cdi.BR = prevRight;

        cdi.pxmid = getBetween(cdi.TR, cdi.BR);

        prevLeft = cdi.TL;
        prevRight = cdi.TR;
    }
}
