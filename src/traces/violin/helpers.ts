import type { FullTrace } from '../../../types/core';
import Lib from '../../lib/index.js';

// Maybe add kernels more down the road,
// but note that the default `spanmode: 'soft'` bounds might have
// to become kernel-dependent
var kernels = {
    gaussian: function(v: number): number {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * v * v);
    }
};

export var makeKDE = function(calcItem: any, trace: FullTrace, vals: number[]): (x: number) => number {
    var len = vals.length;
    var kernel = kernels.gaussian;
    var bandwidth = calcItem.bandwidth;
    var factor = 1 / (len * bandwidth);

    // don't use Lib.aggNums to skip isNumeric checks
    return function(x) {
        var sum = 0;
        for(var i = 0; i < len; i++) {
            sum += kernel((x - vals[i]) / bandwidth);
        }
        return factor * sum;
    };
};

export var getPositionOnKdePath = function(calcItem: any, trace: FullTrace, valuePx: number): [number, number] {
    var posLetter, valLetter;

    if(trace.orientation === 'h') {
        posLetter = 'y';
        valLetter = 'x';
    } else {
        posLetter = 'x';
        valLetter = 'y';
    }

    var pointOnPath = Lib.findPointOnPath(
        calcItem.path,
        valuePx,
        valLetter,
        {pathLength: calcItem.pathLength}
    );

    var posCenterPx = calcItem.posCenterPx;
    var posOnPath0 = pointOnPath[posLetter];
    var posOnPath1 = trace.side === 'both' ?
        2 * posCenterPx - posOnPath0 :
        posCenterPx;

    return [posOnPath0, posOnPath1];
};

export var getKdeValue = function(calcItem: any, trace: FullTrace, valueDist: number): number {
    var vals = calcItem.pts.map(extractVal);
    var kde = makeKDE(calcItem, trace, vals);
    return kde(valueDist) / calcItem.posDensityScale;
};

export var extractVal = function(o: any): number { return o.v; };

export default { makeKDE, getPositionOnKdePath, getKdeValue, extractVal };
