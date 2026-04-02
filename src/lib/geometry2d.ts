import _mod from './mod.js';
const { mod } = _mod;

interface Point {
    x: number;
    y: number;
}

interface TextLocation {
    x: number;
    y: number;
    theta: number;
}

interface VisibleSegment {
    min: number;
    max: number;
    len: number;
    total: number;
    isClosed: boolean;
}

interface Bounds {
    left: number;
    right: number;
    top: number;
    bottom: number;
}

interface FindPointOpts {
    pathLength?: number;
    tolerance?: number;
    iterationLimit?: number;
}

interface SVGPathLike {
    getPointAtLength(len: number): Point;
    getTotalLength(): number;
}

export { segmentsIntersect };
function segmentsIntersect(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): Point | null {
    const a = x2 - x1;
    const b = x3 - x1;
    const c = x4 - x3;
    const d = y2 - y1;
    const e = y3 - y1;
    const f = y4 - y3;
    const det = a * f - c * d;
    // parallel lines? intersection is undefined
    // ignore the case where they are colinear
    if(det === 0) return null;
    const t = (b * f - c * e) / det;
    const u = (b * d - a * e) / det;
    // segments do not intersect?
    if(u < 0 || u > 1 || t < 0 || t > 1) return null;

    return {x: x1 + a * t, y: y1 + d * t};
}

export function segmentDistance(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): number {
    if(segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4)) return 0;

    // the two segments and their lengths squared
    const x12 = x2 - x1;
    const y12 = y2 - y1;
    const x34 = x4 - x3;
    const y34 = y4 - y3;
    const ll12 = x12 * x12 + y12 * y12;
    const ll34 = x34 * x34 + y34 * y34;

    // calculate distance squared, then take the sqrt at the very end
    const dist2 = Math.min(
        perpDistance2(x12, y12, ll12, x3 - x1, y3 - y1),
        perpDistance2(x12, y12, ll12, x4 - x1, y4 - y1),
        perpDistance2(x34, y34, ll34, x1 - x3, y1 - y3),
        perpDistance2(x34, y34, ll34, x2 - x3, y2 - y3)
    );

    return Math.sqrt(dist2);
}

/*
 * distance squared from segment ab to point c
 * [xab, yab] is the vector b-a
 * [xac, yac] is the vector c-a
 * llab is the length squared of (b-a), just to simplify calculation
 */
function perpDistance2(xab: number, yab: number, llab: number, xac: number, yac: number): number {
    const fcAB = (xac * xab + yac * yab);
    if(fcAB < 0) {
        // point c is closer to point a
        return xac * xac + yac * yac;
    } else if(fcAB > llab) {
        // point c is closer to point b
        const xbc = xac - xab;
        const ybc = yac - yab;
        return xbc * xbc + ybc * ybc;
    } else {
        // perpendicular distance is the shortest
        const crossProduct = xac * yab - yac * xab;
        return crossProduct * crossProduct / llab;
    }
}

// a very short-term cache for getTextLocation, just because
// we're often looping over the same locations multiple times
// invalidated as soon as we look at a different path
let locationCache: Record<number, TextLocation>;
let workingPath: SVGPathLike | null;
let workingTextWidth: number;

export function getTextLocation(path: SVGPathLike, totalPathLen: number, positionOnPath: number, textWidth: number): TextLocation {
    if(path !== workingPath || textWidth !== workingTextWidth) {
        locationCache = {};
        workingPath = path;
        workingTextWidth = textWidth;
    }
    if(locationCache[positionOnPath]) {
        return locationCache[positionOnPath];
    }

    // for the angle, use points on the path separated by the text width
    // even though due to curvature, the text will cover a bit more than that
    const p0 = path.getPointAtLength(mod(positionOnPath - textWidth / 2, totalPathLen));
    const p1 = path.getPointAtLength(mod(positionOnPath + textWidth / 2, totalPathLen));
    // note: atan handles 1/0 nicely
    const theta = Math.atan((p1.y - p0.y) / (p1.x - p0.x));
    // center the text at 2/3 of the center position plus 1/3 the p0/p1 midpoint
    // that's the average position of this segment, assuming it's roughly quadratic
    const pCenter = path.getPointAtLength(mod(positionOnPath, totalPathLen));
    const x = (pCenter.x * 4 + p0.x + p1.x) / 6;
    const y = (pCenter.y * 4 + p0.y + p1.y) / 6;

    const out: TextLocation = {x: x, y: y, theta: theta};
    locationCache[positionOnPath] = out;
    return out;
}

export function clearLocationCache(): void {
    workingPath = null;
}

export function getVisibleSegment(path: SVGPathLike, bounds: Bounds, buffer: number): VisibleSegment | undefined {
    const left = bounds.left;
    const right = bounds.right;
    const top = bounds.top;
    const bottom = bounds.bottom;

    let pMin = 0;
    const pTotal = path.getTotalLength();
    let pMax = pTotal;

    let pt0: Point, ptTotal: Point;

    function getDistToPlot(len: number): number {
        const pt = path.getPointAtLength(len);

        // hold on to the start and end points for `closed`
        if(len === 0) pt0 = pt;
        else if(len === pTotal) ptTotal = pt;

        const dx = (pt.x < left) ? left - pt.x : (pt.x > right ? pt.x - right : 0);
        const dy = (pt.y < top) ? top - pt.y : (pt.y > bottom ? pt.y - bottom : 0);
        return Math.sqrt(dx * dx + dy * dy);
    }

    let distToPlot = getDistToPlot(pMin);
    while(distToPlot) {
        pMin += distToPlot + buffer;
        if(pMin > pMax) return;
        distToPlot = getDistToPlot(pMin);
    }

    distToPlot = getDistToPlot(pMax);
    while(distToPlot) {
        pMax -= distToPlot + buffer;
        if(pMin > pMax) return;
        distToPlot = getDistToPlot(pMax);
    }

    return {
        min: pMin,
        max: pMax,
        len: pMax - pMin,
        total: pTotal,
        isClosed: pMin === 0 && pMax === pTotal &&
            Math.abs(pt0!.x - ptTotal!.x) < 0.1 &&
            Math.abs(pt0!.y - ptTotal!.y) < 0.1
    };
}

export function findPointOnPath(path: SVGPathLike, val: number, coord: 'x' | 'y', opts?: FindPointOpts): Point {
    opts = opts || {};

    const pathLength = opts.pathLength || path.getTotalLength();
    const tolerance = opts.tolerance || 1e-3;
    const iterationLimit = opts.iterationLimit || 30;

    // if path starts at a val greater than the path tail (like on vertical violins),
    // we must flip the sign of the computed diff.
    const mul = path.getPointAtLength(0)[coord] > path.getPointAtLength(pathLength)[coord] ? -1 : 1;

    let i = 0;
    let b0 = 0;
    let b1 = pathLength;
    let mid: number;
    let pt: Point;
    let diff: number;

    while(i < iterationLimit) {
        mid = (b0 + b1) / 2;
        pt = path.getPointAtLength(mid);
        diff = pt[coord] - val;

        if(Math.abs(diff) < tolerance) {
            return pt;
        } else {
            if(mul * diff > 0) {
                b1 = mid;
            } else {
                b0 = mid;
            }
            i++;
        }
    }
    return pt!;
}

export default { segmentDistance, getTextLocation, clearLocationCache, getVisibleSegment, findPointOnPath, segmentsIntersect };
