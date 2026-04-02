import type { FullTrace, GraphDiv } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import arraysToCalcdata from './arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function calc(gd: GraphDiv,  trace: FullTrace) {
    const xa = Axes.getFromId(gd, trace.xaxis || 'x');
    const ya = Axes.getFromId(gd, trace.yaxis || 'y');
    let size, pos, origPos, pObj, hasPeriod, pLetter, i, cdi: any;

    if(trace.orientation === 'h') {
        size = xa.makeCalcdata(trace, 'x');
        origPos = ya.makeCalcdata(trace, 'y');
        pObj = alignPeriod(trace, ya, 'y', origPos);
        hasPeriod = !!trace.yperiodalignment;
        pLetter = 'y';
    } else {
        size = ya.makeCalcdata(trace, 'y');
        origPos = xa.makeCalcdata(trace, 'x');
        pObj = alignPeriod(trace, xa, 'x', origPos);
        hasPeriod = !!trace.xperiodalignment;
        pLetter = 'x';
    }
    pos = pObj.vals;

    // create the "calculated data" to plot
    const serieslen = Math.min(pos.length, size.length);
    const cd = new Array(serieslen);

    // Unlike other bar-like traces funnels do not support base attribute.
    // bases for funnels are computed internally in a way that
    // the mid-point of each bar are located on the axis line.
    trace._base = [];

    // set position and size
    for(i = 0; i < serieslen; i++) {
        // treat negative values as bad numbers
        if(size[i] < 0) size[i] = BADNUM;

        let connectToNext = false;
        if(size[i] !== BADNUM) {
            if(i + 1 < serieslen && size[i + 1] !== BADNUM) {
                connectToNext = true;
            }
        }

        cdi = cd[i] = {
            p: pos[i],
            s: size[i],
            cNext: connectToNext
        };

        trace._base[i] = -0.5 * cdi.s;

        if(hasPeriod) {
            cd[i].orig_p = origPos[i]; // used by hover
            cd[i][pLetter + 'End'] = pObj.ends[i];
            cd[i][pLetter + 'Start'] = pObj.starts[i];
        }

        if(trace.ids) {
            cdi.id = String(trace.ids[i]);
        }

        // calculate total values
        if(i === 0) cd[0].vTotal = 0;
        cd[0].vTotal += fixNum(cdi.s);

        // ratio from initial value
        cdi.begR = fixNum(cdi.s) / fixNum(cd[0].s);
    }

    let prevGoodNum;
    for(i = 0; i < serieslen; i++) {
        cdi = cd[i];
        if(cdi.s === BADNUM) continue;

        // ratio of total value
        cdi.sumR = cdi.s / cd[0].vTotal;

        // ratio of previous (good) value
        cdi.difR = (prevGoodNum !== undefined) ? cdi.s / prevGoodNum : 1;

        prevGoodNum = cdi.s;
    }

    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);

    return cd;
}

function fixNum(a: any) {
    return (a === BADNUM) ? 0 : a;
}
