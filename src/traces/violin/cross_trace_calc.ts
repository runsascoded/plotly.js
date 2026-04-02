import type { GraphDiv, PlotInfo } from '../../../types/core';
import _cross_trace_calc from '../box/cross_trace_calc.js';
const { setPositionOffset } = _cross_trace_calc;
const orientations = ['v', 'h'];

export default function crossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): void {
    const calcdata = gd.calcdata;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    for(let i = 0; i < orientations.length; i++) {
        const orientation = orientations[i];
        const posAxis = orientation === 'h' ? ya : xa;
        const violinList: any[] = [];

        for(let j = 0; j < calcdata.length; j++) {
            const cd = calcdata[j];
            const t = cd[0].t;
            const trace = cd[0].trace;

            if(trace.visible === true && trace.type === 'violin' &&
                    !t.empty &&
                    trace.orientation === orientation &&
                    trace.xaxis === xa._id &&
                    trace.yaxis === ya._id
              ) {
                violinList.push(j);
            }
        }

        setPositionOffset('violin', gd, violinList, posAxis);
    }
}
