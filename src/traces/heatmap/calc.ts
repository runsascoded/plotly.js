import type { FullTrace, GraphDiv } from '../../../types/core';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import alignPeriod from '../../plots/cartesian/align_period.js';
import histogram2dCalc from '../histogram2d/calc.js';
import colorscaleCalc from '../../components/colorscale/calc.js';
import convertColumnData from './convert_column_xyz.js';
import clean2dArray from './clean_2d_array.js';
import interp2d from './interp2d.js';
import findEmpties from './find_empties.js';
import makeBoundArray from './make_bound_array.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;

export default function calc(gd: GraphDiv,  trace: FullTrace) {
    // prepare the raw data
    // run makeCalcdata on x and y even for heatmaps, in case of category mappings
    const xa = Axes.getFromId(gd, trace.xaxis || 'x');
    const ya = Axes.getFromId(gd, trace.yaxis || 'y');
    const isContour = Registry.traceIs(trace, 'contour');
    const isHist = Registry.traceIs(trace, 'histogram');
    let zsmooth = isContour ? 'best' : trace.zsmooth;
    let x, x0, dx, origX;
    let y, y0, dy, origY;
    let z, i, binned;

    // cancel minimum tick spacings (only applies to bars and boxes)
    xa._minDtick = 0;
    ya._minDtick = 0;

    if(isHist) {
        binned = histogram2dCalc(gd, trace);
        origX = binned.orig_x;
        x = binned.x;
        x0 = binned.x0;
        dx = binned.dx;

        origY = binned.orig_y;
        y = binned.y;
        y0 = binned.y0;
        dy = binned.dy;

        z = binned.z;
    } else {
        let zIn = trace.z;
        if(Lib.isArray1D(zIn)) {
            convertColumnData(trace, xa, ya, 'x', 'y', ['z']);
            x = trace._x;
            y = trace._y;
            zIn = trace._z;
        } else {
            origX = trace.x ? xa.makeCalcdata(trace, 'x') : [];
            origY = trace.y ? ya.makeCalcdata(trace, 'y') : [];
            x = alignPeriod(trace, xa, 'x', origX).vals;
            y = alignPeriod(trace, ya, 'y', origY).vals;
            trace._x = x;
            trace._y = y;
        }

        x0 = trace.x0;
        dx = trace.dx;
        y0 = trace.y0;
        dy = trace.dy;

        z = clean2dArray(zIn, trace, xa, ya);
    }

    if(xa.rangebreaks || ya.rangebreaks) {
        z = dropZonBreaks(x, y, z);

        if(!isHist) {
            x = skipBreaks(x);
            y = skipBreaks(y);

            trace._x = x;
            trace._y = y;
        }
    }

    if(!isHist && (isContour || trace.connectgaps)) {
        trace._emptypoints = findEmpties(z);
        interp2d(z, trace._emptypoints);
    }

    function noZsmooth(msg) {
        zsmooth = trace._input.zsmooth = trace.zsmooth = false;
        Lib.warn('cannot use zsmooth: "fast": ' + msg);
    }

    function scaleIsLinear(s) {
        if(s.length > 1) {
            const avgdx = (s[s.length - 1] - s[0]) / (s.length - 1);
            const maxErrX = Math.abs(avgdx / 100);
            for(i = 0; i < s.length - 1; i++) {
                if(Math.abs(s[i + 1] - s[i] - avgdx) > maxErrX) {
                    return false;
                }
            }
        }
        return true;
    }

    // Check whether all brick are uniform
    trace._islinear = false;
    if(xa.type === 'log' || ya.type === 'log') {
        if(zsmooth === 'fast') {
            noZsmooth('log axis found');
        }
    } else if(!scaleIsLinear(x)) {
        if(zsmooth === 'fast') noZsmooth('x scale is not linear');
    } else if(!scaleIsLinear(y)) {
        if(zsmooth === 'fast') noZsmooth('y scale is not linear');
    } else {
        trace._islinear = true;
    }

    // create arrays of brick boundaries, to be used by autorange and heatmap.plot
    const xlen = Lib.maxRowLength(z);
    const xIn = trace.xtype === 'scaled' ? '' : x;
    const xArray = makeBoundArray(trace, xIn, x0, dx, xlen, xa);
    const yIn = trace.ytype === 'scaled' ? '' : y;
    const yArray = makeBoundArray(trace, yIn, y0, dy, z.length, ya);

    trace._extremes[xa._id] = Axes.findExtremes(xa, xArray);
    trace._extremes[ya._id] = Axes.findExtremes(ya, yArray);

    const cd0: any = {
        x: xArray,
        y: yArray,
        z: z,
        text: trace._text || trace.text,
        hovertext: trace._hovertext || trace.hovertext
    };

    if(trace.xperiodalignment && origX) {
        cd0.orig_x = origX;
    }
    if(trace.yperiodalignment && origY) {
        cd0.orig_y = origY;
    }

    if(xIn && xIn.length === xArray.length - 1) cd0.xCenter = xIn;
    if(yIn && yIn.length === yArray.length - 1) cd0.yCenter = yIn;

    if(isHist) {
        cd0.xRanges = binned.xRanges;
        cd0.yRanges = binned.yRanges;
        cd0.pts = binned.pts;
    }

    if(!isContour) {
        colorscaleCalc(gd, trace, {vals: z, cLetter: 'z'});
    }

    if(isContour && trace.contours && trace.contours.coloring === 'heatmap') {
        const dummyTrace: any = {
            type: trace.type === 'contour' ? 'heatmap' : 'histogram2d',
            xcalendar: trace.xcalendar,
            ycalendar: trace.ycalendar
        };
        cd0.xfill = makeBoundArray(dummyTrace, xIn, x0, dx, xlen, xa);
        cd0.yfill = makeBoundArray(dummyTrace, yIn, y0, dy, z.length, ya);
    }

    return [cd0];
}

function skipBreaks(a) {
    const b: any[] = [];
    const len = a.length;
    for(let i = 0; i < len; i++) {
        const v = a[i];
        if(v !== BADNUM) b.push(v);
    }
    return b;
}

function dropZonBreaks(x,  y,  z) {
    const newZ: any[] = [];
    let k = -1;
    for(let i = 0; i < z.length; i++) {
        if(y[i] === BADNUM) continue;
        k++;
        newZ[k] = [];
        for(let j = 0; j < z[i].length; j++) {
            if(x[j] === BADNUM) continue;

            (newZ[k] as any).push(z[i][j]);
        }
    }
    return newZ;
}
