import { mod, modHalf } from './mod.js';
const PI = Math.PI;
const twoPI = 2 * PI;
function deg2rad(deg) { return deg / 180 * PI; }
function rad2deg(rad) { return rad / PI * 180; }
/**
 * is sector a full circle?
 * ... this comes up a lot in SVG path-drawing routines
 *
 * N.B. we consider all sectors that span more that 2pi 'full' circles
 *
 * @param aBnds : angular bounds in *radians*
 * @return whether the sector is a full circle
 */
function isFullCircle(aBnds) {
    return Math.abs(aBnds[1] - aBnds[0]) > twoPI - 1e-14;
}
/**
 * angular delta between angle 'a' and 'b'
 * solution taken from: https://stackoverflow.com/a/2007279
 *
 * @param a : first angle in *radians*
 * @param b : second angle in *radians*
 * @return angular delta in *radians*
 */
function angleDelta(a, b) {
    return modHalf(b - a, twoPI);
}
/**
 * angular distance between angle 'a' and 'b'
 *
 * @param a : first angle in *radians*
 * @param b : second angle in *radians*
 * @return angular distance in *radians*
 */
function angleDist(a, b) {
    return Math.abs(angleDelta(a, b));
}
/**
 * is angle inside sector?
 *
 * @param a : angle to test in *radians*
 * @param aBnds : sector's angular bounds in *radians*
 * @return whether the angle is inside the sector
 */
function isAngleInsideSector(a, aBnds) {
    if (isFullCircle(aBnds))
        return true;
    let s0, s1;
    if (aBnds[0] < aBnds[1]) {
        s0 = aBnds[0];
        s1 = aBnds[1];
    }
    else {
        s0 = aBnds[1];
        s1 = aBnds[0];
    }
    s0 = mod(s0, twoPI);
    s1 = mod(s1, twoPI);
    if (s0 > s1)
        s1 += twoPI;
    const a0 = mod(a, twoPI);
    const a1 = a0 + twoPI;
    return (a0 >= s0 && a0 <= s1) || (a1 >= s0 && a1 <= s1);
}
/**
 * is pt (r,a) inside sector?
 *
 * @param r : pt's radial coordinate
 * @param a : pt's angular coordinate in *radians*
 * @param rBnds : sector's radial bounds
 * @param aBnds : sector's angular bounds in *radians*
 * @return whether the point is inside the sector
 */
function isPtInsideSector(r, a, rBnds, aBnds) {
    if (!isAngleInsideSector(a, aBnds))
        return false;
    let r0, r1;
    if (rBnds[0] < rBnds[1]) {
        r0 = rBnds[0];
        r1 = rBnds[1];
    }
    else {
        r0 = rBnds[1];
        r1 = rBnds[0];
    }
    return r >= r0 && r <= r1;
}
// common to pathArc, pathSector and pathAnnulus
function _path(r0, r1, a0, a1, cx, cy, isClosed) {
    cx = cx || 0;
    cy = cy || 0;
    const isCircle = isFullCircle([a0, a1]);
    let aStart, aMid, aEnd;
    let rStart, rEnd;
    if (isCircle) {
        aStart = 0;
        aMid = PI;
        aEnd = twoPI;
    }
    else {
        if (a0 < a1) {
            aStart = a0;
            aEnd = a1;
        }
        else {
            aStart = a1;
            aEnd = a0;
        }
    }
    if (r0 < r1) {
        rStart = r0;
        rEnd = r1;
    }
    else {
        rStart = r1;
        rEnd = r0;
    }
    // N.B. svg coordinates here, where y increases downward
    function pt(r, a) {
        return [r * Math.cos(a) + cx, cy - r * Math.sin(a)];
    }
    const largeArc = Math.abs(aEnd - aStart) <= PI ? 0 : 1;
    function arc(r, a, cw) {
        return 'A' + [r, r] + ' ' + [0, largeArc, cw] + ' ' + pt(r, a);
    }
    let p;
    if (isCircle) {
        if (rStart === null) {
            p = 'M' + pt(rEnd, aStart) +
                arc(rEnd, aMid, 0) +
                arc(rEnd, aEnd, 0) + 'Z';
        }
        else {
            p = 'M' + pt(rStart, aStart) +
                arc(rStart, aMid, 0) +
                arc(rStart, aEnd, 0) + 'Z' +
                'M' + pt(rEnd, aStart) +
                arc(rEnd, aMid, 1) +
                arc(rEnd, aEnd, 1) + 'Z';
        }
    }
    else {
        if (rStart === null) {
            p = 'M' + pt(rEnd, aStart) + arc(rEnd, aEnd, 0);
            if (isClosed)
                p += 'L0,0Z';
        }
        else {
            p = 'M' + pt(rStart, aStart) +
                'L' + pt(rEnd, aStart) +
                arc(rEnd, aEnd, 0) +
                'L' + pt(rStart, aEnd) +
                arc(rStart, aStart, 1) + 'Z';
        }
    }
    return p;
}
/**
 * path an arc
 *
 * @param r : radius
 * @param a0 : first angular coordinate in *radians*
 * @param a1 : second angular coordinate in *radians*
 * @param cx : x coordinate of center
 * @param cy : y coordinate of center
 * @return svg path
 */
function pathArc(r, a0, a1, cx, cy) {
    return _path(null, r, a0, a1, cx || 0, cy || 0, 0);
}
/**
 * path a sector
 *
 * @param r : radius
 * @param a0 : first angular coordinate in *radians*
 * @param a1 : second angular coordinate in *radians*
 * @param cx : x coordinate of center
 * @param cy : y coordinate of center
 * @return svg path
 */
function pathSector(r, a0, a1, cx, cy) {
    return _path(null, r, a0, a1, cx || 0, cy || 0, 1);
}
/**
 * path an annulus
 *
 * @param r0 : first radial coordinate
 * @param r1 : second radial coordinate
 * @param a0 : first angular coordinate in *radians*
 * @param a1 : second angular coordinate in *radians*
 * @param cx : x coordinate of center
 * @param cy : y coordinate of center
 * @return svg path
 */
function pathAnnulus(r0, r1, a0, a1, cx, cy) {
    return _path(r0, r1, a0, a1, cx || 0, cy || 0, 1);
}
export { deg2rad, rad2deg, angleDelta, angleDist, isFullCircle, isAngleInsideSector, isPtInsideSector, pathArc, pathSector, pathAnnulus };
export default {
    deg2rad: deg2rad,
    rad2deg: rad2deg,
    angleDelta: angleDelta,
    angleDist: angleDist,
    isFullCircle: isFullCircle,
    isAngleInsideSector: isAngleInsideSector,
    isPtInsideSector: isPtInsideSector,
    pathArc: pathArc,
    pathSector: pathSector,
    pathAnnulus: pathAnnulus
};
