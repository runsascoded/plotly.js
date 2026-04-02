import type { FullTrace, GraphDiv, PlotInfo } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import { smoothopen } from '../../components/drawing/index.js';
import boxPlot from '../box/plot.js';
import linePoints from '../scatter/line_points.js';
import helpers from './helpers.js';

export default function plot(gd: GraphDiv, plotinfo: PlotInfo, cdViolins: any[], violinLayer: any): void {
    const isStatic = gd._context.staticPlot;
    const fullLayout = gd._fullLayout;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    function makePath(pts, trace) {
        const segments = linePoints(pts, {
            xaxis: xa,
            yaxis: ya,
            trace: trace,
            connectGaps: true,
            baseTolerance: 0.75,
            shape: 'spline',
            simplify: true,
            linearized: true
        });
        return smoothopen(segments[0], 1);
    }

    Lib.makeTraceGroups(violinLayer, cdViolins, 'trace violins').each(function(this: any, cd) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const t = cd0.t;
        const trace = cd0.trace;

        if(trace.visible !== true || t.empty) {
            plotGroup.remove();
            return;
        }

        const bPos = t.bPos;
        const bdPos = t.bdPos;
        const valAxis = plotinfo[t.valLetter + 'axis'];
        const posAxis = plotinfo[t.posLetter + 'axis'];
        const hasBothSides = trace.side === 'both';
        const hasPositiveSide = hasBothSides || trace.side === 'positive';
        const hasNegativeSide = hasBothSides || trace.side === 'negative';

        const violins = plotGroup.selectAll('path.violin').data(Lib.identity);

        violins.enter().append('path')
            .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
            .attr('class', 'violin');

        violins.exit().remove();

        violins.each(function(this: any, d) {
            const pathSel = select(this);
            const density = d.density;
            const len = density.length;
            const posCenter = posAxis.c2l(d.pos + bPos, true);
            const posCenterPx = posAxis.l2p(posCenter);

            let scale;
            if(trace.width) {
                scale = t.maxKDE / bdPos;
            } else {
                const groupStats = fullLayout._violinScaleGroupStats[trace.scalegroup];
                scale = trace.scalemode === 'count' ?
                    (groupStats.maxKDE / bdPos) * (groupStats.maxCount / d.pts.length) :
                    groupStats.maxKDE / bdPos;
            }

            let pathPos, pathNeg, path;
            let i, k, pts, pt;

            if(hasPositiveSide) {
                pts = new Array(len);
                for(i = 0; i < len; i++) {
                    pt = pts[i] = {};
                    pt[t.posLetter] = posCenter + (density[i].v / scale);
                    pt[t.valLetter] = valAxis.c2l(density[i].t, true);
                }
                pathPos = makePath(pts, trace);
            }

            if(hasNegativeSide) {
                pts = new Array(len);
                for(k = 0, i = len - 1; k < len; k++, i--) {
                    pt = pts[k] = {};
                    pt[t.posLetter] = posCenter - (density[i].v / scale);
                    pt[t.valLetter] = valAxis.c2l(density[i].t, true);
                }
                pathNeg = makePath(pts, trace);
            }

            if(hasBothSides) {
                path = pathPos + 'L' + pathNeg.slice(1) + 'Z';
            } else {
                const startPt = [posCenterPx, valAxis.c2p(density[0].t)];
                const endPt = [posCenterPx, valAxis.c2p(density[len - 1].t)];

                if(trace.orientation === 'h') {
                    startPt.reverse();
                    endPt.reverse();
                }

                if(hasPositiveSide) {
                    path = 'M' + startPt + 'L' + pathPos.slice(1) + 'L' + endPt;
                } else {
                    path = 'M' + endPt + 'L' + pathNeg.slice(1) + 'L' + startPt;
                }
            }
            pathSel.attr('d', path);

            // save a few things used in getPositionOnKdePath, getKdeValue
            // on hover and for meanline draw block below
            d.posCenterPx = posCenterPx;
            d.posDensityScale = scale * bdPos;
            d.path = pathSel.node();
            d.pathLength = d.path.getTotalLength() / (hasBothSides ? 2 : 1);
        });

        const boxAttrs = trace.box;
        const boxWidth = boxAttrs.width;
        const boxLineWidth = (boxAttrs.line || {}).width;
        let bdPosScaled;
        let bPosPxOffset;

        if(hasBothSides) {
            bdPosScaled = bdPos * boxWidth;
            bPosPxOffset = 0;
        } else if(hasPositiveSide) {
            bdPosScaled = [0, bdPos * boxWidth / 2];
            bPosPxOffset = boxLineWidth * {x: 1, y: -1}[t.posLetter];
        } else {
            bdPosScaled = [bdPos * boxWidth / 2, 0];
            bPosPxOffset = boxLineWidth * {x: -1, y: 1}[t.posLetter];
        }

        // inner box
        boxPlot.plotBoxAndWhiskers(plotGroup, {pos: posAxis, val: valAxis}, trace, {
            bPos: bPos,
            bdPos: bdPosScaled,
            bPosPxOffset: bPosPxOffset
        });

        // meanline insider box
        boxPlot.plotBoxMean(plotGroup, {pos: posAxis, val: valAxis}, trace, {
            bPos: bPos,
            bdPos: bdPosScaled,
            bPosPxOffset: bPosPxOffset
        });

        let fn;
        if(!trace.box.visible && trace.meanline.visible) {
            fn = Lib.identity;
        }

        // N.B. use different class name than boxPlot.plotBoxMean,
        // to avoid selectAll conflict
        const meanPaths = plotGroup.selectAll('path.meanline').data(fn || []);
        meanPaths.enter().append('path')
            .attr('class', 'meanline')
            .style('fill', 'none')
            .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke');
        meanPaths.exit().remove();
        meanPaths.each(function(this: any, d) {
            const v = valAxis.c2p(d.mean, true);
            const p = helpers.getPositionOnKdePath(d, trace, v);

            select(this).attr('d',
                trace.orientation === 'h' ?
                    'M' + v + ',' + p[0] + 'V' + p[1] :
                    'M' + p[0] + ',' + v + 'H' + p[1]
            );
        });

        boxPlot.plotPoints(plotGroup, {x: xa, y: ya}, trace, t);
    });
}
