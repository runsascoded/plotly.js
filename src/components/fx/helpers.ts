import type { FullTrace } from '../../../types/core';
import { isArrayOrTypedArray, nestedProperty } from '../../lib/index.js';

export function getSubplot(trace: FullTrace): string {
    return trace.subplot || trace.xaxis + trace.yaxis || trace.geo;
}

export function isTraceInSubplots(trace: FullTrace, subplots: string[]): boolean {
    if (trace.type === 'splom') {
        const xaxes = trace.xaxes || [];
        const yaxes = trace.yaxes || [];
        for (let i = 0; i < xaxes.length; i++) {
            for (let j = 0; j < yaxes.length; j++) {
                if (subplots.indexOf(xaxes[i] + yaxes[j]) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }

    return subplots.indexOf(getSubplot(trace)) !== -1;
}

export function flat(subplots: any[], v: any): any[] {
    const out = new Array(subplots.length);
    for (let i = 0; i < subplots.length; i++) {
        out[i] = v;
    }
    return out;
}

export function p2c(axArray: any[], v: any): any[] {
    const out = new Array(axArray.length);
    for (let i = 0; i < axArray.length; i++) {
        out[i] = axArray[i].p2c(v);
    }
    return out;
}

export function getDistanceFunction(mode: string, dx: any, dy: any, dxy?: any): any {
    if (mode === 'closest') return dxy || quadrature(dx, dy);
    return mode.charAt(0) === 'x' ? dx : dy;
}

export function getClosest(cd: any[], distfn: (di: any) => number, pointData: any): any {
    // do we already have a point number? (array mode only)
    if (pointData.index !== false) {
        if (pointData.index >= 0 && pointData.index < cd.length) {
            pointData.distance = 0;
        } else pointData.index = false;
    } else {
        // apply the distance function to each data point
        // this is the longest loop... if this bogs down, we may need
        // to create pre-sorted data (by x or y), not sure how to
        // do this for 'closest'

        // defined outside the for to improve the garbage collector performance
        let newDistance = Infinity;
        // the browser engine typically optimizes the length, but it is outside the cycle if it does not
        const len = cd.length;
        for (let i = 0; i < len; i++) {
            newDistance = distfn(cd[i]);
            if (newDistance <= pointData.distance) {
                pointData.index = i;
                pointData.distance = newDistance;
            }
        }
    }
    return pointData;
}

export function inbox(v0: number, v1: number, passVal: number): number {
    return v0 * v1 < 0 || v0 === 0 ? passVal : Infinity;
}

export function quadrature(dx: (di: any) => number, dy: (di: any) => number): (di: any) => number {
    return function(di: any): number {
        const x = dx(di);
        const y = dy(di);
        return Math.sqrt(x * x + y * y);
    };
}

export function makeEventData(pt: any, trace: FullTrace, cd: any): any {
    // hover uses 'index', select uses 'pointNumber'
    const pointNumber = 'index' in pt ? pt.index : pt.pointNumber;

    let out: any = {
        data: trace._input,
        fullData: trace,
        curveNumber: trace.index,
        pointNumber: pointNumber
    };

    if (trace._indexToPoints) {
        const pointIndices = trace._indexToPoints[pointNumber];

        if (pointIndices.length === 1) {
            out.pointIndex = pointIndices[0];
        } else {
            out.pointIndices = pointIndices;
        }
    } else {
        out.pointIndex = pointNumber;
    }

    if (trace._module.eventData) {
        out = trace._module.eventData(out, pt, trace, cd, pointNumber);
    } else {
        if ('xVal' in pt) out.x = pt.xVal;
        else if ('x' in pt) out.x = pt.x;

        if ('yVal' in pt) out.y = pt.yVal;
        else if ('y' in pt) out.y = pt.y;

        if (pt.xa) out.xaxis = pt.xa;
        if (pt.ya) out.yaxis = pt.ya;
        if (pt.zLabelVal !== undefined) out.z = pt.zLabelVal;
    }

    appendArrayPointValue(out, trace, pointNumber);

    return out;
}

export function appendArrayPointValue(pointData: any, trace: FullTrace, pointNumber: any): void {
    const arrayAttrs = trace._arrayAttrs;

    if (!arrayAttrs) {
        return;
    }

    for (let i = 0; i < arrayAttrs.length; i++) {
        const astr = arrayAttrs[i];
        const key = getPointKey(astr);

        if (pointData[key] === undefined) {
            const val = nestedProperty(trace, astr).get();
            const pointVal = getPointData(val, pointNumber);

            if (pointVal !== undefined) pointData[key] = pointVal;
        }
    }
}

export function appendArrayMultiPointValues(pointData: any, trace: FullTrace, pointNumbers: any[]): void {
    const arrayAttrs = trace._arrayAttrs;

    if (!arrayAttrs) {
        return;
    }

    for (let i = 0; i < arrayAttrs.length; i++) {
        const astr = arrayAttrs[i];
        const key = getPointKey(astr);

        if (pointData[key] === undefined) {
            const val = nestedProperty(trace, astr).get();
            const keyVal = new Array(pointNumbers.length);

            for (let j = 0; j < pointNumbers.length; j++) {
                keyVal[j] = getPointData(val, pointNumbers[j]);
            }
            pointData[key] = keyVal;
        }
    }
}

const pointKeyMap: Record<string, string> = {
    ids: 'id',
    locations: 'location',
    labels: 'label',
    values: 'value',
    'marker.colors': 'color',
    parents: 'parent'
};

function getPointKey(astr: string): string {
    return pointKeyMap[astr] || astr;
}

function getPointData(val: any, pointNumber: any): void {
    if (Array.isArray(pointNumber)) {
        if (isArrayOrTypedArray(val) && isArrayOrTypedArray(val[pointNumber[0]])) {
            return val[pointNumber[0]][pointNumber[1]];
        }
    } else {
        return val[pointNumber];
    }
}

const xyHoverMode: Record<string, boolean> = {
    x: true,
    y: true
};

const unifiedHoverMode: Record<string, boolean> = {
    'x unified': true,
    'y unified': true
};

export function isUnifiedHover(hovermode: any): boolean {
    if (typeof hovermode !== 'string') return false;
    return !!unifiedHoverMode[hovermode];
}

export function isXYhover(hovermode: any): boolean {
    if (typeof hovermode !== 'string') return false;
    return !!xyHoverMode[hovermode];
}

export default { getSubplot, isTraceInSubplots, flat, p2c, getDistanceFunction, getClosest, inbox, quadrature, makeEventData, appendArrayPointValue, appendArrayMultiPointValues, isUnifiedHover, isXYhover };
