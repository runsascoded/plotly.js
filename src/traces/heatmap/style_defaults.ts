import type { FullTrace, InputTrace } from '../../../types/core';
export default function handleStyleDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: any, _layout?: any) {
    const zsmooth = coerce('zsmooth');
    if(zsmooth === false) {
        // ensure that xgap and ygap are coerced only when zsmooth allows them to have an effect.
        coerce('xgap');
        coerce('ygap');
    }

    coerce('zhoverformat');
}
