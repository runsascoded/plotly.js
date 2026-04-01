import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import { extendFlat } from './extend.js';
import baseTraceAttrs from '../plots/attributes.js';
import colorscales from '../components/colorscale/scales.js';
import Color from '../components/color/index.js';
import _interactions from '../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import nestedProperty from './nested_property.js';
import { counter as counterRegex } from './regex.js';
import _mod from './mod.js';
const { modHalf } = _mod;
import { isArrayOrTypedArray } from './array.js';
import { isTypedArraySpec } from './array.js';
import { decodeTypedArraySpec } from './array.js';
import type { FullLayout } from '../../types/core';

export var valObjectMeta: Record<string, any> = {
    data_array: {
        // You can use *dflt=[] to force said array to exist though.
        description: [
            'An {array} of data.',
            'The value must represent an {array} or it will be ignored,',
            'but this array can be provided in several forms:',
            '(1) a regular {array} object',
            '(2) a typed array (e.g. Float32Array)',
            '(3) an object with keys dtype, bdata, and optionally shape.',
            'In this 3rd form, dtype is one of',
            '*f8*, *f4*.',
            '*i4*, *u4*,',
            '*i2*, *u2*,',
            '*i1*, *u1* or *u1c* for Uint8ClampedArray.',
            'In addition to shorthand `dtype` above one could also use the following forms:',
            '*float64*, *float32*,',
            '*int32*, *uint32*,',
            '*int16*, *uint16*,',
            '*int8*, *uint8* or *uint8c* for Uint8ClampedArray.',
            '`bdata` is either a base64-encoded string or the ArrayBuffer of',
            'an integer or float typed array.',
            'For either multi-dimensional arrays you must also',
            'provide its dimensions separated by comma via `shape`.',
            'For example using `dtype`: *f4* and `shape`: *5,100* you can',
            'declare a 2-D array that has 5 rows and 100 columns',
            'containing float32 values i.e. 4 bits per value.',
            '`shape` is optional for one dimensional arrays.'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            propOut.set(
                isArrayOrTypedArray(v) ? v :
                isTypedArraySpec(v) ? decodeTypedArraySpec(v) :
                dflt
            );
        }
    },
    enumerated: {
        description: [
            'Enumerated value type. The available values are listed',
            'in `values`.'
        ].join(' '),
        requiredOpts: ['values'],
        otherOpts: ['dflt', 'coerceNumber', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            if(opts.coerceNumber) v = +v;
            if(opts.values.indexOf(v) === -1) propOut.set(dflt);
            else propOut.set(v);
        },
        validateFunction: function(v: any, opts: any): boolean {
            if(opts.coerceNumber) v = +v;

            var values = opts.values;
            for(var i = 0; i < values.length; i++) {
                var k = String(values[i]);

                if((k.charAt(0) === '/' && k.charAt(k.length - 1) === '/')) {
                    var regex = new RegExp(k.slice(1, -1));
                    if(regex.test(v)) return true;
                } else if(v === values[i]) return true;
            }
            return false;
        }
    },
    boolean: {
        description: 'A boolean (true/false) value.',
        requiredOpts: [],
        otherOpts: ['dflt', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            const isBoolean = (value: any): boolean => value === true || value === false;
            if (isBoolean(v) || (opts.arrayOk && Array.isArray(v) && v.length > 0 && v.every(isBoolean))) {
                propOut.set(v);
            } else {
                propOut.set(dflt);
            }
        }
    },
    number: {
        description: [
            'A number or a numeric value',
            '(e.g. a number inside a string).',
            'When applicable, values greater (less) than `max` (`min`)',
            'are coerced to the `dflt`.'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt', 'min', 'max', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            if(isTypedArraySpec(v)) v = decodeTypedArraySpec(v);

            if(!isNumeric(v) ||
                    (opts.min !== undefined && v < opts.min) ||
                    (opts.max !== undefined && v > opts.max)) {
                propOut.set(dflt);
            } else propOut.set(+v);
        }
    },
    integer: {
        description: [
            'An integer or an integer inside a string.',
            'When applicable, values greater (less) than `max` (`min`)',
            'are coerced to the `dflt`.'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt', 'min', 'max', 'arrayOk', 'extras'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            if((opts.extras || []).indexOf(v) !== -1) {
                propOut.set(v);
                return;
            }

            if(isTypedArraySpec(v)) v = decodeTypedArraySpec(v);

            if(v % 1 || !isNumeric(v) ||
                    (opts.min !== undefined && v < opts.min) ||
                    (opts.max !== undefined && v > opts.max)) {
                propOut.set(dflt);
            } else propOut.set(+v);
        }
    },
    string: {
        description: [
            'A string value.',
            'Numbers are converted to strings except for attributes with',
            '`strict` set to true.'
        ].join(' '),
        requiredOpts: [],
        // TODO 'values shouldn't be in there (edge case: 'dash' in Scatter)
        otherOpts: ['dflt', 'noBlank', 'strict', 'arrayOk', 'values'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            if(typeof v !== 'string') {
                var okToCoerce = (typeof v === 'number');

                if(opts.strict === true || !okToCoerce) propOut.set(dflt);
                else propOut.set(String(v));
            } else if(opts.noBlank && !v) propOut.set(dflt);
            else propOut.set(v);
        }
    },
    color: {
        description: [
            'A string describing color.',
            'Supported formats:',
            '- hex (e.g. \'#d3d3d3\')',
            '- rgb (e.g. \'rgb(255, 0, 0)\')',
            '- rgba (e.g. \'rgb(255, 0, 0, 0.5)\')',
            '- hsl (e.g. \'hsl(0, 100%, 50%)\')',
            '- hsv (e.g. \'hsv(0, 100%, 100%)\')',
            '- named colors (full list: http://www.w3.org/TR/css3-color/#svg-color)'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            if(isTypedArraySpec(v)) v = decodeTypedArraySpec(v);

            if(tinycolor(v).isValid()) propOut.set(v);
            else propOut.set(dflt);
        }
    },
    colorlist: {
        description: [
            'A list of colors.',
            'Must be an {array} containing valid colors.',
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            function isColor(color: any): boolean {
                return tinycolor(color).isValid();
            }
            if(!Array.isArray(v) || !v.length) propOut.set(dflt);
            else if(v.every(isColor)) propOut.set(v);
            else propOut.set(dflt);
        }
    },
    colorscale: {
        description: [
            'A Plotly colorscale either picked by a name:',
            '(any of', Object.keys(colorscales.scales).join(', '), ')',
            'customized as an {array} of 2-element {arrays} where',
            'the first element is the normalized color level value',
            '(starting at *0* and ending at *1*),',
            'and the second item is a valid color string.'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            propOut.set(colorscales.get(v, dflt));
        }
    },
    angle: {
        description: [
            'A number (in degree) between -180 and 180.'
        ].join(' '),
        requiredOpts: [],
        otherOpts: ['dflt', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            if(isTypedArraySpec(v)) v = decodeTypedArraySpec(v);

            if(v === 'auto') propOut.set('auto');
            else if(!isNumeric(v)) propOut.set(dflt);
            else propOut.set(modHalf(+v, 360));
        }
    },
    subplotid: {
        description: [
            'An id string of a subplot type (given by dflt), optionally',
            'followed by an integer >1. e.g. if dflt=\'geo\', we can have',
            '\'geo\', \'geo2\', \'geo3\', ...'
        ].join(' '),
        requiredOpts: ['dflt'],
        otherOpts: ['regex', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            var regex = opts.regex || counterRegex(dflt);
            const isSubplotId = (value: any): boolean => typeof value === 'string' && regex.test(value);
            if (isSubplotId(v) || (opts.arrayOk && isArrayOrTypedArray(v) && v.length > 0 && v.every(isSubplotId))) {
                propOut.set(v);
            } else {
                propOut.set(dflt);
            }
        },
        validateFunction: function(v: any, opts: any): boolean {
            var dflt = opts.dflt;

            if(v === dflt) return true;
            if(typeof v !== 'string') return false;
            if(counterRegex(dflt).test(v)) return true;

            return false;
        }
    },
    flaglist: {
        description: [
            'A string representing a combination of flags',
            '(order does not matter here).',
            'Combine any of the available `flags` with *+*.',
            '(e.g. (\'lines+markers\')).',
            'Values in `extras` cannot be combined.'
        ].join(' '),
        requiredOpts: ['flags'],
        otherOpts: ['dflt', 'extras', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            if((opts.extras || []).indexOf(v) !== -1) {
                propOut.set(v);
                return;
            }
            if(typeof v !== 'string') {
                propOut.set(dflt);
                return;
            }
            var vParts = v.split('+');
            var i = 0;
            while(i < vParts.length) {
                var vi = vParts[i];
                if(opts.flags.indexOf(vi) === -1 || vParts.indexOf(vi) < i) {
                    vParts.splice(i, 1);
                } else i++;
            }
            if(!vParts.length) propOut.set(dflt);
            else propOut.set(vParts.join('+'));
        }
    },
    any: {
        description: 'Any type.',
        requiredOpts: [],
        otherOpts: ['dflt', 'values', 'arrayOk'],
        coerceFunction: function(v: any, propOut: any, dflt: any) {
            if(v === undefined) {
                propOut.set(dflt);
            } else {
                propOut.set(
                    isTypedArraySpec(v) ? decodeTypedArraySpec(v) :
                    v
                );
            }
        }
    },
    info_array: {
        description: [
            'An {array} of plot information.'
        ].join(' '),
        requiredOpts: ['items'],
        // set `dimensions=2` for a 2D array or '1-2' for either
        // `items` may be a single object instead of an array, in which case
        // `freeLength` must be true.
        // if `dimensions='1-2'` and items is a 1D array, then the value can
        // either be a matching 1D array or an array of such matching 1D arrays
        otherOpts: ['dflt', 'freeLength', 'dimensions'],
        coerceFunction: function(v: any, propOut: any, dflt: any, opts: any) {
            // simplified coerce function just for array items
            function coercePart(v: any, opts: any, dflt: any): any {
                var out: any;
                var propPart = {set: function(v: any) { out = v; }};

                if(dflt === undefined) dflt = opts.dflt;

                valObjectMeta[opts.valType].coerceFunction(v, propPart, dflt, opts);

                return out;
            }

            if(isTypedArraySpec(v)) v = decodeTypedArraySpec(v);

            if(!isArrayOrTypedArray(v)) {
                propOut.set(dflt);
                return;
            }

            var twoD = opts.dimensions === 2 || (opts.dimensions === '1-2' && Array.isArray(v) && isArrayOrTypedArray(v[0]));

            var items = opts.items;
            var vOut: any[] = [];
            var arrayItems = Array.isArray(items);
            var arrayItems2D = arrayItems && twoD && isArrayOrTypedArray(items[0]);
            var innerItemsOnly = twoD && arrayItems && !arrayItems2D;
            var len = (arrayItems && !innerItemsOnly) ? items.length : v.length;

            var i: number, j: number, row: any, item: any, len2: number, vNew: any;

            dflt = Array.isArray(dflt) ? dflt : [];

            if(twoD) {
                for(i = 0; i < len; i++) {
                    vOut[i] = [];
                    row = isArrayOrTypedArray(v[i]) ? v[i] : [];
                    if(innerItemsOnly) len2 = items.length;
                    else if(arrayItems) len2 = items[i].length;
                    else len2 = row.length;

                    for(j = 0; j < len2; j++) {
                        if(innerItemsOnly) item = items[j];
                        else if(arrayItems) item = items[i][j];
                        else item = items;

                        vNew = coercePart(row[j], item, (dflt[i] || [])[j]);
                        if(vNew !== undefined) vOut[i][j] = vNew;
                    }
                }
            } else {
                for(i = 0; i < len; i++) {
                    vNew = coercePart(v[i], arrayItems ? items[i] : items, dflt[i]);
                    if(vNew !== undefined) vOut[i] = vNew;
                }
            }

            propOut.set(vOut);
        },
        validateFunction: function(v: any, opts: any): boolean {
            if(!isArrayOrTypedArray(v)) return false;

            var items = opts.items;
            var arrayItems = Array.isArray(items);
            var twoD = opts.dimensions === 2;

            // when free length is off, input and declared lengths must match
            if(!opts.freeLength && v.length !== items.length) return false;

            // valid when all input items are valid
            for(var i = 0; i < v.length; i++) {
                if(twoD) {
                    if(!isArrayOrTypedArray(v[i]) || (!opts.freeLength && v[i].length !== items[i].length)) {
                        return false;
                    }
                    for(var j = 0; j < v[i].length; j++) {
                        if(!validate(v[i][j], arrayItems ? items[i][j] : items)) {
                            return false;
                        }
                    }
                } else if(!validate(v[i], arrayItems ? items[i] : items)) return false;
            }

            return true;
        }
    }
};

