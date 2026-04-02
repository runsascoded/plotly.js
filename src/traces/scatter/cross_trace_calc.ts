import type { GraphDiv, PlotInfo } from '../../../types/core';
import calc from './calc.js';
import _cross_trace_calc from '../bar/cross_trace_calc.js';
const { setGroupPositions } = _cross_trace_calc;

function groupCrossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): void {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    const fullLayout = gd._fullLayout;
    const fullTraces = gd._fullData;
    const calcTraces = gd.calcdata;
    const calcTracesHorz: any[] = [];
    const calcTracesVert: any[] = [];

    for(let i = 0; i < fullTraces.length; i++) {
        const fullTrace = fullTraces[i];
        if(
            fullTrace.visible === true &&
            fullTrace.type === 'scatter' &&
            fullTrace.xaxis === xa._id &&
            fullTrace.yaxis === ya._id
        ) {
            if(fullTrace.orientation === 'h') {
                calcTracesHorz.push(calcTraces[i]);
            } else if(fullTrace.orientation === 'v') { // check for v since certain scatter traces may not have an orientation
                calcTracesVert.push(calcTraces[i]);
            }
        }
    }

    const opts = {
        mode: fullLayout.scattermode,
        gap: fullLayout.scattergap
    };

    setGroupPositions(gd, xa, ya, calcTracesVert, opts);
    setGroupPositions(gd, ya, xa, calcTracesHorz, opts);
}

export default function crossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): any {
    if(gd._fullLayout.scattermode === 'group') {
        groupCrossTraceCalc(gd, plotinfo);
    }

    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;
    const subplot = xa._id + ya._id;

    const subplotStackOpts = gd._fullLayout._scatterStackOpts[subplot];
    if(!subplotStackOpts) return;

    const calcTraces = gd.calcdata;

    let i, j, k, i2, cd, cd0, posj, sumj, norm;
    let groupOpts, interpolate, groupnorm, posAttr, valAttr;
    let hasAnyBlanks;

    for(const stackGroup in subplotStackOpts) {
        groupOpts = subplotStackOpts[stackGroup];
        const indices = groupOpts.traceIndices;

        // can get here with no indices if the stack axis is non-numeric
        if(!indices.length) continue;

        interpolate = groupOpts.stackgaps === 'interpolate';
        groupnorm = groupOpts.groupnorm;
        if(groupOpts.orientation === 'v') {
            posAttr = 'x';
            valAttr = 'y';
        } else {
            posAttr = 'y';
            valAttr = 'x';
        }
        hasAnyBlanks = new Array(indices.length);
        for(i = 0; i < hasAnyBlanks.length; i++) {
            hasAnyBlanks[i] = false;
        }

        // Collect the complete set of all positions across ALL traces.
        // Start with the first trace, then interleave items from later traces
        // as needed.
        // Fill in mising items as we go.
        cd0 = calcTraces[indices[0]];
        const allPositions = new Array(cd0.length);
        for(i = 0; i < cd0.length; i++) {
            allPositions[i] = cd0[i][posAttr];
        }

        for(i = 1; i < indices.length; i++) {
            cd = calcTraces[indices[i]];

            for(j = k = 0; j < cd.length; j++) {
                posj = cd[j][posAttr];
                for(; posj > allPositions[k] && k < allPositions.length; k++) {
                    // the current trace is missing a position from some previous trace(s)
                    insertBlank(cd, j, allPositions[k], i, hasAnyBlanks, interpolate, posAttr);
                    j++;
                }
                if(posj !== allPositions[k]) {
                    // previous trace(s) are missing a position from the current trace
                    for(i2 = 0; i2 < i; i2++) {
                        insertBlank(calcTraces[indices[i2]], k, posj, i2, hasAnyBlanks, interpolate, posAttr);
                    }
                    allPositions.splice(k, 0, posj);
                }
                k++;
            }
            for(; k < allPositions.length; k++) {
                insertBlank(cd, j, allPositions[k], i, hasAnyBlanks, interpolate, posAttr);
                j++;
            }
        }

        const serieslen = allPositions.length;

        // stack (and normalize)!
        for(j = 0; j < cd0.length; j++) {
            sumj = cd0[j][valAttr] = cd0[j].s;
            for(i = 1; i < indices.length; i++) {
                cd = calcTraces[indices[i]];
                cd[0].trace._rawLength = cd[0].trace._length;
                cd[0].trace._length = serieslen;
                sumj += cd[j].s;
                cd[j][valAttr] = sumj;
            }

            if(groupnorm) {
                norm = ((groupnorm === 'fraction') ? sumj : (sumj / 100)) || 1;
                for(i = 0; i < indices.length; i++) {
                    const cdj = calcTraces[indices[i]][j];
                    cdj[valAttr] /= norm;
                    cdj.sNorm = cdj.s / norm;
                }
            }
        }

        // autorange
        for(i = 0; i < indices.length; i++) {
            cd = calcTraces[indices[i]];
            const trace = cd[0].trace;
            let ppad = calc.calcMarkerSize(trace, trace._rawLength);
            const arrayPad = Array.isArray(ppad);
            if((ppad && hasAnyBlanks[i]) || arrayPad) {
                const ppadRaw = ppad;
                ppad = new Array(serieslen);
                for(j = 0; j < serieslen; j++) {
                    ppad[j] = cd[j].gap ? 0 : (arrayPad ? ppadRaw[cd[j].i] : ppadRaw);
                }
            }
            const x = new Array(serieslen);
            const y = new Array(serieslen);
            for(j = 0; j < serieslen; j++) {
                x[j] = cd[j].x;
                y[j] = cd[j].y;
            }
            calc.calcAxisExpansion(gd, trace, xa, ya, x, y, ppad);

            // while we're here (in a loop over all traces in the stack)
            // record the orientation, so hover can find it easily
            cd[0].t.orientation = groupOpts.orientation;
        }
    }
}

function insertBlank(calcTrace: any[], index: number, position: number, traceIndex: number, hasAnyBlanks: boolean[], interpolate: boolean, posAttr: string): void {
    hasAnyBlanks[traceIndex] = true;
    const newEntry: any = {
        i: null,
        gap: true,
        s: 0
    };
    newEntry[posAttr] = position;
    calcTrace.splice(index, 0, newEntry);
    // Even if we're not interpolating, if one trace has multiple
    // values at the same position and this trace only has one value there,
    // we just duplicate that one value rather than insert a zero.
    // We also make it look like a real point - because it's ambiguous which
    // one really is the real one!
    if(index && position === calcTrace[index - 1][posAttr]) {
        const prevEntry = calcTrace[index - 1];
        newEntry.s = prevEntry.s;
        // TODO is it going to cause any problems to have multiple
        // calcdata points with the same index?
        newEntry.i = prevEntry.i;
        newEntry.gap = prevEntry.gap;
    } else if(interpolate) {
        newEntry.s = getInterp(calcTrace, index, position, posAttr);
    }
    if(!index) {
        // t and trace need to stay on the first cd entry
        calcTrace[0].t = calcTrace[1].t;
        calcTrace[0].trace = calcTrace[1].trace;
        delete calcTrace[1].t;
        delete calcTrace[1].trace;
    }
}

function getInterp(calcTrace: any[], index: number, position: number, posAttr: string): number {
    const pt0 = calcTrace[index - 1];
    const pt1 = calcTrace[index + 1];
    if(!pt1) return pt0.s;
    if(!pt0) return pt1.s;
    return pt0.s + (pt1.s - pt0.s) * (position - pt0[posAttr]) / (pt1[posAttr] - pt0[posAttr]);
}
