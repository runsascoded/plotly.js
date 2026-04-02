/*
 * Compute the tangent vector according to catmull-rom cubic splines (centripetal,
 * I think). That differs from the control point in two ways:
 *   1. It is a vector, not a position relative to the point
 *   2. the vector is longer than the position relative to p1 by a factor of 3
 *
 * Close to the boundaries, we'll use these as *quadratic control points, so that
 * to make a nice grid, we'll need to divide the tangent by 2 instead of 3. (The
 * math works out this way if you work through the bezier derivatives)
 */
const CatmullRomExp = 0.5;

export default function makeControlPoints(p0: any, p1: any, p2: any, smoothness: any) {
    const d1x = p0[0] - p1[0];
    const d1y = p0[1] - p1[1];
    const d2x = p2[0] - p1[0];
    const d2y = p2[1] - p1[1];
    const d1a = Math.pow(d1x * d1x + d1y * d1y, CatmullRomExp / 2);
    const d2a = Math.pow(d2x * d2x + d2y * d2y, CatmullRomExp / 2);
    const numx = (d2a * d2a * d1x - d1a * d1a * d2x) * smoothness;
    const numy = (d2a * d2a * d1y - d1a * d1a * d2y) * smoothness;
    const denom1 = d2a * (d1a + d2a) * 3;
    const denom2 = d1a * (d1a + d2a) * 3;

    return [[
        p1[0] + (denom1 && numx / denom1),
        p1[1] + (denom1 && numy / denom1)
    ], [
        p1[0] - (denom2 && numx / denom2),
        p1[1] - (denom2 && numy / denom2)
    ]];
}
