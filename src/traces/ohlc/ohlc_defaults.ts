import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';

export default function handleOHLC(traceIn: InputTrace,  traceOut: FullTrace,  coerce,  layout: FullLayout) {
    const x = coerce('x');
    const open = coerce('open');
    const high = coerce('high');
    const low = coerce('low');
    const close = coerce('close');

    coerce('hoverlabel.split');

    const handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x'], layout);

    if(!(open && high && low && close)) return;

    let len = Math.min(open.length, high.length, low.length, close.length);
    if(x) len = Math.min(len, Lib.minRowLength(x));
    traceOut._length = len;

    return len;
}
