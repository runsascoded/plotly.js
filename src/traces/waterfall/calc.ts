import type { FullTrace, GraphDiv } from '../../../types/core';
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

export default function calc(gd: GraphDiv,  trace: FullTrace) {
    var xa = Axes.getFromId(gd, trace.xaxis || 'x');
    var ya = Axes.getFromId(gd, trace.yaxis || 'y');
    var size, pos, origPos, pObj, hasPeriod, pLetter;

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
    var serieslen = Math.min(pos.length, size.length);
    var cd = new Array(serieslen);

    // set position and size (as well as for waterfall total size)
    var previousSum = 0;
    var newSize;
    // trace-wide flags
    var hasTotals = false;

    for(var i = 0; i < serieslen; i++) {
        var amount = size[i] || 0;

        var connectToNext = false;
        if(size[i] !== BADNUM || isTotal(trace.measure[i]) || isAbsolute(trace.measure[i])) {
            if(i + 1 < serieslen && (size[i + 1] !== BADNUM || isTotal(trace.measure[i + 1]) || isAbsolute(trace.measure[i + 1]))) {
                connectToNext = true;
            }
        }

        var cdi: any = cd[i] = {
            i: i,
            p: pos[i],
            s: amount,
            rawS: amount,
            cNext: connectToNext
        } as any;

        if(isAbsolute(trace.measure[i])) {
            previousSum = cdi.s;

            cdi.isSum = true;
            cdi.dir = 'totals';
            cdi.s = previousSum;
        } else if(isTotal(trace.measure[i])) {
            cdi.isSum = true;
            cdi.dir = 'totals';
            cdi.s = previousSum;
        } else {
            // default: relative
            cdi.isSum = false;
            cdi.dir = cdi.rawS < 0 ? 'decreasing' : 'increasing';
            newSize = cdi.s;
            cdi.s = previousSum + newSize;
            previousSum += newSize;
        }

        if(cdi.dir === 'totals') {
            hasTotals = true;
        }

        if(hasPeriod) {
            cd[i].orig_p = origPos[i]; // used by hover
            cd[i][pLetter + 'End'] = pObj.ends[i];
            cd[i][pLetter + 'Start'] = pObj.starts[i];
        }

        if(trace.ids) {
            cdi.id = String(trace.ids[i]);
        }

        cdi.v = (trace.base || 0) + previousSum;
    }

    if(cd.length) cd[0].hasTotals = hasTotals;

    mergeArray(trace.text, cd, 'tx');
    mergeArray(trace.hovertext, cd, 'htx');
    calcSelection(cd, trace);

    return cd;
}
