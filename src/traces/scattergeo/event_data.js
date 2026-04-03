export default function eventData(out, pt, trace, cd, pointNumber) {
    out.lon = pt.lon;
    out.lat = pt.lat;
    out.location = pt.loc ? pt.loc : null;
    // include feature properties from input geojson
    const cdi = cd[pointNumber];
    if (cdi.fIn && cdi.fIn.properties) {
        out.properties = cdi.fIn.properties;
    }
    return out;
}
