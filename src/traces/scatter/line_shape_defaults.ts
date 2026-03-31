import type { FullTrace, InputTrace } from '../../../types/core';

export default function handleLineShapeDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: any): void {
    var shape = coerce('line.shape');
    if(shape === 'spline') coerce('line.smoothing');
}
