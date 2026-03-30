import { minRowLength } from '../../lib/index.js';
import Registry from '../../registry.js';

export default function handleXYDefaults(traceIn, traceOut, layout, coerce) {
    var x = coerce('x');
    var y = coerce('y');
    var len;

    var handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);

    if(x) {
        var xlen = minRowLength(x);
        if(y) {
            len = Math.min(xlen, minRowLength(y));
        } else {
            len = xlen;
            coerce('y0');
            coerce('dy');
        }
    } else {
        if(!y) return 0;

        len = minRowLength(y);
        coerce('x0');
        coerce('dx');
    }

    traceOut._length = len;

    return len;
}
