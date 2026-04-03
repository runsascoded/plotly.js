import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import rgba from 'color-normalize';
import Colorscale from '../components/colorscale/index.js';
import { defaultLine as colorDflt } from '../components/color/attributes.js';
import { isArrayOrTypedArray } from './array.js';
const colorDfltRgba = rgba(colorDflt);
const opacityDflt = 1;
function calculateColor(colorIn, opacityIn) {
    const colorOut = colorIn;
    colorOut[3] *= opacityIn;
    return colorOut;
}
function validateColor(colorIn) {
    if (isNumeric(colorIn))
        return colorDfltRgba;
    const colorOut = rgba(colorIn);
    return colorOut.length ? colorOut : colorDfltRgba;
}
function validateOpacity(opacityIn) {
    return isNumeric(opacityIn) ? opacityIn : opacityDflt;
}
function formatColor(containerIn, opacityIn, len) {
    let colorIn = containerIn.color;
    if (colorIn && colorIn._inputArray)
        colorIn = colorIn._inputArray;
    const isArrayColorIn = isArrayOrTypedArray(colorIn);
    const isArrayOpacityIn = isArrayOrTypedArray(opacityIn);
    const cOpts = Colorscale.extractOpts(containerIn);
    let colorOut = [];
    let sclFunc, getColor, getOpacity, colori, opacityi;
    if (cOpts.colorscale !== undefined) {
        sclFunc = Colorscale.makeColorScaleFuncFromTrace(containerIn);
    }
    else {
        sclFunc = validateColor;
    }
    if (isArrayColorIn) {
        getColor = function (c, i) {
            // FIXME: there is double work, considering that sclFunc does the opposite
            return c[i] === undefined ? colorDfltRgba : rgba(sclFunc(c[i]));
        };
    }
    else
        getColor = validateColor;
    if (isArrayOpacityIn) {
        getOpacity = function (o, i) {
            return o[i] === undefined ? opacityDflt : validateOpacity(o[i]);
        };
    }
    else
        getOpacity = validateOpacity;
    if (isArrayColorIn || isArrayOpacityIn) {
        for (let i = 0; i < len; i++) {
            colori = getColor(colorIn, i);
            opacityi = getOpacity(opacityIn, i);
            colorOut[i] = calculateColor(colori, opacityi);
        }
    }
    else
        colorOut = calculateColor(rgba(colorIn), opacityIn);
    return colorOut;
}
function parseColorScale(cont) {
    const cOpts = Colorscale.extractOpts(cont);
    let colorscale = cOpts.colorscale;
    if (cOpts.reversescale)
        colorscale = Colorscale.flipScale(cOpts.colorscale);
    return colorscale.map((elem) => {
        const index = elem[0];
        const color = tinycolor(elem[1]);
        const rgb = color.toRgb();
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
