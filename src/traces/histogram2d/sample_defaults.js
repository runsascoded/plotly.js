import { getComponentMethod } from '../../registry.js';
import Lib from '../../lib/index.js';
export default function handleSampleDefaults(traceIn, traceOut, coerce, layout) {
    const x = coerce('x');
    const y = coerce('y');
    const xlen = Lib.minRowLength(x);
    const ylen = Lib.minRowLength(y);
    // we could try to accept x0 and dx, etc...
    // but that's a pretty weird use case.
    // for now require both x and y explicitly specified.
    if (!xlen || !ylen) {
        traceOut.visible = false;
        return;
    }
    traceOut._length = Math.min(xlen, ylen);
    const handleCalendarDefaults = getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);
    // if marker.color is an array, we can use it in aggregation instead of z
    const hasAggregationData = coerce('z') || coerce('marker.color');
    if (hasAggregationData)
        coerce('histfunc');
    coerce('histnorm');
    // Note: bin defaults are now handled in Histogram2D.crossTraceDefaults
    // autobin(x|y) are only included here to appease Plotly.validate
    coerce('autobinx');
    coerce('autobiny');
}
