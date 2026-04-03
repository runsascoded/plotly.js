export default function eventData(out, pt, trace, cd, pointNumber) {
    const cdi = cd[pointNumber];
    out.a = cdi.a;
    out.b = cdi.b;
    out.y = cdi.y;
    return out;
}
