import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import _index from '../../lib/index.js';
const { mergeArray } = _index;
import calcSelection from '../scatter/calc_selection.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
function isAbsolute(a) {
    return (a === 'a' || a === 'absolute');
}
function isTotal(a) {
    return (a === 't' || a === 'total');
}
export default function calc(gd, trace) {
    const xa = Axes.getFromId(gd, trace.xaxis || 'x');
    const ya = Axes.getFromId(gd, trace.yaxis || 'y');
    let size, pos, origPos, pObj, hasPeriod, pLetter;
    if (trace.orientation === 'h') {
        size = xa.makeCalcdata(trace, 'x');
        origPos = ya.makeCalcdata(trace, 'y');
        pObj = alignPeriod(trace, ya, 'y', origPos);
        hasPeriod = !!trace.yperiodalignment;
        pLetter = 'y';
    }
    else {
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
    // set position and size (as well as for waterfall total size)
    let previousSum = 0;
    let newSize;
    // trace-wide flags
    let hasTotals = false;
    for (let i = 0; i < serieslen; i++) {
        const amount = size[i] || 0;
        let connectToNext = false;
        if (size[i] !== BADNUM || isTotal(trace.measure[i]) || isAbsolute(trace.measure[i])) {
            if (i + 1 < serieslen && (size[i + 1] !== BADNUM || isTotal(trace.measure[i + 1]) || isAbsolute(trace.measure[i + 1]))) {
                connectToNext = true;
            }
        }
        const cdi = cd[i] = {
            i: i,
            p: pos[i],
            s: amount,
            rawS: amount,
            cNext: connectToNext
        };
        if (isAbsolute(trace.measure[i])) {
            previousSum = cdi.s;
            cdi.isSum = true;
            cdi.dir = 'totals';
            cdi.s = previousSum;
        }
        else if (isTotal(trace.measure[i])) {
            cdi.isSum = true;
            cdi.dir = 'totals';
            cdi.s = previousSum;
        }
        else {
            // default: relative
            cdi.isSum = false;
            cdi.dir = cdi.rawS < 0 ? 'decreasing' : 'increasing';
            newSize = cdi.s;
            cdi.s = previousSum + newSize;
            previousSum += newSize;
        }
        if (cdi.dir === 'totals') {
            hasTotals = true;
        }
        if (hasPeriod) {
            cd[i].orig_p = origPos[i]; // used by hover
            cd[i][pLetter + 'End'] = pObj.ends[i];
            cd[i][pLetter + 'Start'] = pObj.starts[i];
        }
        if (trace.ids) {
            cdi.id = String(trace.ids[i]);
        }
        cdi.v = (trace.base || 0) + previousSum;
    }
    if (cd.length)
        cd[0].hasTotals = hasTotals;
    mergeArray(trace.text, cd, 'tx');
    mergeArray(trace.hovertext, cd, 'htx');
    calcSelection(cd, trace);
    return cd;
}
