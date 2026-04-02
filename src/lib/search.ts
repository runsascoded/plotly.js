import isNumeric from 'fast-isnumeric';
import loggers from './loggers.js';
import identity from './identity.js';
import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;

// don't trust floating point equality - fraction of bin size to call
// "on the line" and ensure that they go the right way specified by
// linelow
const roundingError = 1e-9;

export const findBin = function(val: number, bins: any, linelow?: boolean): number {
    if(isNumeric(bins.start)) {
        return linelow ?
            Math.ceil((val - bins.start) / bins.size - roundingError) - 1 :
            Math.floor((val - bins.start) / bins.size + roundingError);
    } else {
        let n1 = 0;
        let n2 = bins.length;
        let c = 0;
        const binSize = (n2 > 1) ? (bins[n2 - 1] - bins[0]) / (n2 - 1) : 1;
        let n: number, test: (a: number, b: number) => boolean;
        if(binSize >= 0) {
            test = linelow ? lessThan : lessOrEqual;
        } else {
            test = linelow ? greaterOrEqual : greaterThan;
        }
        val += binSize * roundingError * (linelow ? -1 : 1) * (binSize >= 0 ? 1 : -1);
        // c is just to avoid infinite loops if there's an error
        while(n1 < n2 && c++ < 100) {
            n = Math.floor((n1 + n2) / 2);
            if(test(bins[n], val)) n1 = n + 1;
            else n2 = n;
        }
        if(c > 90) loggers.log('Long binary search...');
        return n1 - 1;
    }
};

function lessThan(a: number, b: number): boolean { return a < b; }
function lessOrEqual(a: number, b: number): boolean { return a <= b; }
function greaterThan(a: number, b: number): boolean { return a > b; }
function greaterOrEqual(a: number, b: number): boolean { return a >= b; }

export const sorterAsc = function(a: number, b: number): number { return a - b; };
export const sorterDes = function(a: number, b: number): number { return b - a; };

export const distinctVals = function(valsIn: number[]): { vals: number[]; minDiff: number } {
    const vals = valsIn.slice();  // otherwise we sort the original array...
    vals.sort(sorterAsc); // undefined listed in the end

    let last: number;
    for(last = vals.length - 1; last > -1; last--) {
        if(vals[last] !== BADNUM) break;
    }

    let minDiff = (vals[last] - vals[0]) || 1;
    const errDiff = minDiff / (last || 1) / 10000;
    const newVals: number[] = [];
    let preV: number | undefined;
    for(let i = 0; i <= last; i++) {
        const v = vals[i];

        // make sure values aren't just off by a rounding error
        const diff = v - preV!;

        if(preV === undefined) {
            newVals.push(v);
            preV = v;
        } else if(diff > errDiff) {
            minDiff = Math.min(minDiff, diff);

            newVals.push(v);
            preV = v;
        }
    }

    return {vals: newVals, minDiff: minDiff};
};

export const roundUp = function(val: number, arrayIn: number[], reverse?: boolean): number {
    let low = 0;
    let high = arrayIn.length - 1;
    let mid: number;
    let c = 0;
    const dlow = reverse ? 0 : 1;
    const dhigh = reverse ? 1 : 0;
    const rounded = reverse ? Math.ceil : Math.floor;
    // c is just to avoid infinite loops if there's an error
    while(low < high && c++ < 100) {
        mid = rounded((low + high) / 2);
        if(arrayIn[mid] <= val) low = mid + dlow;
        else high = mid - dhigh;
    }
    return arrayIn[low];
};

export const sort = function<T>(array: T[], sortFn: (a: T, b: T) => number): T[] {
    let notOrdered = 0;
    let notReversed = 0;
    for(let i = 1; i < array.length; i++) {
        const pairOrder = sortFn(array[i], array[i - 1]);
        if(pairOrder < 0) notOrdered = 1;
        else if(pairOrder > 0) notReversed = 1;
        if(notOrdered && notReversed) return array.sort(sortFn);
    }
    return notReversed ? array : array.reverse();
};

export const findIndexOfMin = function<T>(arr: T[], fn?: (d: T) => number): number | undefined {
    fn = fn || identity as any;

    let min = Infinity;
    let ind: number | undefined;

    for(let i = 0; i < arr.length; i++) {
        const v = fn!(arr[i]);
        if(v < min) {
            min = v;
            ind = i;
        }
    }
    return ind;
};

export default { findBin, sorterAsc, sorterDes, distinctVals, roundUp, sort, findIndexOfMin };
