export default function eventData(out: any, pt: any) {
    out.lon = pt.lon;
    out.lat = pt.lat;
    out.z = pt.z;
    return out;
}
