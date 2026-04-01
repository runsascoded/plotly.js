import type { CalcDatum, FullTrace } from '../../../types/core';
export default function eventData(out, pt, trace: FullTrace, cd: CalcDatum[], pointNumber) {
    var cdi = cd[pointNumber];

    out.a = cdi.a;
    out.b = cdi.b;
    out.y = cdi.y;

    return out;
}
