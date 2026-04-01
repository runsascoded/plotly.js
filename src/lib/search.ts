import isNumeric from 'fast-isnumeric';
import loggers from './loggers.js';
import identity from './identity.js';
import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;

// don't trust floating point equality - fraction of bin size to call
// "on the line" and ensure that they go the right way specified by
// linelow
var roundingError = 1e-9;

export var findBin = function(val: number, bins: any, linelow?: boolean): number {
    if(isNumeric(bins.start)) {
        return linelow ?
            Math.ceil((val - bins.start) / bins.size - roundingError) - 1 :
            Math.floor((val - bins.start) / bins.size + roundingError);
    } else {
        var n1 = 0;
        var n2 = bins.length;
        var c = 0;
        var binSize = (n2 > 1) ? (bins[n2 - 1] - bins[0]) / (n2 - 1) : 1;
        var n: number, test: (a: number, b: number) => boolean;
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

export var sorterAsc = function(a: number, b: number): number { return a - b; };
export var sorterDes = function(a: number, b: number): number { return b - a; };

export var distinctVals = function(valsIn: number[]): { vals: number[]; minDiff: number } {
    var vals = valsIn.slice();  // otherwise we sort the original array...
    vals.sort(sorterAsc); // undefined listed in the end

    var last: number;
    for(last = vals.length - 1; last > -1; last--) {
        if(vals[last] !== BADNUM) break;
    }

    var minDiff = (vals[last] - vals[0]) || 1;
    var errDiff = minDiff / (last || 1) / 10000;
    var newVals: number[] = [];
    var preV: number | undefined;
    for(var i = 0; i <= last; i++) {
        var v = vals[i];

        // make sure values aren't just off by a rounding error
        var diff = v - preV!;

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

export var roundUp = function(val: number, arrayIn: number[], reverse?: boolean): number {
    var low = 0;
    var high = arrayIn.length - 1;
    var mid: number;
    var c = 0;
    var dlow = reverse ? 0 : 1;
    var dhigh = reverse ? 1 : 0;
    var rounded = reverse ? Math.ceil : Math.floor;
    // c is just to avoid infinite loops if there's an error
    while(low < high && c++ < 100) {
        mid = rounded((low + high) / 2);
        if(arrayIn[mid] <= val) low = mid + dlow;
        else high = mid - dhigh;
    }
    return arrayIn[low];
};

export var sort = function<T>(array: T[], sortFn: (a: T, b: T) => number): T[] {
    var notOrdered = 0;
    var notReversed = 0;
    for(var i = 1; i < array.length; i++) {
        var pairOrder = sortFn(array[i], array[i - 1]);
        if(pairOrder < 0) notOrdered = 1;
        else if(pairOrder > 0) notReversed = 1;
        if(notOrdered && notReversed) return array.sort(sortFn);
    }
    return notReversed ? array : array.reverse();
};

export var findIndexOfMin = function<T>(arr: T[], fn?: (d: T) => number): number | undefined {
    fn = fn || identity as any;

    var min = Infinity;
    var ind: number | undefined;

    for(var i = 0; i < arr.length; i++) {
        var v = fn!(arr[i]);
        if(v < min) {
            min = v;
            ind = i;
        }
    }
    return ind;
};

export default { findBin, sorterAsc, sorterDes, distinctVals, roundUp, sort, findIndexOfMin };
