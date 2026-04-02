import type { FullTrace } from '../../../types/core';
import Lib from '../../lib/index.js';

// Maybe add kernels more down the road,
// but note that the default `spanmode: 'soft'` bounds might have
// to become kernel-dependent
const kernels = {
    gaussian: function(v: number): number {
        return (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * v * v);
    }
};

export function makeKDE(calcItem: any, trace: FullTrace, vals: number[]): (x: number) => number {
    const len = vals.length;
    const kernel = kernels.gaussian;
    const bandwidth = calcItem.bandwidth;
    const factor = 1 / (len * bandwidth);

    // don't use Lib.aggNums to skip isNumeric checks
    return function(x) {
        let sum = 0;
        for(let i = 0; i < len; i++) {
            sum += kernel((x - vals[i]) / bandwidth);
        }
        return factor * sum;
    };
}

export function getPositionOnKdePath(calcItem: any, trace: FullTrace, valuePx: number): [number, number] {
    let posLetter, valLetter;

    if(trace.orientation === 'h') {
        posLetter = 'y';
        valLetter = 'x';
    } else {
        posLetter = 'x';
        valLetter = 'y';
    }

    const pointOnPath = Lib.findPointOnPath(
        calcItem.path,
        valuePx,
        valLetter,
        {pathLength: calcItem.pathLength}
    );

    const posCenterPx = calcItem.posCenterPx;
    const posOnPath0 = pointOnPath[posLetter];
    const posOnPath1 = trace.side === 'both' ?
        2 * posCenterPx - posOnPath0 :
        posCenterPx;

    return [posOnPath0, posOnPath1];
}

export function getKdeValue(calcItem: any, trace: FullTrace, valueDist: number): number {
    const vals = calcItem.pts.map(extractVal);
    const kde = makeKDE(calcItem, trace, vals);
    return kde(valueDist) / calcItem.posDensityScale;
}

export function extractVal(o: any): number { return o.v; }

export default { makeKDE, getPositionOnKdePath, getKdeValue, extractVal };
