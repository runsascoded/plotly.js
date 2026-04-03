import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
export default function (carpet, carpetcd, a, b) {
    let idx, tangent, tanIsoIdx, tanIsoPar, segment, refidx;
    let p0, p1, v0, v1, start, end, range;
    const axis = isArrayOrTypedArray(a) ? 'a' : 'b';
    const ax = axis === 'a' ? carpet.aaxis : carpet.baxis;
    const smoothing = ax.smoothing;
    const toIdx = axis === 'a' ? carpet.a2i : carpet.b2j;
    const pt = axis === 'a' ? a : b;
    const iso = axis === 'a' ? b : a;
    const n = axis === 'a' ? carpetcd.a.length : carpetcd.b.length;
    const m = axis === 'a' ? carpetcd.b.length : carpetcd.a.length;
    const isoIdx = Math.floor(axis === 'a' ? carpet.b2j(iso) : carpet.a2i(iso));
    const xy = axis === 'a' ? function (value) {
        return carpet.evalxy([], value, isoIdx);
    } : function (value) {
        return carpet.evalxy([], isoIdx, value);
    };
    if (smoothing) {
        tanIsoIdx = Math.max(0, Math.min(m - 2, isoIdx));
        tanIsoPar = isoIdx - tanIsoIdx;
        tangent = axis === 'a' ? function (i, ti) {
            return carpet.dxydi([], i, tanIsoIdx, ti, tanIsoPar);
        } : function (j, tj) {
            return carpet.dxydj([], tanIsoIdx, j, tanIsoPar, tj);
        };
    }
    const vstart = toIdx(pt[0]);
    const vend = toIdx(pt[1]);
    // So that we can make this work in two directions, flip all of the
    // math functions if the direction is from higher to lower indices:
    //
    // Note that the tolerance is directional!
    const dir = vstart < vend ? 1 : -1;
    const tol = (vend - vstart) * 1e-8;
    const dirfloor = dir > 0 ? Math.floor : Math.ceil;
    const dirceil = dir > 0 ? Math.ceil : Math.floor;
    const dirmin = dir > 0 ? Math.min : Math.max;
    const dirmax = dir > 0 ? Math.max : Math.min;
    const idx0 = dirfloor(vstart + tol);
    const idx1 = dirceil(vend - tol);
    p0 = xy(vstart);
    const segments = [[p0]];
    for (idx = idx0; idx * dir < idx1 * dir; idx += dir) {
        segment = [];
        start = dirmax(vstart, idx);
        end = dirmin(vend, idx + dir);
        range = end - start;
        // In order to figure out which cell we're in for the derivative (remember,
        // the derivatives are *not* constant across grid lines), let's just average
        // the start and end points. This cuts out just a tiny bit of logic and
        // there's really no computational difference:
        refidx = Math.max(0, Math.min(n - 2, Math.floor(0.5 * (start + end))));
        p1 = xy(end);
        if (smoothing) {
            v0 = tangent(refidx, start - refidx);
            v1 = tangent(refidx, end - refidx);
            segment.push([
                p0[0] + v0[0] / 3 * range,
                p0[1] + v0[1] / 3 * range
            ]);
            segment.push([
                p1[0] - v1[0] / 3 * range,
                p1[1] - v1[1] / 3 * range
            ]);
        }
        segment.push(p1);
        segments.push(segment);
        p0 = p1;
    }
    return segments;
}
