import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { minRowLength } from '../../lib/index.js';
import { handleTraceDefaults as calendarTraceDefaults } from '../../components/calendars/index.js';

export default function handleXYDefaults(traceIn: InputTrace, traceOut: FullTrace, layout: FullLayout, coerce: any): number {
    const x = coerce('x');
    const y = coerce('y');
    let len;

    calendarTraceDefaults(traceIn, traceOut, ['x', 'y'], layout);

    if(x) {
        const xlen = minRowLength(x);
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