export var coerce = function(containerIn: any, containerOut: any, attributes: any, attribute: string, dflt?: any): any {
    var opts = nestedProperty(attributes, attribute).get();
    var propIn = nestedProperty(containerIn, attribute);
    var propOut = nestedProperty(containerOut, attribute);
    var v = propIn.get();

    var template = containerOut._template;
    if(v === undefined && template) {
        v = nestedProperty(template, attribute).get();
        // already used the template value, so short-circuit the second check
        template = 0;
    }

    if(dflt === undefined) dflt = opts.dflt;

    if(opts.arrayOk) {
        if(isArrayOrTypedArray(v)) {
            /**
             * arrayOk: value MAY be an array, then we do no value checking
             * at this point, because it can be more complicated than the
             * individual form (eg. some array vals can be numbers, even if the
             * single values must be color strings)
             */

            propOut.set(v);
            return v;
        } else {
            if(isTypedArraySpec(v)) {
                v = decodeTypedArraySpec(v);
                propOut.set(v);
                return v;
            }
        }
    }

    var coerceFunction = valObjectMeta[opts.valType].coerceFunction;
    coerceFunction(v, propOut, dflt, opts);

    var out = propOut.get();
    // in case v was provided but invalid, try the template again so it still
    // overrides the regular default
    if(template && out === dflt && !validate(v, opts)) {
        v = nestedProperty(template, attribute).get();
        coerceFunction(v, propOut, dflt, opts);
        out = propOut.get();
    }
    return out;
};

