import type { CalcDatum, FullTrace } from '../../../types/core';
export default function eventData(out: any, pt: any, trace: FullTrace, cd: CalcDatum[], pointNumber: any) {
    out.lon = pt.lon;
    out.lat = pt.lat;
    out.location = pt.loc ? pt.loc : null;

    // include feature properties from input geojson
    const cdi = cd[pointNumber];
    if(cdi.fIn && cdi.fIn.properties) {
        out.properties = cdi.fIn.properties;
    }

    return out;
}
