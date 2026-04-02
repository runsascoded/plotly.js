import Lib from '../lib/index.js';
import Registry from '../registry.js';
import Axes from '../plots/cartesian/axes.js';
import { pointsAccessorFunction } from './helpers.js';
import filterOps from '../constants/filter_ops.js';
const COMPARISON_OPS = filterOps.COMPARISON_OPS;
const INTERVAL_OPS = filterOps.INTERVAL_OPS;
const SET_OPS = filterOps.SET_OPS;

export const moduleType = 'transform';
export const name = 'filter';

export const attributes = {
    enabled: {
        valType: 'boolean',
        dflt: true,
        editType: 'calc',
        description: [
            'Determines whether this filter transform is enabled or disabled.'
        ].join(' ')
    },
    target: {
        valType: 'string',
        strict: true,
        noBlank: true,
        arrayOk: true,
        dflt: 'x',
        editType: 'calc',
        description: [
            'Sets the filter target by which the filter is applied.',

            'If a string, `target` is assumed to be a reference to a data array',
            'in the parent trace object.',
            'To filter about nested variables, use *.* to access them.',
            'For example, set `target` to *marker.color* to filter',
            'about the marker color array.',

            'If an array, `target` is then the data array by which the filter is applied.'
        ].join(' ')
    },
    operation: {
        valType: 'enumerated',
        values: []
            .concat((COMPARISON_OPS as any))
            .concat((INTERVAL_OPS as any))
            .concat((SET_OPS as any)),
        dflt: '=',
        editType: 'calc',
        description: [
            'Sets the filter operation.',

            '*=* keeps items equal to `value`',
            '*!=* keeps items not equal to `value`',

            '*<* keeps items less than `value`',
            '*<=* keeps items less than or equal to `value`',

            '*>* keeps items greater than `value`',
            '*>=* keeps items greater than or equal to `value`',

            '*[]* keeps items inside `value[0]` to `value[1]` including both bounds',
            '*()* keeps items inside `value[0]` to `value[1]` excluding both bounds',
            '*[)* keeps items inside `value[0]` to `value[1]` including `value[0]` but excluding `value[1]',
            '*(]* keeps items inside `value[0]` to `value[1]` excluding `value[0]` but including `value[1]',

            '*][* keeps items outside `value[0]` to `value[1]` and equal to both bounds',
            '*)(* keeps items outside `value[0]` to `value[1]`',
            '*](* keeps items outside `value[0]` to `value[1]` and equal to `value[0]`',
            '*)[* keeps items outside `value[0]` to `value[1]` and equal to `value[1]`',

            '*{}* keeps items present in a set of values',
            '*}{* keeps items not present in a set of values'
        ].join(' ')
    },
    value: {
        valType: 'any',
        dflt: 0,
        editType: 'calc',
        description: [
            'Sets the value or values by which to filter.',

            'Values are expected to be in the same type as the data linked',
            'to `target`.',

            'When `operation` is set to one of',
            'the comparison values (' + COMPARISON_OPS + ')',
            '`value` is expected to be a number or a string.',

            'When `operation` is set to one of the interval values',
            '(' + INTERVAL_OPS + ')',
            '`value` is expected to be 2-item array where the first item',
            'is the lower bound and the second item is the upper bound.',

            'When `operation`, is set to one of the set values',
            '(' + SET_OPS + ')',
            '`value` is expected to be an array with as many items as',
            'the desired set elements.'
        ].join(' ')
    },
    preservegaps: {
        valType: 'boolean',
        dflt: false,
        editType: 'calc',
        description: [
            'Determines whether or not gaps in data arrays produced by the filter operation',
            'are preserved.',
            'Setting this to *true* might be useful when plotting a line chart',
            'with `connectgaps` set to *false*.'
        ].join(' ')
    },
    editType: 'calc'
};

export function supplyDefaults(transformIn: any) {
    const transformOut: any = {};

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(transformIn, transformOut, attributes, attr, dflt);
    }

    const enabled = coerce('enabled');

    if(enabled) {
        const target = coerce('target');

        if(Lib.isArrayOrTypedArray(target) && target.length === 0) {
            transformOut.enabled = false;
            return transformOut;
        }

        coerce('preservegaps');
        coerce('operation');
        coerce('value');

        const handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleDefaults');
        handleCalendarDefaults(transformIn, transformOut, 'valuecalendar', null);
        handleCalendarDefaults(transformIn, transformOut, 'targetcalendar', null);
    }

    return transformOut;
}

