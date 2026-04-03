import { scaleLinear } from 'd3-scale';
import tinycolor from 'tinycolor2';
import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray, isPlainObject, nestedProperty } from '../../lib/index.js';
import Color from '../color/index.js';
import _scales from './scales.js';
const { isValid: isValidScale } = _scales;
function hasColorscale(trace, containerStr, colorKey) {
    const container = containerStr ?
        nestedProperty(trace, containerStr).get() || {} :
        trace;
    let color = container[colorKey || 'color'];
    if (color && color._inputArray)
        color = color._inputArray;
    let isArrayWithOneNumber = false;
    if (isArrayOrTypedArray(color)) {
        for (let i = 0; i < color.length; i++) {
            if (isNumeric(color[i])) {
                isArrayWithOneNumber = true;
                break;
            }
        }
    }
    return (isPlainObject(container) && (isArrayWithOneNumber ||
        container.showscale === true ||
        (isNumeric(container.cmin) && isNumeric(container.cmax)) ||
        isValidScale(container.colorscale) ||
        isPlainObject(container.colorbar)));
}
const constantAttrs = ['showscale', 'autocolorscale', 'colorscale', 'reversescale', 'colorbar'];
const letterAttrs = ['min', 'max', 'mid', 'auto'];
function extractOpts(cont) {
    const colorAx = cont._colorAx;
    const cont2 = colorAx ? colorAx : cont;
    const out = {};
    let cLetter;
    let i, k;
    for (i = 0; i < constantAttrs.length; i++) {
        k = constantAttrs[i];
        out[k] = cont2[k];
    }
    if (colorAx) {
        cLetter = 'c';
        for (i = 0; i < letterAttrs.length; i++) {
            k = letterAttrs[i];
            out[k] = cont2['c' + k];
        }
    }
    else {
        let k2;
        for (i = 0; i < letterAttrs.length; i++) {
            k = letterAttrs[i];
            k2 = 'c' + k;
            if (k2 in cont2) {
                out[k] = cont2[k2];
                continue;
            }
            k2 = 'z' + k;
            if (k2 in cont2) {
                out[k] = cont2[k2];
            }
        }
        cLetter = k2.charAt(0);
    }
    out._sync = function (k, v) {
        const k2 = letterAttrs.indexOf(k) !== -1 ? cLetter + k : k;
        cont2[k2] = cont2['_' + k2] = v;
    };
    return out;
}
function extractScale(cont) {
    const cOpts = extractOpts(cont);
    const cmin = cOpts.min;
    const cmax = cOpts.max;
    const scl = cOpts.reversescale ?
        flipScale(cOpts.colorscale) :
        cOpts.colorscale;
    const N = scl.length;
    const domain = new Array(N);
    const range = new Array(N);
    for (let i = 0; i < N; i++) {
        const si = scl[i];
        domain[i] = cmin + si[0] * (cmax - cmin);
        range[i] = si[1];
    }
    return { domain: domain, range: range };
}
function flipScale(scl) {
    const N = scl.length;
    const sclNew = new Array(N);
    for (let i = N - 1, j = 0; i >= 0; i--, j++) {
        const si = scl[i];
        sclNew[j] = [1 - si[0], si[1]];
    }
    return sclNew;
}
function makeColorScaleFunc(specs, opts) {
    opts = opts || {};
    const domain = specs.domain;
    const range = specs.range;
    const N = range.length;
    const _range = new Array(N);
    for (let i = 0; i < N; i++) {
        const rgba = tinycolor(range[i]).toRgb();
        _range[i] = [rgba.r, rgba.g, rgba.b, rgba.a];
    }
    const _sclFunc = scaleLinear()
        .domain(domain)
        .range(_range)
        .clamp(true);
    const noNumericCheck = opts.noNumericCheck;
    const returnArray = opts.returnArray;
    let sclFunc;
    if (noNumericCheck && returnArray) {
        sclFunc = _sclFunc;
    }
    else if (noNumericCheck) {
        sclFunc = function (v) {
            return colorArray2rbga(_sclFunc(v));
        };
    }
    else if (returnArray) {
        sclFunc = function (v) {
            if (isNumeric(v))
                return _sclFunc(v);
            else if (tinycolor(v).isValid())
                return v;
            else
                return Color.defaultLine;
        };
    }
    else {
        sclFunc = function (v) {
            if (isNumeric(v))
                return colorArray2rbga(_sclFunc(v));
            else if (tinycolor(v).isValid())
                return v;
            else
                return Color.defaultLine;
        };
    }
    sclFunc.domain = _sclFunc.domain;
    sclFunc.range = function () { return range; };
    return sclFunc;
}
function makeColorScaleFuncFromTrace(trace, opts) {
    return makeColorScaleFunc(extractScale(trace), opts);
}
function colorArray2rbga(colorArray) {
    const colorObj = {
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
