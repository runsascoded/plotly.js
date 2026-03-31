export default function handleLineShapeDefaults(traceIn: any, traceOut: any, coerce: any): void {
    var shape = coerce('line.shape');
    if(shape === 'spline') coerce('line.smoothing');
}
