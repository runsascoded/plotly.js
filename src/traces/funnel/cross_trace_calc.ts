import type { GraphDiv, PlotInfo } from '../../../types/core';
import _cross_trace_calc from '../bar/cross_trace_calc.js';
const { setGroupPositions } = _cross_trace_calc;

export default function crossTraceCalc(gd: GraphDiv,  plotinfo: PlotInfo) {
    const fullLayout = gd._fullLayout;
    const fullData = gd._fullData;
    const calcdata = gd.calcdata;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;
    const funnels = [];
    const funnelsVert = [];
    const funnelsHorz = [];
    let cd, i;

    for(i = 0; i < fullData.length; i++) {
        const fullTrace = fullData[i];
        const isHorizontal = (fullTrace.orientation === 'h');

        if(
            fullTrace.visible === true &&
            fullTrace.xaxis === xa._id &&
            fullTrace.yaxis === ya._id &&
            fullTrace.type === 'funnel'
        ) {
            cd = calcdata[i];

            if(isHorizontal) {
                funnelsHorz.push(cd);
            } else {
                funnelsVert.push(cd);
            }

            funnels.push(cd);
        }
    }

    const opts = {
        mode: fullLayout.funnelmode,
        norm: fullLayout.funnelnorm,
        gap: fullLayout.funnelgap,
        groupgap: fullLayout.funnelgroupgap
    };

    setGroupPositions(gd, xa, ya, funnelsVert, opts);
    setGroupPositions(gd, ya, xa, funnelsHorz, opts);

    for(i = 0; i < funnels.length; i++) {
        cd = funnels[i];

        for(let j = 0; j < cd.length; j++) {
            if(j + 1 < cd.length) {
                cd[j].nextP0 = cd[j + 1].p0;
                cd[j].nextS0 = cd[j + 1].s0;

                cd[j].nextP1 = cd[j + 1].p1;
                cd[j].nextS1 = cd[j + 1].s1;
            }
        }
    }
}
