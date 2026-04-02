import type { CalcDatum, FullTrace } from '../../../types/core';
export default function eventData(out: any, pt: any, trace: FullTrace, cd: CalcDatum[], pointNumber: any) {
    if(pt.xa) out.xaxis = pt.xa;
    if(pt.ya) out.yaxis = pt.ya;

    if(cd[pointNumber]) {
        const cdi = cd[pointNumber];

        // N.B. These are the normalized coordinates.
        out.a = cdi.a;
        out.b = cdi.b;
        out.c = cdi.c;
    } else {
        // for fill-hover only
        out.a = pt.a;
        out.b = pt.b;
        out.c = pt.c;
    }

    return out;
}
