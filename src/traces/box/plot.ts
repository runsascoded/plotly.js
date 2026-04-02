import type { FullAxis, FullTrace, GraphDiv, PlotInfo } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import { translatePoints } from '../../components/drawing/index.js';

// constants for dynamic jitter (ie less jitter for sparser points)
const JITTERCOUNT = 5; // points either side of this to include
const JITTERSPREAD = 0.01; // fraction of IQR to count as "dense"

function plot(gd: GraphDiv, plotinfo: PlotInfo, cdbox: any[], boxLayer: any): void {
    const isStatic = gd._context.staticPlot;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    Lib.makeTraceGroups(boxLayer, cdbox, 'trace boxes').each(function(this: any, cd: any) {
        const plotGroup = select(this);
        const cd0 = cd[0];
        const t = cd0.t;
        const trace = cd0.trace;

        // whisker width
        t.wdPos = t.bdPos * trace.whiskerwidth;

        if(trace.visible !== true || t.empty) {
            plotGroup.remove();
            return;
        }

        let posAxis, valAxis;

        if(trace.orientation === 'h') {
            posAxis = ya;
            valAxis = xa;
        } else {
            posAxis = xa;
            valAxis = ya;
        }

        plotBoxAndWhiskers(plotGroup, {pos: posAxis, val: valAxis}, trace, t, isStatic);
        plotPoints(plotGroup, {x: xa, y: ya}, trace, t);
        plotBoxMean(plotGroup, {pos: posAxis, val: valAxis}, trace, t);
    });
}

function plotBoxAndWhiskers(sel: any, axes: { pos: FullAxis; val: FullAxis }, trace: FullTrace, t: any, isStatic?: boolean): void {
    const isHorizontal = trace.orientation === 'h';
    const valAxis = axes.val;
    const posAxis = axes.pos;
    const posHasRangeBreaks = !!posAxis.rangebreaks;

    const bPos = t.bPos;
    const wdPos = t.wdPos || 0;
    const bPosPxOffset = t.bPosPxOffset || 0;
    const whiskerWidth = trace.whiskerwidth || 0;
    const showWhiskers = (trace.showwhiskers !== false);
    const notched = trace.notched || false;
    const nw = notched ? 1 - 2 * trace.notchwidth : 1;

    // to support for one-sided box
    let bdPos0;
    let bdPos1;
    if(Array.isArray(t.bdPos)) {
        bdPos0 = t.bdPos[0];
        bdPos1 = t.bdPos[1];
    } else {
        bdPos0 = t.bdPos;
        bdPos1 = t.bdPos;
    }

    const paths = sel.selectAll('path.box').data((
        trace.type !== 'violin' ||
        trace.box.visible
    ) ? Lib.identity : []);

    const pathsEnter = paths.enter().append('path')
        .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke')
        .attr('class', 'box');

    paths.exit().remove();

    paths.merge(pathsEnter).each(function(this: any, d: any) {
        if(d.empty) return select(this).attr('d', 'M0,0Z');

        const lcenter = posAxis.c2l(d.pos + bPos, true);

        const pos0 = posAxis.l2p(lcenter - bdPos0) + bPosPxOffset;
        const pos1 = posAxis.l2p(lcenter + bdPos1) + bPosPxOffset;
        const posc = posHasRangeBreaks ? (pos0 + pos1) / 2 : posAxis.l2p(lcenter) + bPosPxOffset;

        const r = trace.whiskerwidth;
        const posw0 = posHasRangeBreaks ? pos0 * r + (1 - r) * posc : posAxis.l2p(lcenter - wdPos) + bPosPxOffset;
        const posw1 = posHasRangeBreaks ? pos1 * r + (1 - r) * posc : posAxis.l2p(lcenter + wdPos) + bPosPxOffset;

        const posm0 = posAxis.l2p(lcenter - bdPos0 * nw) + bPosPxOffset;
        const posm1 = posAxis.l2p(lcenter + bdPos1 * nw) + bPosPxOffset;
        const sdmode = trace.sizemode === 'sd';
        const q1 = valAxis.c2p(sdmode ? d.mean - d.sd : d.q1, true);
        const q3 = sdmode ? valAxis.c2p(d.mean + d.sd, true) :
                          valAxis.c2p(d.q3, true);
        // make sure median isn't identical to either of the
        // quartiles, so we can see it
        const m = Lib.constrain(
            sdmode ? valAxis.c2p(d.mean, true) :
                     valAxis.c2p(d.med, true),
            Math.min(q1, q3) + 1, Math.max(q1, q3) - 1
        );

        // for compatibility with box, violin, and candlestick
        // perhaps we should put this into cd0.t instead so it's more explicit,
        // but what we have now is:
        // - box always has d.lf, but boxpoints can be anything
        // - violin has d.lf and should always use it (boxpoints is undefined)
        // - candlestick has only min/max
        const useExtremes = (d.lf === undefined) || (trace.boxpoints === false) || sdmode;
        const lf = valAxis.c2p(useExtremes ? d.min : d.lf, true);
        const uf = valAxis.c2p(useExtremes ? d.max : d.uf, true);
        const ln = valAxis.c2p(d.ln, true);
        const un = valAxis.c2p(d.un, true);

        if(isHorizontal) {
            select(this).attr('d',
                'M' + m + ',' + posm0 + 'V' + posm1 + // median line
                'M' + q1 + ',' + pos0 + 'V' + pos1 + // left edge
                (notched ?
                    'H' + ln + 'L' + m + ',' + posm1 + 'L' + un + ',' + pos1 :
                    ''
                ) + // top notched edge
                'H' + q3 + // end of the top edge
                'V' + pos0 + // right edge
                (notched ? 'H' + un + 'L' + m + ',' + posm0 + 'L' + ln + ',' + pos0 : '') + // bottom notched edge
                'Z' + // end of the box
                (showWhiskers ?
                    'M' + q1 + ',' + posc + 'H' + lf + 'M' + q3 + ',' + posc + 'H' + uf + // whiskers
                    (whiskerWidth === 0 ?
                        '' : // whisker caps
                        'M' + lf + ',' + posw0 + 'V' + posw1 + 'M' + uf + ',' + posw0 + 'V' + posw1
                    ) :
                    ''
                )
            );
        } else {
            select(this).attr('d',
                'M' + posm0 + ',' + m + 'H' + posm1 + // median line
                'M' + pos0 + ',' + q1 + 'H' + pos1 + // top of the box
                (notched ?
                    'V' + ln + 'L' + posm1 + ',' + m + 'L' + pos1 + ',' + un :
                    ''
                ) + // notched right edge
                'V' + q3 + // end of the right edge
                'H' + pos0 + // bottom of the box
                (notched ?
                    'V' + un + 'L' + posm0 + ',' + m + 'L' + pos0 + ',' + ln :
                    ''
                ) + // notched left edge
                'Z' + // end of the box
                (showWhiskers ?
                    'M' + posc + ',' + q1 + 'V' + lf + 'M' + posc + ',' + q3 + 'V' + uf + // whiskers
                    (whiskerWidth === 0 ?
                        '' : // whisker caps
                        'M' + posw0 + ',' + lf + 'H' + posw1 + 'M' + posw0 + ',' + uf + 'H' + posw1
                    ) :
                    ''
                )
            );
        }
    });
}