export var coerce2 = function(containerIn: any, containerOut: any, attributes: any, attribute: string, dflt?: any): any {
    var propIn = nestedProperty(containerIn, attribute);
    var propOut = coerce(containerIn, containerOut, attributes, attribute, dflt);
    var valIn = propIn.get();

    return (valIn !== undefined && valIn !== null) ? propOut : false;
};

export var coerceFont = function(coerce: any, attr: string, dfltObj?: any, opts?: any): any {
    if(!opts) opts = {};
    dfltObj = extendFlat({}, dfltObj);
    dfltObj = extendFlat(dfltObj, opts.overrideDflt || {});

    var out: any = {
        family: coerce(attr + '.family', dfltObj.family),
        size: coerce(attr + '.size', dfltObj.size),
        color: coerce(attr + '.color', dfltObj.color),
        weight: coerce(attr + '.weight', dfltObj.weight),
        style: coerce(attr + '.style', dfltObj.style),
    };

    if(!opts.noFontVariant) out.variant = coerce(attr + '.variant', dfltObj.variant);
    if(!opts.noFontLineposition) out.lineposition = coerce(attr + '.lineposition', dfltObj.lineposition);
    if(!opts.noFontTextcase) out.textcase = coerce(attr + '.textcase', dfltObj.textcase);
    if(!opts.noFontShadow) {
        var dfltShadow = dfltObj.shadow;
        if(dfltShadow === 'none' && opts.autoShadowDflt) {
            dfltShadow = 'auto';
        }
        out.shadow = coerce(attr + '.shadow', dfltShadow);
    }

    return out;
};

