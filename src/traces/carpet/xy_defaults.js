import _index from '../../lib/index.js';
const { isArray1D } = _index;
export default function handleXYDefaults(traceIn, traceOut, coerce) {
    const x = coerce('x');
    const hasX = x && x.length;
    const y = coerce('y');
    const hasY = y && y.length;
    if (!hasX && !hasY)
        return false;
    traceOut._cheater = !x;
    if ((!hasX || isArray1D(x)) && (!hasY || isArray1D(y))) {
        let len = hasX ? x.length : Infinity;
        if (hasY)
            len = Math.min(len, y.length);
        if (traceOut.a && traceOut.a.length)
            len = Math.min(len, traceOut.a.length);
        if (traceOut.b && traceOut.b.length)
            len = Math.min(len, traceOut.b.length);
        traceOut._length = len;
    }
    else
        traceOut._length = null;
    return true;
}
