import type { CalcDatum, FullTrace } from '../../../types/core';
export default function eventData(out: any, pt: any, trace: FullTrace, cd: CalcDatum[], pointNumber: any) {
    const cdi = cd[pointNumber];

    out.a = cdi.a;
    out.b = cdi.b;
    out.y = cdi.y;

    return out;
}
