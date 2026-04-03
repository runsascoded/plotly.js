export default function handleLineShapeDefaults(traceIn, traceOut, coerce) {
    const shape = coerce('line.shape');
    if (shape === 'spline')
        coerce('line.smoothing');
}
