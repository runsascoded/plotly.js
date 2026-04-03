export default function handleStyleDefaults(traceIn, traceOut, coerce, _layout) {
    const zsmooth = coerce('zsmooth');
    if (zsmooth === false) {
        // ensure that xgap and ygap are coerced only when zsmooth allows them to have an effect.
        coerce('xgap');
        coerce('ygap');
    }
    coerce('zhoverformat');
}
