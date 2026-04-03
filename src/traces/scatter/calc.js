import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray, pushUnique, sort } from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import subTypes from './subtypes.js';
import calcColorscale from './colorscale_calc.js';
import arraysToCalcdata from './arrays_to_calcdata.js';
import calcSelection from './calc_selection.js';
function calc(gd, trace) {
    const fullLayout = gd._fullLayout;
    const xa = trace._xA = Axes.getFromId(gd, trace.xaxis || 'x', 'x');
    const ya = trace._yA = Axes.getFromId(gd, trace.yaxis || 'y', 'y');
    const origX = xa.makeCalcdata(trace, 'x');
    const origY = ya.makeCalcdata(trace, 'y');
    const xObj = alignPeriod(trace, xa, 'x', origX);
    const yObj = alignPeriod(trace, ya, 'y', origY);
    const x = xObj.vals;
    const y = yObj.vals;
    const serieslen = trace._length;
    const cd = new Array(serieslen);
    const ids = trace.ids;
    const stackGroupOpts = getStackOpts(trace, fullLayout, xa, ya);
    let interpolateGaps = false;
    let isV, i, j, k, interpolate, vali;
    setFirstScatter(fullLayout, trace);
    let xAttr = 'x';
    let yAttr = 'y';
    let posAttr;
    if (stackGroupOpts) {
        pushUnique(stackGroupOpts.traceIndices, trace.index);
        isV = stackGroupOpts.orientation === 'v';
        // size, like we use for bar
        if (isV) {
            yAttr = 's';
            posAttr = 'x';
        }
        else {
            xAttr = 's';
            posAttr = 'y';
        }
        interpolate = stackGroupOpts.stackgaps === 'interpolate';
    }
    else {
        const ppad = calcMarkerSize(trace, serieslen);
        calcAxisExpansion(gd, trace, xa, ya, x, y, ppad);
    }
    const hasPeriodX = !!trace.xperiodalignment;
    const hasPeriodY = !!trace.yperiodalignment;
    for (i = 0; i < serieslen; i++) {
        const cdi = cd[i] = {};
        const xValid = isNumeric(x[i]);
        const yValid = isNumeric(y[i]);
        if (xValid && yValid) {
            cdi[xAttr] = x[i];
            cdi[yAttr] = y[i];
            if (hasPeriodX) {
                cdi.orig_x = origX[i]; // used by hover
                cdi.xEnd = xObj.ends[i];
                cdi.xStart = xObj.starts[i];
            }
            if (hasPeriodY) {
                cdi.orig_y = origY[i]; // used by hover
                cdi.yEnd = yObj.ends[i];
                cdi.yStart = yObj.starts[i];
            }
        }
        else if (stackGroupOpts && (isV ? xValid : yValid)) {
            // if we're stacking we need to hold on to all valid positions
            // even with invalid sizes
            cdi[posAttr] = isV ? x[i] : y[i];
            cdi.gap = true;
            if (interpolate) {
                cdi.s = BADNUM;
                interpolateGaps = true;
            }
            else {
                cdi.s = 0;
            }
        }
        else {
            cdi[xAttr] = cdi[yAttr] = BADNUM;
        }
        if (ids) {
            cdi.id = String(ids[i]);
        }
    }
    arraysToCalcdata(cd, trace);
    calcColorscale(gd, trace);
    calcSelection(cd, trace);
    if (stackGroupOpts) {
        // remove bad positions and sort
        // note that original indices get added to cd in arraysToCalcdata
        i = 0;
        while (i < cd.length) {
            if (cd[i][posAttr] === BADNUM) {
                cd.splice(i, 1);
            }
            else
                i++;
        }
        sort(cd, function (a, b) {
            return (a[posAttr] - b[posAttr]) || (a.i - b.i);
        });
        if (interpolateGaps) {
            // first fill the beginning with constant from the first point
            i = 0;
            while (i < cd.length - 1 && cd[i].gap) {
                i++;
            }
            vali = cd[i].s;
            if (!vali)
                vali = cd[i].s = 0; // in case of no data AT ALL in this trace - use 0
            for (j = 0; j < i; j++) {
                cd[j].s = vali;
            }
            // then fill the end with constant from the last point
            k = cd.length - 1;
            while (k > i && cd[k].gap) {
                k--;
            }
            vali = cd[k].s;
            for (j = cd.length - 1; j > k; j--) {
                cd[j].s = vali;
            }
            // now interpolate internal gaps linearly
            while (i < k) {
                i++;
                if (cd[i].gap) {
                    j = i + 1;
                    while (cd[j].gap) {
                        j++;
                    }
                    const pos0 = cd[i - 1][posAttr];
                    const size0 = cd[i - 1].s;
                    const m = (cd[j].s - size0) / (cd[j][posAttr] - pos0);
                    while (i < j) {
                        cd[i].s = size0 + (cd[i][posAttr] - pos0) * m;
                        i++;
                    }
                }
            }
        }
    }
    return cd;
}
function calcAxisExpansion(gd, trace, xa, ya, x, y, ppad) {
    const serieslen = trace._length;
    const fullLayout = gd._fullLayout;
    const xId = xa._id;
    const yId = ya._id;
    const firstScatter = fullLayout._firstScatter[firstScatterGroup(trace)] === trace.uid;
    const stackOrientation = (getStackOpts(trace, fullLayout, xa, ya) || {}).orientation;
    const fill = trace.fill;
    // cancel minimum tick spacings (only applies to bars and boxes)
    xa._minDtick = 0;
    ya._minDtick = 0;
    // check whether bounds should be tight, padded, extended to zero...
    // most cases both should be padded on both ends, so start with that.
    const xOptions = { padded: true };
    const yOptions = { padded: true };
    if (ppad) {
        xOptions.ppad = yOptions.ppad = ppad;
    }
    // TODO: text size
    const openEnded = serieslen < 2 || (x[0] !== x[serieslen - 1]) || (y[0] !== y[serieslen - 1]);
    if (openEnded && ((fill === 'tozerox') ||
        ((fill === 'tonextx') && (firstScatter || stackOrientation === 'h')))) {
        // include zero (tight) and extremes (padded) if fill to zero
        // (unless the shape is closed, then it's just filling the shape regardless)
        xOptions.tozero = true;
    }
    else if (!(trace.error_y || {}).visible && (
    // if no error bars, markers or text, or fill to y=0 remove x padding
    ((fill === 'tonexty' || fill === 'tozeroy') || (!subTypes.hasMarkers(trace) && !subTypes.hasText(trace))))) {
        xOptions.padded = false;
        xOptions.ppad = 0;
    }
    if (openEnded && ((fill === 'tozeroy') ||
        ((fill === 'tonexty') && (firstScatter || stackOrientation === 'v')))) {
        // now check for y - rather different logic, though still mostly padded both ends
        // include zero (tight) and extremes (padded) if fill to zero
        // (unless the shape is closed, then it's just filling the shape regardless)
        yOptions.tozero = true;
    }
    else if (fill === 'tonextx' || fill === 'tozerox') {
        // tight y: any x fill
        yOptions.padded = false;
    }
    // N.B. asymmetric splom traces call this with blank {} xa or ya
    if (xId)
        trace._extremes[xId] = Axes.findExtremes(xa, x, xOptions);
    if (yId)
        trace._extremes[yId] = Axes.findExtremes(ya, y, yOptions);
}
function calcMarkerSize(trace, serieslen) {
    if (!subTypes.hasMarkers(trace))
        return;
    // Treat size like x or y arrays --- Run d2c
    // this needs to go before ppad computation
    const marker = trace.marker;
    const sizeref = 1.6 * (trace.marker.sizeref || 1);
    let markerTrans;
    if (trace.marker.sizemode === 'area') {
        markerTrans = function (v) {
            return Math.max(Math.sqrt((v || 0) / sizeref), 3);
        };
    }
    else {
        markerTrans = function (v) {
            return Math.max((v || 0) / sizeref, 3);
        };
    }
    if (isArrayOrTypedArray(marker.size)) {
        // I tried auto-type but category and dates dont make much sense.
        const ax = { type: 'linear' };
        Axes.setConvert(ax);
        const s = ax.makeCalcdata(trace.marker, 'size');
        const sizeOut = new Array(serieslen);
        for (let i = 0; i < serieslen; i++) {
            sizeOut[i] = markerTrans(s[i]);
        }
        return sizeOut;
    }
    else {
        return markerTrans(marker.size);
    }
}
/**
 * mark the first scatter trace for each subplot
 * note that scatter and scattergl each get their own first trace
 * note also that I'm doing this during calc rather than supplyDefaults
 * so I don't need to worry about transforms, but if we ever do
 * per-trace calc this will get confused.
 */
function setFirstScatter(fullLayout, trace) {
    const group = firstScatterGroup(trace);
    const firstScatter = fullLayout._firstScatter;
    if (!firstScatter[group])
        firstScatter[group] = trace.uid;
}
function firstScatterGroup(trace) {
    const stackGroup = trace.stackgroup;
    return trace.xaxis + trace.yaxis + trace.type +
        (stackGroup ? '-' + stackGroup : '');
}
function getStackOpts(trace, fullLayout, xa, ya) {
    const stackGroup = trace.stackgroup;
    if (!stackGroup)
        return;
    const stackOpts = fullLayout._scatterStackOpts[xa._id + ya._id][stackGroup];
    const stackAx = stackOpts.orientation === 'v' ? ya : xa;
    // Allow stacking only on numeric axes
    // calc is a little late to be figuring this out, but during supplyDefaults
    // we don't know the axis type yet
    if (stackAx.type === 'linear' || stackAx.type === 'log')
        return stackOpts;
}
export default {
    calc: calc,
    calcMarkerSize: calcMarkerSize,
    calcAxisExpansion: calcAxisExpansion,
    setFirstScatter: setFirstScatter,
    getStackOpts: getStackOpts
};
