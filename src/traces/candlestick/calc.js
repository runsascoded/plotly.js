import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import { calcCommon } from '../ohlc/calc.js';

export default function(gd, trace) {
    var fullLayout = gd._fullLayout;
    var xa = Axes.getFromId(gd, trace.xaxis);
    var ya = Axes.getFromId(gd, trace.yaxis);

    var origX = xa.makeCalcdata(trace, 'x');
    var x = alignPeriod(trace, xa, 'x', origX).vals;

    var cd = calcCommon(gd, trace, origX, x, ya, ptFunc);

    if(cd.length) {
        Lib.extendFlat(cd[0].t, {
            num: fullLayout._numBoxes,
            dPos: Lib.distinctVals(x).minDiff / 2,
            posLetter: 'x',
            valLetter: 'y',
        });

        fullLayout._numBoxes++;
        return cd;
    } else {
        return [{t: {empty: true}}];
    }
}

function ptFunc(o, h, l, c) {
    return {
        min: l,
        q1: Math.min(o, c),
        med: c,
        q3: Math.max(o, c),
        max: h,
    };
}
