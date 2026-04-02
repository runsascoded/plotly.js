import type { FullAxis, FullTrace, GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
const _ = Lib._;

function calc(gd: GraphDiv,  trace: FullTrace) {
    const xa = Axes.getFromId(gd, trace.xaxis);
    const ya = Axes.getFromId(gd, trace.yaxis);

    const tickLen = convertTickWidth(gd, xa, trace);
    const minDiff = trace._minDiff;
    trace._minDiff = null;
    const origX = trace._origX;
    trace._origX = null;
    const x = trace._xcalc;
    trace._xcalc = null;

    const cd = calcCommon(gd, trace, origX, x, ya, ptFunc);

    trace._extremes[xa._id] = Axes.findExtremes(xa, x, {vpad: minDiff / 2});
    if(cd.length) {
        Lib.extendFlat((cd[0] as any).t, {
            wHover: minDiff / 2,
            tickLen: tickLen
        });
        return cd;
    } else {
        return [{t: {empty: true}}];
    }
}

function ptFunc(o,  h,  l,  c) {
    return {
        o: o,
        h: h,
        l: l,
        c: c
    };
}

// shared between OHLC and candlestick
// ptFunc makes a calcdata point specific to each trace type, from oi, hi, li, ci
function calcCommon(gd: GraphDiv,  trace: FullTrace,  origX,  x,  ya: FullAxis,  ptFunc) {
    const o = ya.makeCalcdata(trace, 'open');
    const h = ya.makeCalcdata(trace, 'high');
    const l = ya.makeCalcdata(trace, 'low');
    const c = ya.makeCalcdata(trace, 'close');

    const hasTextArray = Lib.isArrayOrTypedArray(trace.text);
    const hasHovertextArray = Lib.isArrayOrTypedArray(trace.hovertext);

    // we're optimists - before we have any changing data, assume increasing
    let increasing = true;
    let cPrev = null;

    const hasPeriod = !!trace.xperiodalignment;

    const cd: any[] = [];
    for(let i = 0; i < x.length; i++) {
        const xi = x[i];
        const oi = o[i];
        const hi = h[i];
        const li = l[i];
        const ci = c[i];

        if(xi !== BADNUM && oi !== BADNUM && hi !== BADNUM && li !== BADNUM && ci !== BADNUM) {
            if(ci === oi) {
                // if open == close, look for a change from the previous close
                if(cPrev !== null && ci !== cPrev) increasing = ci > cPrev;
                // else (c === cPrev or cPrev is null) no change
            } else increasing = ci > oi;

            cPrev = ci;

            const pt = ptFunc(oi, hi, li, ci);

            pt.pos = xi;
            pt.yc = (oi + ci) / 2;
            pt.i = i;
            pt.dir = increasing ? 'increasing' : 'decreasing';

            // For categoryorder, store low and high
            pt.x = pt.pos;
            pt.y = [li, hi];

            if(hasPeriod) pt.orig_p = origX[i]; // used by hover
            if(hasTextArray) pt.tx = trace.text![i];
            if(hasHovertextArray) pt.htx = trace.hovertext[i];

            cd.push(pt);
        } else {
            cd.push({pos: xi, empty: true});
        }
    }

    trace._extremes[ya._id] = Axes.findExtremes(ya, Lib.concat(l, h), {padded: true});

    if(cd.length) {
        (cd[0] as any).t = {
            labels: {
                open: _(gd, 'open:') + ' ',
                high: _(gd, 'high:') + ' ',
                low: _(gd, 'low:') + ' ',
                close: _(gd, 'close:') + ' '
            }
        };
    }

    return cd;
}

/*
 * find min x-coordinates difference of all traces
 * attached to this x-axis and stash the result in _minDiff
 * in all traces; when a trace uses this in its
 * calc step it deletes _minDiff, so that next calc this is
 * done again in case the data changed.
 * also since we need it here, stash _xcalc (and _origX) on the trace
 */
function convertTickWidth(gd: GraphDiv,  xa: FullAxis,  trace: FullTrace) {
    let minDiff = trace._minDiff;

    if(!minDiff) {
        const fullData = gd._fullData;
        const ohlcTracesOnThisXaxis: any[] = [];

        minDiff = Infinity;

        let i;

        for(i = 0; i < fullData.length; i++) {
            const tracei = fullData[i];

            if(tracei.type === 'ohlc' &&
                tracei.visible === true &&
                tracei.xaxis === xa._id
            ) {
                ohlcTracesOnThisXaxis.push(tracei);

                const origX = xa.makeCalcdata(tracei, 'x');
                tracei._origX = origX;

                const xcalc = alignPeriod(trace, xa, 'x', origX).vals;
                tracei._xcalc = xcalc;

                const _minDiff = Lib.distinctVals(xcalc).minDiff;
                if(_minDiff && isFinite(_minDiff)) {
                    minDiff = Math.min(minDiff, _minDiff);
                }
            }
        }

        // if minDiff is still Infinity here, set it to 1
        if(minDiff === Infinity) minDiff = 1;

        for(i = 0; i < ohlcTracesOnThisXaxis.length; i++) {
            (ohlcTracesOnThisXaxis[i] as any)._minDiff = minDiff;
        }
    }

    return minDiff * trace.tickwidth;
}

export default {
    calc: calc,
    calcCommon: calcCommon
};
