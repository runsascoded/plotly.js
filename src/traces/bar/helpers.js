import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;

export var coerceString = function(attributeDefinition, value, defaultValue) {
    if(typeof value === 'string') {
        if(value || !attributeDefinition.noBlank) return value;
    } else if(typeof value === 'number' || value === true) {
        if(!attributeDefinition.strict) return String(value);
    }

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
};

export var coerceNumber = function(attributeDefinition, value, defaultValue) {
    if(isNumeric(value)) {
        value = +value;

        var min = attributeDefinition.min;
        var max = attributeDefinition.max;
        var isOutOfBounds = (min !== undefined && value < min) ||
              (max !== undefined && value > max);

        if(!isOutOfBounds) return value;
    }

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
};

export var coerceColor = function(attributeDefinition, value, defaultValue) {
    if(tinycolor(value).isValid()) return value;

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
};

export var coerceEnumerated = function(attributeDefinition, value, defaultValue) {
    if(attributeDefinition.coerceNumber) value = +value;

    if(attributeDefinition.values.indexOf(value) !== -1) return value;

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
};

export var getValue = function(arrayOrScalar, index) {
    var value;
    if(!isArrayOrTypedArray(arrayOrScalar)) value = arrayOrScalar;
    else if(index < arrayOrScalar.length) value = arrayOrScalar[index];
    return value;
};

export var getLineWidth = function(trace, di) {
    var w =
        (0 < di.mlw) ? di.mlw :
        !isArrayOrTypedArray(trace.marker.line.width) ? trace.marker.line.width :
        0;

    return w;
};

export default { coerceString, coerceNumber, coerceColor, coerceEnumerated, getValue, getLineWidth };
