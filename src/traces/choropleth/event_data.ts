import type { FullTrace } from '../../../types/core';
export default function eventData(out: any, pt: any, trace: FullTrace, cd: any, pointNumber: number) {
    out.location = pt.location;
    out.z = pt.z;

    // include feature properties from input geojson
    const cdi = cd[pointNumber];
    if(cdi.fIn && cdi.fIn.properties) {
        out.properties = cdi.fIn.properties;
    }
    out.ct = cdi.ct;

    return out;
}
