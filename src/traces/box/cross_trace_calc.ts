import type { FullAxis, GraphDiv, PlotInfo } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import { getAxisGroup } from '../../plots/cartesian/constraints.js';

const orientations = ['v', 'h'];

function crossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): void {
    const calcdata = gd.calcdata;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    for(let i = 0; i < orientations.length; i++) {
        const orientation = orientations[i];
        const posAxis = orientation === 'h' ? ya : xa;
        const boxList: any[] = [];

        // make list of boxes / candlesticks
        // For backward compatibility, candlesticks are treated as if they *are* box traces here
        for(let j = 0; j < calcdata.length; j++) {
            const cd = calcdata[j];
            const t = cd[0].t;
            const trace = cd[0].trace;

            if(trace.visible === true &&
                    (trace.type === 'box' || trace.type === 'candlestick') &&
                    !t.empty &&
                    (trace.orientation || 'v') === orientation &&
                    trace.xaxis === xa._id &&
                    trace.yaxis === ya._id
              ) {
                boxList.push(j);
            }
        }

        setPositionOffset('box', gd, boxList, posAxis);
    }
}

function setPositionOffset(traceType: string, gd: GraphDiv, boxList: number[], posAxis: FullAxis): void {
    const calcdata = gd.calcdata;
    const fullLayout = gd._fullLayout;
    const axId = posAxis._id;
    const axLetter = axId.charAt(0);

    let i, j, calcTrace;
    const pointList: any[] = [];
    let shownPts = 0;

    // make list of box points
    for(i = 0; i < boxList.length; i++) {
        calcTrace = calcdata[boxList[i]];
        for(j = 0; j < calcTrace.length; j++) {
            pointList.push(posAxis.c2l(calcTrace[j].pos, true));
            shownPts += (calcTrace[j].pts2 || []).length;
        }
    }

    if(!pointList.length) return;

    // box plots - update dPos based on multiple traces
    const boxdv = Lib.distinctVals(pointList);
    if(posAxis.type === 'category' || posAxis.type === 'multicategory') {
        boxdv.minDiff = 1;
    }

    const dPos0 = boxdv.minDiff / 2;

    // check for forced minimum dtick
    Axes.minDtick(posAxis, boxdv.minDiff, boxdv.vals[0], true);

    const numKey = traceType === 'violin' ? '_numViolins' : '_numBoxes';
    const numTotal = fullLayout[numKey];
    const group = fullLayout[traceType + 'mode'] === 'group' && numTotal > 1;
    const groupFraction = 1 - fullLayout[traceType + 'gap'];
    const groupGapFraction = 1 - fullLayout[traceType + 'groupgap'];

    for(i = 0; i < boxList.length; i++) {
        calcTrace = calcdata[boxList[i]];

        const trace = calcTrace[0].trace;
        const t = calcTrace[0].t;
        const width = trace.width;
        const side = trace.side;

        // position coordinate delta
        let dPos;
        // box half width;
        let bdPos;
        // box center offset
        let bPos;
        // half-width within which to accept hover for this box/violin
        // always split the distance to the closest box/violin
        let wHover;

        if(width) {
            dPos = bdPos = wHover = width / 2;
            bPos = 0;
        } else {
            dPos = dPos0;

            if(group) {
                const groupId = getAxisGroup(fullLayout, posAxis._id) + trace.orientation;
                const alignmentGroups = fullLayout._alignmentOpts[groupId] || {};
                const alignmentGroupOpts = alignmentGroups[trace.alignmentgroup] || {};
                const nOffsetGroups = Object.keys(alignmentGroupOpts.offsetGroups || {}).length;
                const num = nOffsetGroups || numTotal;
                const shift = nOffsetGroups ? trace._offsetIndex : t.num;

                bdPos = dPos * groupFraction * groupGapFraction / num;
                bPos = 2 * dPos * (-0.5 + (shift + 0.5) / num) * groupFraction;
                wHover = dPos * groupFraction / num;
            } else {
                bdPos = dPos * groupFraction * groupGapFraction;
                bPos = 0;
                wHover = dPos;
            }
        }
        t.dPos = dPos;
        t.bPos = bPos;
        t.bdPos = bdPos;
        t.wHover = wHover;

        // box/violin-only value-space push value
        let pushplus;
        let pushminus;
        // edge of box/violin
        const edge = bPos + bdPos;
        let edgeplus;
        let edgeminus: any;
        // value-space padding
        let vpadplus;
        let vpadminus;
        // pixel-space padding
        let ppadplus;
        let ppadminus;
        // do we add 5% of both sides (more logic for points beyond box/violin below)
        let padded = Boolean(width);
        // does this trace show points?
        const hasPts = (trace.boxpoints || trace.points) && (shownPts > 0);

        if(side === 'positive') {
            pushplus = dPos * (width ? 1 : 0.5);
            edgeplus = edge;
            pushminus = edgeplus = bPos;
        } else if(side === 'negative') {
            pushplus = edgeplus = bPos;
            pushminus = dPos * (width ? 1 : 0.5);
            edgeminus = edge;
        } else {
            pushplus = pushminus = dPos;
            edgeplus = edgeminus = edge;
        }

        if(hasPts) {
            const pointpos = trace.pointpos;
            const jitter = trace.jitter;
            const ms = trace.marker.size / 2;

            let pp = 0;
            if((pointpos + jitter) >= 0) {
                pp = edge * (pointpos + jitter);
                if(pp > pushplus) {
                    // (++) beyond plus-value, use pp
                    padded = true;
                    ppadplus = ms;
                    vpadplus = pp;
                } else if(pp > edgeplus) {
                    // (+), use push-value (it's bigger), but add px-pad
                    ppadplus = ms;
                    vpadplus = pushplus;
                }
            }
            if(pp <= pushplus) {
                // (->) fallback to push value
                vpadplus = pushplus;
            }

            let pm = 0;
            if((pointpos - jitter) <= 0) {
                pm = -edge * (pointpos - jitter);
                if(pm > pushminus) {
                    // (--) beyond plus-value, use pp
                    padded = true;
                    ppadminus = ms;
                    vpadminus = pm;
                } else if(pm > edgeminus) {
                    // (-), use push-value (it's bigger), but add px-pad
                    ppadminus = ms;
                    vpadminus = pushminus;
                }
            }
            if(pm <= pushminus) {
                // (<-) fallback to push value
                vpadminus = pushminus;
            }
        } else {
            vpadplus = pushplus;
            vpadminus = pushminus;
        }

        const pos = new Array(calcTrace.length);
        for(j = 0; j < calcTrace.length; j++) {
            pos[j] = calcTrace[j].pos;
        }

        trace._extremes[axId] = Axes.findExtremes(posAxis, pos, {
            padded: padded,
            vpadminus: vpadminus,
            vpadplus: vpadplus,
            vpadLinearized: true,
            // N.B. SVG px-space positive/negative
            ppadminus: {x: ppadminus, y: ppadplus}[axLetter],
            ppadplus: {x: ppadplus, y: ppadminus}[axLetter],
        });
    }
}

export default {
    crossTraceCalc: crossTraceCalc,
    setPositionOffset: setPositionOffset
};