export function calcTransform(gd: any, trace: any, opts: any) {
    if(!opts.enabled) return;

    const targetArray = Lib.getTargetArray(trace, opts);
    if(!targetArray) return;

    const target = opts.target;

    let len = targetArray.length;
    if(trace._length) len = Math.min(len, trace._length);

    let targetCalendar = opts.targetcalendar;
    const arrayAttrs = trace._arrayAttrs;
    const preservegaps = opts.preservegaps;

    // even if you provide targetcalendar, if target is a string and there
    // is a calendar attribute matching target it will get used instead.
    if(typeof target === 'string') {
        const attrTargetCalendar = Lib.nestedProperty(trace, target + 'calendar').get();
        if(attrTargetCalendar) targetCalendar = attrTargetCalendar;
    }

    const d2c = Axes.getDataToCoordFunc(gd, trace, target, targetArray);
    const filterFunc = getFilterFunc(opts, d2c, targetCalendar);
    const originalArrays: any = {};
    const indexToPoints: any = {};
    let index = 0;

    function forAllAttrs(fn: any, index?: any) {
        for(let j = 0; j < arrayAttrs.length; j++) {
            const np = Lib.nestedProperty(trace, arrayAttrs[j]);
            fn(np, index);
        }
    }

    let initFn;
    let fillFn;
    if(preservegaps) {
        initFn = function(np: any) {
            originalArrays[np.astr] = Lib.extendDeep([], np.get());
            np.set(new Array(len));
        };
        fillFn = function(np: any, index: any) {
            const val = originalArrays[np.astr][index];
            np.get()[index] = val;
        };
    } else {
        initFn = function(np: any) {
            originalArrays[np.astr] = Lib.extendDeep([], np.get());
            np.set([]);
        };
        fillFn = function(np: any, index: any) {
            const val = originalArrays[np.astr][index];
            np.get().push(val);
        };
    }

    // copy all original array attribute values, and clear arrays in trace
    forAllAttrs(initFn);

    const originalPointsAccessor = pointsAccessorFunction(trace.transforms, opts);

    // loop through filter array, fill trace arrays if passed
    for(let i = 0; i < len; i++) {
        const passed = filterFunc!(targetArray[i]);
        if(passed) {
            forAllAttrs(fillFn, i);
            indexToPoints[index++] = originalPointsAccessor(i);
        } else if(preservegaps) index++;
    }

    opts._indexToPoints = indexToPoints;
    trace._length = index;
}

function getFilterFunc(opts: any, d2c: any, targetCalendar: any) {
    const operation = opts.operation;
    const value = opts.value;
    const hasArrayValue = Lib.isArrayOrTypedArray(value);

    function isOperationIn(array: any) {
        return array.indexOf(operation) !== -1;
    }

    const d2cValue = function(v: any) { return d2c(v, 0, opts.valuecalendar); };
    const d2cTarget = function(v: any) { return d2c(v, 0, targetCalendar); };

    let coercedValue: any;

    if(isOperationIn(COMPARISON_OPS)) {
        coercedValue = hasArrayValue ? d2cValue(value[0]) : d2cValue(value);
    } else if(isOperationIn(INTERVAL_OPS)) {
        coercedValue = hasArrayValue ?
            [d2cValue(value[0]), d2cValue(value[1])] :
            [d2cValue(value), d2cValue(value)];
    } else if(isOperationIn(SET_OPS)) {
        coercedValue = hasArrayValue ? value.map(d2cValue) : [d2cValue(value)];
    }

    switch(operation) {
        case '=':
            return function(v: any) { return d2cTarget(v) === coercedValue; };

        case '!=':
            return function(v: any) { return d2cTarget(v) !== coercedValue; };

        case '<':
            return function(v: any) { return d2cTarget(v) < coercedValue; };

        case '<=':
            return function(v: any) { return d2cTarget(v) <= coercedValue; };

        case '>':
            return function(v: any) { return d2cTarget(v) > coercedValue; };

        case '>=':
            return function(v: any) { return d2cTarget(v) >= coercedValue; };

        case '[]':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv >= coercedValue[0] && cv <= coercedValue[1];
            };

        case '()':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv > coercedValue[0] && cv < coercedValue[1];
            };

        case '[)':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv >= coercedValue[0] && cv < coercedValue[1];
            };

        case '(]':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv > coercedValue[0] && cv <= coercedValue[1];
            };

        case '][':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv <= coercedValue[0] || cv >= coercedValue[1];
            };

        case ')(':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv < coercedValue[0] || cv > coercedValue[1];
            };

        case '](':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv <= coercedValue[0] || cv > coercedValue[1];
            };

        case ')[':
            return function(v: any) {
                const cv = d2cTarget(v);
                return cv < coercedValue[0] || cv >= coercedValue[1];
            };

        case '{}':
            return function(v: any) {
                return coercedValue.indexOf(d2cTarget(v)) !== -1;
            };

        case '}{':
            return function(v: any) {
                return coercedValue.indexOf(d2cTarget(v)) === -1;
            };
    }
}

export default { moduleType, name, attributes, supplyDefaults, calcTransform };
