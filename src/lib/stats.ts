import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray } from './array.js';

export function aggNums(f: (a: number, b: number) => number, v: any, a: any[], len?: number): any {
    let i: number,
        b: any[];
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
}

export function len(data: any[]): number {
    return aggNums(function(a: number) { return a + 1; } as any, 0, data);
}

export function mean(data: any[], dataLen?: number): number {
    if(!dataLen) dataLen = len(data);
    return aggNums(function(a: number, b: number) { return a + b; }, 0, data) / dataLen;
}

export function geometricMean(data: any[], dataLen?: number): number {
    if(!dataLen) dataLen = len(data);
    return Math.pow(aggNums(function(a: number, b: number) { return a * b; }, 1, data), 1 / dataLen);
}

export function midRange(numArr: any[]): number | undefined {
    if(numArr === undefined || numArr.length === 0) return undefined;
    return (aggNums(Math.max, null, numArr) + aggNums(Math.min, null, numArr)) / 2;
}

export function variance(data: any[], dataLen?: number, dataMean?: number): number {
    if(!dataLen) dataLen = len(data);
    if(!isNumeric(dataMean)) dataMean = mean(data, dataLen);

    return aggNums(function(a: number, b: number) {
        return a + Math.pow(b - dataMean!, 2);
    }, 0, data) / dataLen;
}

export function stdev(data: any[], dataLen?: number, dataMean?: number): number {
    return Math.sqrt(variance(data, dataLen, dataMean));
}

export function median(data: any[]): number {
    const b = data.slice().sort();
    return interp(b, 0.5);
}

export function interp(arr: any[], n: number): number {
    if(!isNumeric(n)) throw 'n should be a finite number';
    n = n * arr.length - 0.5;
    if(n < 0) return arr[0];
    if(n > arr.length - 1) return arr[arr.length - 1];
    const frac = n % 1;
    return frac * arr[Math.ceil(n)] + (1 - frac) * arr[Math.floor(n)];
}

export default { aggNums, len, mean, geometricMean, midRange, variance, stdev, median, interp };
