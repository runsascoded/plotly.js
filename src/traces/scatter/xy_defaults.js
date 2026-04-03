import { minRowLength } from '../../lib/index.js';
import { getComponentMethod } from '../../registry.js';
export default function handleXYDefaults(traceIn, traceOut, layout, coerce) {
    const x = coerce('x');
    const y = coerce('y');
    let len;
    const handleCalendarDefaults = getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);
    if (x) {
        const xlen = minRowLength(x);
        if (y) {
            len = Math.min(xlen, minRowLength(y));
        }
        else {
            len = xlen;
            coerce('y0');
            coerce('dy');
        }
    }
    else {
        if (!y)
            return 0;
        len = minRowLength(y);
        coerce('x0');
        coerce('dx');
    }
    traceOut._length = len;
    return len;
}
