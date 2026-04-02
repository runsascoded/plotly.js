import Lib from '../../lib/index.js';
import colorscaleCalc from '../../components/colorscale/calc.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

function calc(gd: GraphDiv, trace: FullTrace) {
    trace._len = Math.min(
        trace.u.length,
        trace.v.length,
        trace.w.length,
        trace.x.length,
        trace.y.length,
        trace.z.length
    );

    trace._u = filter(trace.u, trace._len);
    trace._v = filter(trace.v, trace._len);
    trace._w = filter(trace.w, trace._len);
    trace._x = filter(trace.x, trace._len);
    trace._y = filter(trace.y, trace._len);
    trace._z = filter(trace.z, trace._len);

    const grid = processGrid(trace);
    trace._gridFill = grid.fill;
    trace._Xs = grid.Xs;
    trace._Ys = grid.Ys;
    trace._Zs = grid.Zs;
    trace._len = grid.len;

    let slen = 0;
    let startx, starty, startz;
    if(trace.starts) {
        startx = filter(trace.starts.x || []);
        starty = filter(trace.starts.y || []);
        startz = filter(trace.starts.z || []);
        slen = Math.min(startx.length, starty.length, startz.length);
    }
    trace._startsX = startx || [];
    trace._startsY = starty || [];
    trace._startsZ = startz || [];

    let normMax = 0;
    let normMin = Infinity;
    let i;
    for(i = 0; i < trace._len; i++) {
        const u = trace._u[i];
        const v = trace._v[i];
        const w = trace._w[i];
        const norm = Math.sqrt(u * u + v * v + w * w);

        normMax = Math.max(normMax, norm);
        normMin = Math.min(normMin, norm);
    }

    colorscaleCalc(gd, trace, {
        vals: [normMin, normMax],
        containerStr: '',
        cLetter: 'c'
    });

    for(i = 0; i < slen; i++) {
        const sx = startx[i];
        grid.xMax = Math.max(grid.xMax, sx);
        grid.xMin = Math.min(grid.xMin, sx);

        const sy = starty[i];
        grid.yMax = Math.max(grid.yMax, sy);
        grid.yMin = Math.min(grid.yMin, sy);

        const sz = startz[i];
        grid.zMax = Math.max(grid.zMax, sz);
        grid.zMin = Math.min(grid.zMin, sz);
    }

    trace._slen = slen;
    trace._normMax = normMax;
    trace._xbnds = [grid.xMin, grid.xMax];
    trace._ybnds = [grid.yMin, grid.yMax];
    trace._zbnds = [grid.zMin, grid.zMax];
}

function processGrid(trace: FullTrace) {
    const x = trace._x;
    const y = trace._y;
    const z = trace._z;
    let len = trace._len;

    let i, j, k;

    let xMax = -Infinity;
    let xMin = Infinity;
    let yMax = -Infinity;
    let yMin = Infinity;
    let zMax = -Infinity;
    let zMin = Infinity;

    let gridFill = '';
    let filledX;
    let filledY;
    let filledZ;
    let firstX, lastX;
    let firstY, lastY;
    let firstZ, lastZ;
    if(len) {
        firstX = x[0];
        firstY = y[0];
        firstZ = z[0];
    }
    if(len > 1) {
        lastX = x[len - 1];
        lastY = y[len - 1];
        lastZ = z[len - 1];
    }

    for(i = 0; i < len; i++) {
        xMax = Math.max(xMax, x[i]);
        xMin = Math.min(xMin, x[i]);

        yMax = Math.max(yMax, y[i]);
        yMin = Math.min(yMin, y[i]);

        zMax = Math.max(zMax, z[i]);
        zMin = Math.min(zMin, z[i]);

        if(!filledX && x[i] !== firstX) {
            filledX = true;
            gridFill += 'x';
        }
        if(!filledY && y[i] !== firstY) {
            filledY = true;
            gridFill += 'y';
        }
        if(!filledZ && z[i] !== firstZ) {
            filledZ = true;
            gridFill += 'z';
        }
    }
    // fill if not filled - case of having dimension(s) with one item
    if(!filledX) gridFill += 'x';
    if(!filledY) gridFill += 'y';
    if(!filledZ) gridFill += 'z';

    let Xs = distinctVals(trace._x);
    let Ys = distinctVals(trace._y);
    let Zs = distinctVals(trace._z);

    gridFill = gridFill.replace('x', (firstX > lastX ? '-' : '+') + 'x');
    gridFill = gridFill.replace('y', (firstY > lastY ? '-' : '+') + 'y');
    gridFill = gridFill.replace('z', (firstZ > lastZ ? '-' : '+') + 'z');

    const empty = function() {
        len = 0;
        Xs = [];
        Ys = [];
        Zs = [];
    };

    // Over-specified mesh case, this would error in tube2mesh
    if(!len || len < Xs.length * Ys.length * Zs.length) empty();

    const getArray = function(c) { return c === 'x' ? x : c === 'y' ? y : z; };
    const getVals = function(c) { return c === 'x' ? Xs : c === 'y' ? Ys : Zs; };
    const getDir = function(c) { return c[len - 1] < c[0] ? -1 : 1; };

    const arrK = getArray(gridFill[1]);
    const arrJ = getArray(gridFill[3]);
    const arrI = getArray(gridFill[5]);
    const nk = getVals(gridFill[1]).length;
    const nj = getVals(gridFill[3]).length;
    const ni = getVals(gridFill[5]).length;

    let arbitrary = false;

    const getIndex = function(_i, _j, _k) {
        return nk * (nj * _i + _j) + _k;
    };

    const dirK = getDir(getArray(gridFill[1]));
    const dirJ = getDir(getArray(gridFill[3]));
    const dirI = getDir(getArray(gridFill[5]));

    for(i = 0; i < ni - 1; i++) {
        for(j = 0; j < nj - 1; j++) {
            for(k = 0; k < nk - 1; k++) {
                const q000 = getIndex(i, j, k);
                const q001 = getIndex(i, j, k + 1);
                const q010 = getIndex(i, j + 1, k);
                const q100 = getIndex(i + 1, j, k);

                if(
                    !(arrK[q000] * dirK < arrK[q001] * dirK) ||
                    !(arrJ[q000] * dirJ < arrJ[q010] * dirJ) ||
                    !(arrI[q000] * dirI < arrI[q100] * dirI)
                ) {
                    arbitrary = true;
                }

                if(arbitrary) break;
            }
            if(arbitrary) break;
        }
        if(arbitrary) break;
    }

    if(arbitrary) {
        Lib.warn('Encountered arbitrary coordinates! Unable to input data grid.');
        empty();
    }

    return {
        xMin: xMin,
        yMin: yMin,
        zMin: zMin,
        xMax: xMax,
        yMax: yMax,
        zMax: zMax,
        Xs: Xs,
        Ys: Ys,
        Zs: Zs,
        len: len,
        fill: gridFill
    };
}

function distinctVals(col) {
    return Lib.distinctVals(col).vals;
}

function filter(arr: any, len?: number) {
    if(len === undefined) len = arr.length;

    // no need for casting typed arrays to numbers
    if(Lib.isTypedArray(arr)) return arr.subarray(0, len);

    const values = [];
    for(let i = 0; i < len; i++) {
        values[i] = +arr[i];
    }
    return values;
}

export default {
    calc: calc,
    filter: filter,
    processGrid: processGrid
};
