import type { GraphDiv, PlotInfo } from '../../../types/core';
import _cross_trace_calc from '../bar/cross_trace_calc.js';
const { setGroupPositions } = _cross_trace_calc;

export default function crossTraceCalc(gd: GraphDiv,  plotinfo: PlotInfo) {
    const fullLayout = gd._fullLayout;
    const fullData = gd._fullData;
    const calcdata = gd.calcdata;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;
    const waterfalls = [];
    const waterfallsVert = [];
    const waterfallsHorz = [];
    let cd, i;

    for(i = 0; i < fullData.length; i++) {
        const fullTrace = fullData[i];

        if(
            fullTrace.visible === true &&
            fullTrace.xaxis === xa._id &&
            fullTrace.yaxis === ya._id &&
            fullTrace.type === 'waterfall'
        ) {
            cd = calcdata[i];

            if(fullTrace.orientation === 'h') {
                waterfallsHorz.push(cd);
            } else {
                waterfallsVert.push(cd);
            }

            waterfalls.push(cd);
        }
    }

    const opts = {
        mode: fullLayout.waterfallmode,
        norm: fullLayout.waterfallnorm,
        gap: fullLayout.waterfallgap,
        groupgap: fullLayout.waterfallgroupgap
    };

    setGroupPositions(gd, xa, ya, waterfallsVert, opts);
    setGroupPositions(gd, ya, xa, waterfallsHorz, opts);

    for(i = 0; i < waterfalls.length; i++) {
        cd = waterfalls[i];

        for(let j = 0; j < cd.length; j++) {
            const di = cd[j];

            if(di.isSum === false) {
                di.s0 += (j === 0) ? 0 : cd[j - 1].s;
            }

            if(j + 1 < cd.length) {
                cd[j].nextP0 = cd[j + 1].p0;
                cd[j].nextS0 = cd[j + 1].s0;
            }
        }
    }
}