export var coercePattern = function(coerce: any, attr: string, markerColor: any, hasMarkerColorscale: boolean): void {
    var shape = coerce(attr + '.shape');
    var path: any;
    if(!shape) {
        path = coerce(attr + '.path');
    }
    if(shape || path) {
        if(shape) {
            coerce(attr + '.solidity');
        }
        coerce(attr + '.size');
        var fillmode = coerce(attr + '.fillmode');
        var isOverlay = fillmode === 'overlay';

        if(!hasMarkerColorscale) {
            var bgcolor = coerce(attr + '.bgcolor', isOverlay ?
                markerColor :
                undefined
            );

            coerce(attr + '.fgcolor', isOverlay ?
                Color.contrast(bgcolor) :
                markerColor
            );
        }

        coerce(attr + '.fgopacity', isOverlay ?
            0.5 :
            1
        );
    }
};

export var coerceHoverinfo = function(traceIn: any, traceOut: any, layoutOut: FullLayout): any {
    var moduleAttrs = traceOut._module.attributes;
    var attrs = moduleAttrs.hoverinfo ? moduleAttrs : baseTraceAttrs;

    var valObj = attrs.hoverinfo;
    var dflt: any;

    if(layoutOut._dataLength === 1) {
        var flags = valObj.dflt === 'all' ?
            valObj.flags.slice() :
            valObj.dflt.split('+');

        flags.splice(flags.indexOf('name'), 1);
        dflt = flags.join('+');
    }

    return coerce(traceIn, traceOut, attrs, 'hoverinfo', dflt);
};

export var coerceSelectionMarkerOpacity = function(traceOut: any, coerce: any): void {
    if(!traceOut.marker) return;

    var mo = traceOut.marker.opacity;
    // you can still have a `marker` container with no markers if there's text
    if(mo === undefined) return;

    var smoDflt: any;
    var usmoDflt: any;

    // Don't give [un]selected.marker.opacity a default value if
    // marker.opacity is an array: handle this during style step.
    //
    // Only give [un]selected.marker.opacity a default value if you don't
    // set any other [un]selected attributes.
    if(!isArrayOrTypedArray(mo) && !traceOut.selected && !traceOut.unselected) {
        smoDflt = mo;
        usmoDflt = DESELECTDIM * mo;
    }

    coerce('selected.marker.opacity', smoDflt);
    coerce('unselected.marker.opacity', usmoDflt);
};

function validate(value: any, opts: any): boolean {
    var valObjectDef = valObjectMeta[opts.valType];

    if(opts.arrayOk && isArrayOrTypedArray(value)) return true;

    if(valObjectDef.validateFunction) {
        return valObjectDef.validateFunction(value, opts);
    }

    var failed: any = {};
    var out: any = failed;
    var propMock = { set: function(v: any) { out = v; } };

    // 'failed' just something mutable that won't be === anything else

    valObjectDef.coerceFunction(value, propMock, failed, opts);
    return out !== failed;
}
export { validate };

export default { valObjectMeta, coerce, coerce2, coerceFont, coercePattern, coerceHoverinfo, coerceSelectionMarkerOpacity, validate };
