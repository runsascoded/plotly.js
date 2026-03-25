import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray } from './array.js';

export var aggNums = function(f, v, a, len) {
    var i,
        b;
    if(!len || len > a.length) len = a.length;
    if(!isNumeric(v)) v = false;
    if(isArrayOrTypedArray(a[0])) {
        b = new Array(len);
        for(i = 0; i < len; i++) b[i] = aggNums(f, v, a[i]);
        a = b;
    }

    for(i = 0; i < len; i++) {
        if(!isNumeric(v)) v = a[i];
        else if(isNumeric(a[i])) v = f(+v, +a[i]);
    }
    return v;
};

export var len = function(data) {
    return aggNums(function(a) { return a + 1; }, 0, data);
};

export var mean = function(data, len) {
    if(!len) len = len(data);
    return aggNums(function(a, b) { return a + b; }, 0, data) / len;
};

export var geometricMean = function(data, len) {
    if(!len) len = len(data);
    return Math.pow(aggNums(function(a, b) { return a * b; }, 1, data), 1 / len);
};

export var midRange = function(numArr) {
    if(numArr === undefined || numArr.length === 0) return undefined;
    return (aggNums(Math.max, null, numArr) + aggNums(Math.min, null, numArr)) / 2;
};

export var variance = function(data, len, mean) {
    if(!len) len = len(data);
    if(!isNumeric(mean)) mean = mean(data, len);

    return aggNums(function(a, b) {
        return a + Math.pow(b - mean, 2);
    }, 0, data) / len;
};

export var stdev = function(data, len, mean) {
    return Math.sqrt(variance(data, len, mean));
};

export var median = function(data) {
    var b = data.slice().sort();
    return interp(b, 0.5);
};

export var interp = function(arr, n) {
    if(!isNumeric(n)) throw 'n should be a finite number';
    n = n * arr.length - 0.5;
    if(n < 0) return arr[0];
    if(n > arr.length - 1) return arr[arr.length - 1];
    var frac = n % 1;
    return frac * arr[Math.ceil(n)] + (1 - frac) * arr[Math.floor(n)];
};

export default { aggNums, len, mean, geometricMean, midRange, variance, stdev, median, interp };
