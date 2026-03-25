export default function handleLineShapeDefaults(traceIn, traceOut, coerce) {
    var shape = coerce('line.shape');
    if(shape === 'spline') coerce('line.smoothing');
}
