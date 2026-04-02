import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import binFunctions from '../histogram/bin_functions.js';
import normFunctions from '../histogram/norm_functions.js';
import doAvg from '../histogram/average.js';
import getBinSpanLabelRound from '../histogram/bin_label_vals.js';
import _calc from '../histogram/calc.js';
const { calcAllAutoBins } = _calc;
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    const xa = Axes.getFromId(gd, trace.xaxis);
    const ya = Axes.getFromId(gd, trace.yaxis);

    const xcalendar = trace.xcalendar;
    const ycalendar = trace.ycalendar;
    const xr2c = (v: any) => { return xa.r2c(v, 0, xcalendar); };
    const yr2c = (v: any) => { return ya.r2c(v, 0, ycalendar); };
    const xc2r = (v: any) => { return xa.c2r(v, 0, xcalendar); };
    const yc2r = (v: any) => { return ya.c2r(v, 0, ycalendar); };

    let i, j, n, m;

    // calculate the bins
    const xBinsAndPos = calcAllAutoBins(gd, trace, xa, 'x');
    const xBinSpec = xBinsAndPos[0];
    const xPos0 = xBinsAndPos[1];
    const yBinsAndPos = calcAllAutoBins(gd, trace, ya, 'y');
    const yBinSpec = yBinsAndPos[0];
    const yPos0 = yBinsAndPos[1];

    const serieslen = trace._length;
    if(xPos0.length > serieslen) xPos0.splice(serieslen, xPos0.length - serieslen);
    if(yPos0.length > serieslen) yPos0.splice(serieslen, yPos0.length - serieslen);

    // make the empty bin array & scale the map
    const z: any[] = [];
    const onecol: any[] = [];
    const zerocol: any[] = [];
    const nonuniformBinsX = typeof xBinSpec.size === 'string';
    const nonuniformBinsY = typeof yBinSpec.size === 'string';
    const xEdges: any[] = [];
    const yEdges: any[] = [];
    let xbins = nonuniformBinsX ? xEdges : xBinSpec;
    let ybins = nonuniformBinsY ? yEdges : yBinSpec;
    let total = 0;
    const counts: any[] = [];
    const inputPoints: any[] = [];
    const norm = trace.histnorm;
    const func = trace.histfunc;
    const densitynorm = norm.indexOf('density') !== -1;
    const extremefunc = func === 'max' || func === 'min';
    const sizeinit = extremefunc ? null : 0;
    let binfunc = binFunctions.count;
    const normfunc = (normFunctions as any)[norm];
    let doavg = false;
    let xinc: any[] = [];
    let yinc: any[] = [];

    // set a binning function other than count?
    // for binning functions: check first for 'z',
    // then 'mc' in case we had a colored scatter plot
    // and want to transfer these colors to the 2D histo
    // TODO: axe this, make it the responsibility of the app changing type? or an impliedEdit?
    const rawCounterData = ('z' in trace) ?
        trace.z :
        (('marker' in trace && Array.isArray(trace.marker.color)) ?
            trace.marker.color : '');
    if(rawCounterData && func !== 'count') {
        doavg = func === 'avg';
        binfunc = binFunctions[func];
    }

    // decrease end a little in case of rounding errors
    const xBinSize = xBinSpec.size;
    const xBinStart = xr2c(xBinSpec.start);
    const xBinEnd = xr2c(xBinSpec.end) +
        (xBinStart - Axes.tickIncrement(xBinStart, xBinSize, false, xcalendar)) / 1e6;

    for(i = xBinStart; i < xBinEnd; i = Axes.tickIncrement(i, xBinSize, false, xcalendar)) {
        onecol.push(sizeinit);
        xEdges.push(i);
        if(doavg) zerocol.push(0);
    }
    xEdges.push(i);

    const nx = onecol.length;
    const dx = (i - xBinStart) / nx;
    const x0 = xc2r(xBinStart + dx / 2);

    const yBinSize = yBinSpec.size;
    const yBinStart = yr2c(yBinSpec.start);
    const yBinEnd = yr2c(yBinSpec.end) +
        (yBinStart - Axes.tickIncrement(yBinStart, yBinSize, false, ycalendar)) / 1e6;

    for(i = yBinStart; i < yBinEnd; i = Axes.tickIncrement(i, yBinSize, false, ycalendar)) {
        z.push(onecol.slice());
        yEdges.push(i);
        const ipCol = new Array(nx);
        for(j = 0; j < nx; j++) ipCol[j] = [];
        inputPoints.push(ipCol);
        if(doavg) counts.push(zerocol.slice());
    }
    yEdges.push(i);

    const ny = z.length;
    const dy = (i - yBinStart) / ny;
    const y0 = yc2r(yBinStart + dy / 2);

    if(densitynorm) {
        xinc = (makeIncrements(onecol.length, xbins, dx, nonuniformBinsX) as any);
        yinc = (makeIncrements(z.length, ybins, dy, nonuniformBinsY) as any);
    }

    // for date axes we need bin bounds to be calcdata. For nonuniform bins
    // we already have this, but uniform with start/end/size they're still strings.
    if(!nonuniformBinsX && xa.type === 'date') xbins = binsToCalc(xr2c, xbins);
    if(!nonuniformBinsY && ya.type === 'date') ybins = binsToCalc(yr2c, ybins);

    // put data into bins
    let uniqueValsPerX = true;
    let uniqueValsPerY = true;
    const xVals = new Array(nx);
    const yVals = new Array(ny);
    let xGapLow = Infinity;
    let xGapHigh = Infinity;
    let yGapLow = Infinity;
    let yGapHigh = Infinity;
    for(i = 0; i < serieslen; i++) {
        const xi = xPos0[i];
        const yi = yPos0[i];
        n = Lib.findBin(xi, xbins);
        m = Lib.findBin(yi, ybins);
        if(n >= 0 && n < nx && m >= 0 && m < ny) {
            total += binfunc(n, i, z[m], rawCounterData, counts[m]);
            (inputPoints[m][n] as any).push(i);

            if(uniqueValsPerX) {
                if(xVals[n] === undefined) xVals[n] = xi;
                else if(xVals[n] !== xi) uniqueValsPerX = false;
            }
            if(uniqueValsPerY) {
                if(yVals[m] === undefined) yVals[m] = yi;
                else if(yVals[m] !== yi) uniqueValsPerY = false;
            }

            xGapLow = Math.min(xGapLow, xi - xEdges[n]);
            xGapHigh = Math.min(xGapHigh, xEdges[n + 1] - xi);
            yGapLow = Math.min(yGapLow, yi - yEdges[m]);
            yGapHigh = Math.min(yGapHigh, yEdges[m + 1] - yi);
        }
    }
    // normalize, if needed
    if(doavg) {
        for(m = 0; m < ny; m++) total += doAvg(z[m], counts[m]);
    }
    if(normfunc) {
        for(m = 0; m < ny; m++) normfunc(z[m], total, xinc, yinc[m]);
    }

    return {
        x: xPos0,
        xRanges: getRanges(xEdges, uniqueValsPerX && xVals, xGapLow, xGapHigh, xa, xcalendar),
        x0: x0,
        dx: dx,
        y: yPos0,
        yRanges: getRanges(yEdges, uniqueValsPerY && yVals, yGapLow, yGapHigh, ya, ycalendar),
        y0: y0,
        dy: dy,
        z: z,
        pts: inputPoints
    };
}

function makeIncrements(len: any, bins: any, dv: any, nonuniform: any) {
    const out = new Array(len);
    let i;
    if(nonuniform) {
        for(i = 0; i < len; i++) out[i] = 1 / (bins[i + 1] - bins[i]);
    } else {
        const inc = 1 / dv;
        for(i = 0; i < len; i++) out[i] = inc;
    }
    return out;
}

function binsToCalc(r2c: any, bins: any) {
    return {
        start: r2c(bins.start),
        end: r2c(bins.end),
        size: bins.size
    };
}

function getRanges(edges: any, uniqueVals: any, gapLow: any, gapHigh: any, ax: any, calendar: any) {
    let i;
    const len = edges.length - 1;
    const out = new Array(len);
    const roundFn = getBinSpanLabelRound(gapLow, gapHigh, edges, ax, calendar);

    for(i = 0; i < len; i++) {
        const v = (uniqueVals || [])[i];
        out[i] = v === undefined ?
            [roundFn(edges[i]), roundFn(edges[i + 1], true)] :
            [v, v];
    }
    return out;
}
