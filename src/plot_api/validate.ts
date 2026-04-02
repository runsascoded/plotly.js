import Lib from '../lib/index.js';
import Plots from '../plots/plots.js';
import PlotSchema from './plot_schema.js';
import _plot_config from './plot_config.js';
const { dfltConfig } = _plot_config;

const isPlainObject = Lib.isPlainObject;
const isArray = Array.isArray;
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;

export default function validate(data?: any, layout?: any): any {
    if(data === undefined) data = [];
    if(layout === undefined) layout = {};

    const schema = PlotSchema.get();
    const errorList: any = [];
    const gd: any = {_context: Lib.extendFlat({}, dfltConfig)};

    let dataIn, layoutIn;

    if(isArray(data)) {
        gd.data = Lib.extendDeep([], data);
        dataIn = data;
    } else {
        gd.data = [];
        dataIn = [];
        errorList.push(format('array', 'data'));
    }

    if(isPlainObject(layout)) {
        gd.layout = Lib.extendDeep({}, layout);
        layoutIn = layout;
    } else {
        gd.layout = {};
        layoutIn = {};
        if(arguments.length > 1) {
            errorList.push(format('object', 'layout'));
        }
    }

    // N.B. dataIn and layoutIn are in general not the same as
    // gd.data and gd.layout after supplyDefaults as some attributes
    // in gd.data and gd.layout (still) get mutated during this step.

    Plots.supplyDefaults(gd);

    const dataOut = gd._fullData;
    const len = dataIn.length;

    for(let i = 0; i < len; i++) {
        const traceIn = dataIn[i];
        const base = ['data', i];

        if(!isPlainObject(traceIn)) {
            errorList.push(format('object', base));
            continue;
        }

        const traceOut: any = dataOut[i];
        const traceType = traceOut.type;
        const traceSchema: any = schema.traces[traceType].attributes;

        // PlotSchema does something fancy with trace 'type', reset it here
        // to make the trace schema compatible with Lib.validate.
        traceSchema.type = {
            valType: 'enumerated',
            values: [traceType]
        };

        if(traceOut.visible === false && traceIn.visible !== false) {
            errorList.push(format('invisible', base));
        }

        crawl(traceIn, traceOut, traceSchema, errorList, base);
    }

    const layoutOut = gd._fullLayout;
    const layoutSchema = fillLayoutSchema(schema, dataOut);

    crawl(layoutIn, layoutOut, layoutSchema, errorList, 'layout');

    // return undefined if no validation errors were found
    return (errorList.length === 0) ? void(0) : errorList;
}

