import type { FullTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import { isArrayOrTypedArray } from '../../lib/index.js';

export function coerceString(attributeDefinition: any, value: any, defaultValue?: any): any {
    if(typeof value === 'string') {
        if(value || !attributeDefinition.noBlank) return value;
    } else if(typeof value === 'number' || value === true) {
        if(!attributeDefinition.strict) return String(value);
    }

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
}

export function coerceNumber(attributeDefinition: any, value: any, defaultValue?: any): number {
    if(isNumeric(value)) {
        value = +value;

        const min = attributeDefinition.min;
        const max = attributeDefinition.max;
        const isOutOfBounds = (min !== undefined && value < min) ||
              (max !== undefined && value > max);

        if(!isOutOfBounds) return value;
    }

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
}

export function coerceColor(attributeDefinition: any, value: any, defaultValue?: any): any {
    if(tinycolor(value).isValid()) return value;

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
}

export function coerceEnumerated(attributeDefinition: any, value: any, defaultValue?: any): any {
    if(attributeDefinition.coerceNumber) value = +value;

    if(attributeDefinition.values.indexOf(value) !== -1) return value;

    return (defaultValue !== undefined) ?
      defaultValue :
      attributeDefinition.dflt;
}

export function getValue(arrayOrScalar: any, index: number): any {
    let value;
    if(!isArrayOrTypedArray(arrayOrScalar)) value = arrayOrScalar;
    else if(index < arrayOrScalar.length) value = arrayOrScalar[index];
    return value;
}

export function getLineWidth(trace: FullTrace, di: any): number {
    const w =
        (0 < di.mlw) ? di.mlw :
        !isArrayOrTypedArray(trace.marker.line.width) ? trace.marker.line.width :
        0;

    return w;
}

export default { coerceString, coerceNumber, coerceColor, coerceEnumerated, getValue, getLineWidth };