function plotPoints(sel: any, axes: { x: FullAxis; y: FullAxis }, trace: FullTrace, t: any): any {
    const xa = axes.x;
    const ya = axes.y;
    const bdPos = t.bdPos;
    const bPos = t.bPos;

    // to support violin points
    const mode = trace.boxpoints || trace.points;

    // repeatable pseudo-random number generator
    Lib.seedPseudoRandom();

    // since box plot points get an extra level of nesting, each
    // box needs the trace styling info
    const fn = function(d: any) {
        d.forEach((v: any) => {
            v.t = t;
            v.trace = trace;
        });
        return d;
    };

    const gPoints = sel.selectAll('g.points')
        .data(mode ? fn : []);

    const gPointsEnter = gPoints.enter().append('g')
        .attr('class', 'points');

    gPoints.exit().remove();

    const paths = gPoints.merge(gPointsEnter).selectAll('path')
        .data(function(d: any) {
            let i;
            const pts = d.pts2;

            // normally use IQR, but if this is 0 or too small, use max-min
            const typicalSpread = Math.max((d.max - d.min) / 10, d.q3 - d.q1);
            const minSpread = typicalSpread * 1e-9;
            const spreadLimit = typicalSpread * JITTERSPREAD;
            let jitterFactors: any[] = [];
            let maxJitterFactor = 0;
            let newJitter: any;

            // dynamic jitter
            if(trace.jitter) {
                if(typicalSpread === 0) {
                    // edge case of no spread at all: fall back to max jitter
                    maxJitterFactor = 1;
                    jitterFactors = new Array(pts.length);
                    for(i = 0; i < pts.length; i++) {
                        jitterFactors[i] = 1;
                    }
                } else {
                    for(i = 0; i < pts.length; i++) {
                        const i0 = Math.max(0, i - JITTERCOUNT);
                        let pmin = pts[i0].v;
                        const i1 = Math.min(pts.length - 1, i + JITTERCOUNT);
                        let pmax = pts[i1].v;

                        if(mode !== 'all') {
                            if(pts[i].v < d.lf) pmax = Math.min(pmax, d.lf);
                            else pmin = Math.max(pmin, d.uf);
                        }

                        let jitterFactor = Math.sqrt(spreadLimit * (i1 - i0) / (pmax - pmin + minSpread)) || 0;
                        jitterFactor = Lib.constrain(Math.abs(jitterFactor), 0, 1);

                        jitterFactors.push(jitterFactor);
                        maxJitterFactor = Math.max(jitterFactor, maxJitterFactor);
                    }
                }
                newJitter = trace.jitter * 2 / (maxJitterFactor || 1);
            }

            // fills in 'x' and 'y' in calcdata 'pts' item
            for(i = 0; i < pts.length; i++) {
                const pt = pts[i];
                const v = pt.v;

                const jitterOffset = trace.jitter ?
                    (newJitter * jitterFactors[i] * (Lib.pseudoRandom() - 0.5)) :
                    0;

                const posPx = d.pos + bPos + bdPos * (trace.pointpos + jitterOffset);

                if(trace.orientation === 'h') {
                    pt.y = posPx;
                    pt.x = v;
                } else {
                    pt.x = posPx;
                    pt.y = v;
                }

                // tag suspected outliers
                if(mode === 'suspectedoutliers' && v < d.uo && v > d.lo) {
                    pt.so = true;
                }
            }

            return pts;
        });

    const pointsEnter = paths.enter().append('path')
        .classed('point', true);

    paths.exit().remove();

    paths.merge(pointsEnter).call(translatePoints, xa, ya);
}