function crawl(objIn?: any, objOut?: any, schema?: any, list?: any, base?: any, path?: any): any {
    path = path || [];

    const keys = Object.keys(objIn);

    for(let i = 0; i < keys.length; i++) {
        const k = keys[i];

        const p = path.slice();
        p.push(k);

        const valIn = objIn[k];
        const valOut = objOut[k];

        const nestedSchema: any = getNestedSchema(schema, k);
        const nestedValType = (nestedSchema || {}).valType;
        const isInfoArray = nestedValType === 'info_array';
        const isColorscale = nestedValType === 'colorscale';
        const items = (nestedSchema || {}).items;

        if(!isInSchema(schema, k)) {
            list.push(format('schema', base, p));
        } else if(isPlainObject(valIn) && isPlainObject(valOut) && nestedValType !== 'any') {
            crawl(valIn, valOut, nestedSchema, list, base, p);
        } else if(isInfoArray && isArray(valIn)) {
            if(valIn.length > valOut.length) {
                list.push(format('unused', base, p.concat(valOut.length)));
            }
            let len = valOut.length;
            const arrayItems = Array.isArray(items);
            if(arrayItems) len = Math.min(len, items.length);
            let m, n, item, valInPart, valOutPart;
            if(nestedSchema.dimensions === 2) {
                for(n = 0; n < len; n++) {
                    if(isArray(valIn[n])) {
                        if(valIn[n].length > valOut[n].length) {
                            list.push(format('unused', base, p.concat(n, valOut[n].length)));
                        }
                        const len2 = valOut[n].length;
                        for(m = 0; m < (arrayItems ? Math.min(len2, items[n].length) : len2); m++) {
                            item = arrayItems ? items[n][m] : items;
                            valInPart = valIn[n][m];
                            valOutPart = valOut[n][m];
                            if(!Lib.validate(valInPart, item)) {
                                list.push(format('value', base, p.concat(n, m), valInPart));
                            } else if(valOutPart !== valInPart && valOutPart !== +valInPart) {
                                list.push(format('dynamic', base, p.concat(n, m), valInPart, valOutPart));
                            }
                        }
                    } else {
                        list.push(format('array', base, p.concat(n), valIn[n]));
                    }
                }
            } else {
                for(n = 0; n < len; n++) {
                    item = arrayItems ? items[n] : items;
                    valInPart = valIn[n];
                    valOutPart = valOut[n];
                    if(!Lib.validate(valInPart, item)) {
                        list.push(format('value', base, p.concat(n), valInPart));
                    } else if(valOutPart !== valInPart && valOutPart !== +valInPart) {
                        list.push(format('dynamic', base, p.concat(n), valInPart, valOutPart));
                    }
                }
            }
        } else if(nestedSchema.items && !isInfoArray && isArray(valIn)) {
            const _nestedSchema = items[Object.keys(items)[0]];
            const indexList: any[] = [];

            let j, _p;

            // loop over valOut items while keeping track of their
            // corresponding input container index (given by _index)
            for(j = 0; j < valOut.length; j++) {
                const _index = valOut[j]._index || j;

                _p = p.slice();
                _p.push(_index);

                if(isPlainObject(valIn[_index]) && isPlainObject(valOut[j])) {
                    indexList.push(_index);
                    const valInj = valIn[_index];
                    const valOutj: any = valOut[j];
                    if(isPlainObject(valInj) && valInj.visible !== false && valOutj.visible === false) {
                        list.push(format('invisible', base, _p));
                    } else crawl(valInj, valOutj, _nestedSchema, list, base, _p);
                }
            }

            // loop over valIn to determine where it went wrong for some items
            for(j = 0; j < valIn.length; j++) {
                _p = p.slice();
                _p.push(j);

                if(!isPlainObject(valIn[j])) {
                    list.push(format('object', base, _p, valIn[j]));
                } else if(indexList.indexOf(j) === -1) {
                    list.push(format('unused', base, _p));
                }
            }
        } else if(!isPlainObject(valIn) && isPlainObject(valOut)) {
            list.push(format('object', base, p, valIn));
        } else if(!isArrayOrTypedArray(valIn) && isArrayOrTypedArray(valOut) && !isInfoArray && !isColorscale) {
            list.push(format('array', base, p, valIn));
        } else if(!(k in objOut)) {
            list.push(format('unused', base, p, valIn));
        } else if(!Lib.validate(valIn, nestedSchema)) {
            list.push(format('value', base, p, valIn));
        } else if(nestedSchema.valType === 'enumerated' &&
            (
                (nestedSchema.coerceNumber && valIn !== +valOut) ||
                (!isArrayOrTypedArray(valIn) && valIn !== valOut) ||
                (String(valIn) !== String(valOut))
            )
        ) {
            list.push(format('dynamic', base, p, valIn, valOut));
        }
    }

    return list;
}

