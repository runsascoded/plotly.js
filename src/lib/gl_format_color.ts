import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import rgba from 'color-normalize';
import Colorscale from '../components/colorscale/index.js';
import { defaultLine as colorDflt } from '../components/color/attributes.js';
import { isArrayOrTypedArray } from './array.js';

var colorDfltRgba = rgba(colorDflt);
var opacityDflt = 1;

function calculateColor(colorIn: number[], opacityIn: number): number[] {
    var colorOut = colorIn;
    colorOut[3] *= opacityIn;
    return colorOut;
}

function validateColor(colorIn: any): number[] {
    if(isNumeric(colorIn)) return colorDfltRgba;

    var colorOut = rgba(colorIn);

    return colorOut.length ? colorOut : colorDfltRgba;
}

function validateOpacity(opacityIn: any): number {
    return isNumeric(opacityIn) ? opacityIn : opacityDflt;
}

function formatColor(containerIn: any, opacityIn: any, len: number): number[] | number[][] {
    var colorIn = containerIn.color;
    if(colorIn && colorIn._inputArray) colorIn = colorIn._inputArray;

    var isArrayColorIn = isArrayOrTypedArray(colorIn);
    var isArrayOpacityIn = isArrayOrTypedArray(opacityIn);
    var cOpts = Colorscale.extractOpts(containerIn);
    var colorOut: any[] = [];

    var sclFunc: any, getColor: any, getOpacity: any, colori: any, opacityi: any;

    if(cOpts.colorscale !== undefined) {
        sclFunc = Colorscale.makeColorScaleFuncFromTrace(containerIn);
    } else {
        sclFunc = validateColor;
    }

    if(isArrayColorIn) {
        getColor = function(c: any, i: number): number[] {
            // FIXME: there is double work, considering that sclFunc does the opposite
            return c[i] === undefined ? colorDfltRgba : rgba(sclFunc(c[i]));
        };
    } else getColor = validateColor;

    if(isArrayOpacityIn) {
        getOpacity = function(o: any, i: number): number {
            return o[i] === undefined ? opacityDflt : validateOpacity(o[i]);
        };
    } else getOpacity = validateOpacity;

    if(isArrayColorIn || isArrayOpacityIn) {
        for(var i = 0; i < len; i++) {
            colori = getColor(colorIn, i);
            opacityi = getOpacity(opacityIn, i);
            colorOut[i] = calculateColor(colori, opacityi);
        }
    } else colorOut = calculateColor(rgba(colorIn), opacityIn);

    return colorOut;
}

function parseColorScale(cont: any): { index: number; rgb: number[] }[] {
    var cOpts = Colorscale.extractOpts(cont);

    var colorscale = cOpts.colorscale;
    if(cOpts.reversescale) colorscale = Colorscale.flipScale(cOpts.colorscale);

    return colorscale.map(function(elem: any[]) {
        var index = elem[0];
        var color = tinycolor(elem[1]);
        var rgb = color.toRgb();
        return {
            index: index,
            rgb: [rgb.r, rgb.g, rgb.b, rgb.a]
        };
    });
}

export default {
    formatColor: formatColor,
    parseColorScale: parseColorScale
};
