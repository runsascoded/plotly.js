import type { FullTrace, InputTrace } from '../../../types/core';
import { scaleLinear } from 'd3-scale';
import tinycolor from 'tinycolor2';
import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray, isPlainObject, nestedProperty } from '../../lib/index.js';
import Color from '../color/index.js';
import _scales from './scales.js';
const { isValid: isValidScale } = _scales;

function hasColorscale(trace: FullTrace | InputTrace, containerStr: string, colorKey?: string): boolean {
    var container = containerStr ?
        nestedProperty(trace, containerStr).get() || {} :
        trace;

    var color = container[colorKey || 'color'];
    if(color && color._inputArray) color = color._inputArray;

    var isArrayWithOneNumber = false;
    if(isArrayOrTypedArray(color)) {
        for(var i = 0; i < color.length; i++) {
            if(isNumeric(color[i])) {
                isArrayWithOneNumber = true;
                break;
            }
        }
    }

    return (
        isPlainObject(container) && (
            isArrayWithOneNumber ||
            container.showscale === true ||
            (isNumeric(container.cmin) && isNumeric(container.cmax)) ||
            isValidScale(container.colorscale) ||
            isPlainObject(container.colorbar)
        )
    );
}

var constantAttrs = ['showscale', 'autocolorscale', 'colorscale', 'reversescale', 'colorbar'];
var letterAttrs = ['min', 'max', 'mid', 'auto'];

function extractOpts(cont: any): any {
    var colorAx = cont._colorAx;
    var cont2 = colorAx ? colorAx : cont;
    var out: Record<string, any> = {};
    var cLetter: string;
    var i: number, k: string;

    for(i = 0; i < constantAttrs.length; i++) {
        k = constantAttrs[i];
        out[k] = cont2[k];
    }

    if(colorAx) {
        cLetter = 'c';
        for(i = 0; i < letterAttrs.length; i++) {
            k = letterAttrs[i];
            out[k] = cont2['c' + k];
        }
    } else {
        var k2: string;
        for(i = 0; i < letterAttrs.length; i++) {
            k = letterAttrs[i];
            k2 = 'c' + k;
            if(k2 in cont2) {
                out[k] = cont2[k2];
                continue;
            }
            k2 = 'z' + k;
            if(k2 in cont2) {
                out[k] = cont2[k2];
            }
        }
        cLetter = k2!.charAt(0);
    }

    out._sync = function(k: string, v: any): void {
        var k2 = letterAttrs.indexOf(k) !== -1 ? cLetter + k : k;
        cont2[k2] = cont2['_' + k2] = v;
    };

    return out;
}

function extractScale(cont: any): { domain: number[]; range: string[] } {
    var cOpts = extractOpts(cont);
    var cmin = cOpts.min;
    var cmax = cOpts.max;

    var scl = cOpts.reversescale ?
        flipScale(cOpts.colorscale) :
        cOpts.colorscale;

    var N = scl.length;
    var domain = new Array(N);
    var range = new Array(N);

    for(var i = 0; i < N; i++) {
        var si = scl[i];
        domain[i] = cmin + si[0] * (cmax - cmin);
        range[i] = si[1];
    }

    return {domain: domain, range: range};
}

function flipScale(scl: any[]): any[] {
    var N = scl.length;
    var sclNew = new Array(N);

    for(var i = N - 1, j = 0; i >= 0; i--, j++) {
        var si = scl[i];
        sclNew[j] = [1 - si[0], si[1]];
    }
    return sclNew;
}

function makeColorScaleFunc(specs: any, opts?: any): any {
    opts = opts || {};

    var domain = specs.domain;
    var range = specs.range;
    var N = range.length;
    var _range = new Array(N);

    for(var i = 0; i < N; i++) {
        var rgba = tinycolor(range[i]).toRgb();
        _range[i] = [rgba.r, rgba.g, rgba.b, rgba.a];
    }

    var _sclFunc = scaleLinear()
        .domain(domain)
        .range(_range)
        .clamp(true);

    var noNumericCheck = opts.noNumericCheck;
    var returnArray = opts.returnArray;
    var sclFunc: any;

    if(noNumericCheck && returnArray) {
        sclFunc = _sclFunc;
    } else if(noNumericCheck) {
        sclFunc = function(v: any): string {
            return colorArray2rbga(_sclFunc(v));
        };
    } else if(returnArray) {
        sclFunc = function(v: any): any {
            if(isNumeric(v)) return _sclFunc(v);
            else if(tinycolor(v).isValid()) return v;
            else return Color.defaultLine;
        };
    } else {
        sclFunc = function(v: any): string {
            if(isNumeric(v)) return colorArray2rbga(_sclFunc(v));
            else if(tinycolor(v).isValid()) return v;
            else return Color.defaultLine;
        };
    }

    sclFunc.domain = _sclFunc.domain;
    sclFunc.range = function(): string[] { return range; };

    return sclFunc;
}

function makeColorScaleFuncFromTrace(trace: FullTrace, opts?: any): any {
    return makeColorScaleFunc(extractScale(trace), opts);
}

function colorArray2rbga(colorArray: number[]): string {
    var colorObj = {
        r: colorArray[0],
        g: colorArray[1],
        b: colorArray[2],
        a: colorArray[3]
    };

    return tinycolor(colorObj).toRgbString();
}

export default {
    hasColorscale: hasColorscale,
    extractOpts: extractOpts,
    extractScale: extractScale,
    flipScale: flipScale,
    makeColorScaleFunc: makeColorScaleFunc,
    makeColorScaleFuncFromTrace: makeColorScaleFuncFromTrace
};
