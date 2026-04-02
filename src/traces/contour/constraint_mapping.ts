import filterOps from '../../constants/filter_ops.js';
import isNumeric from 'fast-isnumeric';

export default {
    '[]': makeRangeSettings('[]'),
    '][': makeRangeSettings(']['),
    '>': makeInequalitySettings('>'),
    '<': makeInequalitySettings('<'),
    '=': makeInequalitySettings('=')
};

// This does not in any way shape or form support calendars. It's adapted from
// transforms/filter.js.
function coerceValue(operation: any,  value: any) {
    const hasArrayValue = Array.isArray(value);

    let coercedValue;

    function coerce(value: any) {
        return isNumeric(value) ? (+value) : null;
    }

    if(filterOps.COMPARISON_OPS2.indexOf(operation) !== -1) {
        coercedValue = hasArrayValue ? coerce(value[0]) : coerce(value);
    } else if(filterOps.INTERVAL_OPS.indexOf(operation) !== -1) {
        coercedValue = hasArrayValue ?
            [coerce(value[0]), coerce(value[1])] :
            [coerce(value), coerce(value)];
    } else if(filterOps.SET_OPS.indexOf(operation) !== -1) {
        coercedValue = hasArrayValue ? value.map(coerce) : [coerce(value)];
    }

    return coercedValue;
}

// Returns a parabola scaled so that the min/max is either +/- 1 and zero at the two values
// provided. The data is mapped by this function when constructing intervals so that it's
// very easy to construct contours as normal.
function makeRangeSettings(operation: any) {
    return function(value: any) {
        value = coerceValue(operation, value);

        // Ensure proper ordering:
        const min = Math.min(value[0], value[1]);
        const max = Math.max(value[0], value[1]);

        return {
            start: min,
            end: max,
            size: max - min
        };
    };
}

function makeInequalitySettings(operation: any) {
    return function(value: any) {
        value = coerceValue(operation, value);

        return {
            start: value,
            end: Infinity,
            size: Infinity
        };
    };
}
