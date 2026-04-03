import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import { getComponentMethod } from '../../registry.js';
export default function handleXYZDefaults(traceIn, traceOut, coerce, layout, xName, yName) {
    const z = coerce('z');
    xName = xName || 'x';
    yName = yName || 'y';
    let x, y;
    if (z === undefined || !z.length)
        return 0;
    if (Lib.isArray1D(z)) {
        x = coerce(xName);
        y = coerce(yName);
        const xlen = Lib.minRowLength(x);
        const ylen = Lib.minRowLength(y);
        // column z must be accompanied by xName and yName arrays
        if (xlen === 0 || ylen === 0)
            return 0;
        traceOut._length = Math.min(xlen, ylen, z.length);
    }
    else {
        x = coordDefaults(xName, coerce);
        y = coordDefaults(yName, coerce);
        // TODO put z validation elsewhere
        if (!isValidZ(z))
            return 0;
        coerce('transpose');
        traceOut._length = null;
    }
    const handleCalendarDefaults = getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, [xName, yName], layout);
    return true;
}
function coordDefaults(coordStr, coerce) {
    const coord = coerce(coordStr);
    const coordType = coord ? coerce(coordStr + 'type', 'array') : 'scaled';
    if (coordType === 'scaled') {
        coerce(coordStr + '0');
        coerce('d' + coordStr);
    }
    return coord;
}
function isValidZ(z) {
    let allRowsAreArrays = true;
    let oneRowIsFilled = false;
    let hasOneNumber = false;
    let zi;
    /*
     * Without this step:
     *
     * hasOneNumber = false breaks contour but not heatmap
     * allRowsAreArrays = false breaks contour but not heatmap
     * oneRowIsFilled = false breaks both
     */
    for (let i = 0; i < z.length; i++) {
        zi = z[i];
        if (!Lib.isArrayOrTypedArray(zi)) {
            allRowsAreArrays = false;
            break;
        }
        if (zi.length > 0)
            oneRowIsFilled = true;
        for (let j = 0; j < zi.length; j++) {
            if (isNumeric(zi[j])) {
                hasOneNumber = true;
                break;
            }
        }
    }
    return (allRowsAreArrays && oneRowIsFilled && hasOneNumber);
}