function plotBoxMean(sel: any, axes: { pos: FullAxis; val: FullAxis }, trace: FullTrace, t: any): void {
    const valAxis = axes.val;
    const posAxis = axes.pos;
    const posHasRangeBreaks = !!posAxis.rangebreaks;

    const bPos = t.bPos;
    const bPosPxOffset = t.bPosPxOffset || 0;

    // to support violin mean lines
    const mode = trace.boxmean || (trace.meanline || {}).visible;

    // to support for one-sided box
    let bdPos0;
    let bdPos1;
    if(Array.isArray(t.bdPos)) {
        bdPos0 = t.bdPos[0];
        bdPos1 = t.bdPos[1];
    } else {
        bdPos0 = t.bdPos;
        bdPos1 = t.bdPos;
    }

    const paths = sel.selectAll('path.mean').data((
        (trace.type === 'box' && trace.boxmean) ||
        (trace.type === 'violin' && trace.box.visible && trace.meanline.visible)
    ) ? Lib.identity : []);

    const meanEnter = paths.enter().append('path')
        .attr('class', 'mean')
        .style('fill', 'none')
        .style('vector-effect', 'non-scaling-stroke');

    paths.exit().remove();

    paths.merge(meanEnter).each(function(this: any, d: any) {
        const lcenter = posAxis.c2l(d.pos + bPos, true);

        const pos0 = posAxis.l2p(lcenter - bdPos0) + bPosPxOffset;
        const pos1 = posAxis.l2p(lcenter + bdPos1) + bPosPxOffset;
        const posc = posHasRangeBreaks ? (pos0 + pos1) / 2 : posAxis.l2p(lcenter) + bPosPxOffset;

        const m = valAxis.c2p(d.mean, true);
        const sl = valAxis.c2p(d.mean - d.sd, true);
        const sh = valAxis.c2p(d.mean + d.sd, true);

        if(trace.orientation === 'h') {
            select(this).attr('d',
                'M' + m + ',' + pos0 + 'V' + pos1 +
                (mode === 'sd' ?
                    'm0,0L' + sl + ',' + posc + 'L' + m + ',' + pos0 + 'L' + sh + ',' + posc + 'Z' :
                    '')
            );
        } else {
            select(this).attr('d',
                'M' + pos0 + ',' + m + 'H' + pos1 +
                (mode === 'sd' ?
                    'm0,0L' + posc + ',' + sl + 'L' + pos0 + ',' + m + 'L' + posc + ',' + sh + 'Z' :
                    '')
            );
        }
    });
}

export default {
    plot: plot,
    plotBoxAndWhiskers: plotBoxAndWhiskers,
    plotPoints: plotPoints,
    plotBoxMean: plotBoxMean
};