// the 'full' layout schema depends on the traces types presents
function fillLayoutSchema(schema?: any, dataOut?: any): any {
    const layoutSchema = schema.layout.layoutAttributes;

    for(let i = 0; i < dataOut.length; i++) {
        const traceOut: any = dataOut[i];
        const traceSchema: any = schema.traces[traceOut.type];
        const traceLayoutAttr = traceSchema.layoutAttributes;

        if(traceLayoutAttr) {
            if(traceOut.subplot) {
                Lib.extendFlat(layoutSchema[traceSchema.attributes.subplot.dflt], traceLayoutAttr);
            } else {
                Lib.extendFlat(layoutSchema, traceLayoutAttr);
            }
        }
    }

    return layoutSchema;
}

// validation error codes
const code2msgFunc: any = {
    object: function(base, astr) {
        let prefix;

        if(base === 'layout' && astr === '') prefix = 'The layout argument';
        else if(base[0] === 'data' && astr === '') {
            prefix = 'Trace ' + base[1] + ' in the data argument';
        } else prefix = inBase(base) + 'key ' + astr;

        return prefix + ' must be linked to an object container';
    },
    array: function(base, astr) {
        let prefix;

        if(base === 'data') prefix = 'The data argument';
        else prefix = inBase(base) + 'key ' + astr;

        return prefix + ' must be linked to an array container';
    },
    schema: function(base, astr) {
        return inBase(base) + 'key ' + astr + ' is not part of the schema';
    },
    unused: function(base, astr, valIn) {
        const target = isPlainObject(valIn) ? 'container' : 'key';

        return inBase(base) + target + ' ' + astr + ' did not get coerced';
    },
    dynamic: function(base, astr, valIn, valOut) {
        return [
            inBase(base) + 'key',
            astr,
            '(set to \'' + valIn + '\')',
            'got reset to',
            '\'' + valOut + '\'',
            'during defaults.'
        ].join(' ');
    },
    invisible: function(base, astr) {
        return (
            astr ? (inBase(base) + 'item ' + astr) : ('Trace ' + base[1])
        ) + ' got defaulted to be not visible';
    },
    value: function(base, astr, valIn) {
        return [
            inBase(base) + 'key ' + astr,
            'is set to an invalid value (' + valIn + ')'
        ].join(' ');
    }
};

function inBase(base?: any): string {
    if(isArray(base)) return 'In data trace ' + base[1] + ', ';

    return 'In ' + base + ', ';
}

function format(code?: any, base?: any, path?: any, valIn?: any, valOut?: any): any {
    path = path || '';

    let container, trace;

    // container is either 'data' or 'layout
    // trace is the trace index if 'data', null otherwise

    if(isArray(base)) {
        container = base[0];
        trace = base[1];
    } else {
        container = base;
        trace = null;
    }

    const astr = convertPathToAttributeString(path);
    const msg = code2msgFunc[code](base, astr, valIn, valOut);

    // log to console if logger config option is enabled
    Lib.log(msg);

    return {
        code: code,
        container: container,
        trace: trace,
        path: path,
        astr: astr,
        msg: msg
    };
}

function isInSchema(schema?: any, key?: any): any {
    const parts = splitKey(key);
    const keyMinusId = parts.keyMinusId;
    const id = parts.id;

    if((keyMinusId in schema) && schema[keyMinusId]._isSubplotObj && id) {
        return true;
    }

    return (key in schema);
}

function getNestedSchema(schema?: any, key?: any): any {
    if(key in schema) return schema[key];

    const parts = splitKey(key);

    return schema[parts.keyMinusId];
}

const idRegex = Lib.counterRegex('([a-z]+)');

function splitKey(key?: any): any {
    const idMatch = key.match(idRegex);

    return {
        keyMinusId: idMatch && idMatch[1],
        id: idMatch && idMatch[2]
    };
}

function convertPathToAttributeString(path?: any): any {
    if(!isArray(path)) return String(path);

    let astr = '';

    for(let i = 0; i < path.length; i++) {
        const p = path[i];

        if(typeof p === 'number') {
            astr = astr.slice(0, -1) + '[' + p + ']';
        } else {
            astr += p;
        }

        if(i < path.length - 1) astr += '.';
    }

    return astr;
}
