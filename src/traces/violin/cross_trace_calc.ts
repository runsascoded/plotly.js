import type { GraphDiv, PlotInfo } from '../../../types/core';
import _cross_trace_calc from '../box/cross_trace_calc.js';
const { setPositionOffset } = _cross_trace_calc;
var orientations = ['v', 'h'];

export default function crossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): void {
    var calcdata = gd.calcdata;
    var xa = plotinfo.xaxis;
    var ya = plotinfo.yaxis;

    for(var i = 0; i < orientations.length; i++) {
        var orientation = orientations[i];
        var posAxis = orientation === 'h' ? ya : xa;
        var violinList = [];

        for(var j = 0; j < calcdata.length; j++) {
            var cd = calcdata[j];
            var t = cd[0].t;
            var trace = cd[0].trace;

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
