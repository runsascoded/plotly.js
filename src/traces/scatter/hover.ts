import type { FullAxis } from '../../../types/core';
import { extendFlat, fillText, isArrayOrTypedArray } from '../../lib/index.js';
import Fx from '../../components/fx/index.js';
import Registry from '../../registry.js';
import getTraceColor from './get_trace_color.js';
import Color from '../../components/color/index.js';

export default function hoverPoints(pointData: any, xval: number, yval: number, hovermode: any): any[] | undefined {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const xpx = xa.c2p(xval);
    const ypx = ya.c2p(yval);
    const pt = [xpx, ypx];
    const hoveron = trace.hoveron || '';
    const minRad = (trace.mode.indexOf('markers') !== -1) ? 3 : 0.5;

    const xPeriod = !!trace.xperiodalignment;
    const yPeriod = !!trace.yperiodalignment;

    // look for points to hover on first, then take fills only if we
    // didn't find a point

    if(hoveron.indexOf('points') !== -1) {
        // dx and dy are used in compare modes - here we want to always
        // prioritize the closest data point, at least as long as markers are
        // the same size or nonexistent, but still try to prioritize small markers too.
        const dx = (di: any) => {
            if(xPeriod) {
                const x0 = xa.c2p(di.xStart);
                const x1 = xa.c2p(di.xEnd);

                return (
                    xpx >= Math.min(x0, x1) &&
                    xpx <= Math.max(x0, x1)
                ) ? 0 : Infinity;
            }

            const rad = Math.max(3, di.mrc || 0);
            const kink = 1 - 1 / rad;
            const dxRaw = Math.abs(xa.c2p(di.x) - xpx);
            return (dxRaw < rad) ? (kink * dxRaw / rad) : (dxRaw - rad + kink);
        };
        const dy = (di: any) => {
            if(yPeriod) {
                const y0 = ya.c2p(di.yStart);
                const y1 = ya.c2p(di.yEnd);

                return (
                    ypx >= Math.min(y0, y1) &&
                    ypx <= Math.max(y0, y1)
                ) ? 0 : Infinity;
            }

            const rad = Math.max(3, di.mrc || 0);
            const kink = 1 - 1 / rad;
            const dyRaw = Math.abs(ya.c2p(di.y) - ypx);
            return (dyRaw < rad) ? (kink * dyRaw / rad) : (dyRaw - rad + kink);
        };

        // scatter points: d.mrc is the calculated marker radius
        // adjust the distance so if you're inside the marker it
        // always will show up regardless of point size, but
        // prioritize smaller points
        const dxy = (di: any) => {
            const rad = Math.max(minRad, di.mrc || 0);
            const dx = xa.c2p(di.x) - xpx;
            const dy = ya.c2p(di.y) - ypx;
            return Math.max(Math.sqrt(dx * dx + dy * dy) - rad, 1 - minRad / rad);
        };
        const distfn = Fx.getDistanceFunction(hovermode, dx, dy, dxy);

        Fx.getClosest(cd, distfn, pointData);

        // skip the rest (for this trace) if we didn't find a close point
        if(pointData.index !== false) {
            // the closest data point
            const di = cd[pointData.index];
            const xc = xa.c2p(di.x, true);
            const yc = ya.c2p(di.y, true);
            const rad = di.mrc || 1;

            // now we're done using the whole `calcdata` array, replace the
            // index with the original index (in case of inserted point from
            // stacked area)
            pointData.index = di.i;

            const orientation = cd[0].t.orientation;
            // TODO: for scatter and bar, option to show (sub)totals and
            // raw data? Currently stacked and/or normalized bars just show
            // the normalized individual sizes, so that's what I'm doing here
            // for now.
            const sizeVal = orientation && (di.sNorm || di.s);
            const xLabelVal = (orientation === 'h') ? sizeVal : di.orig_x !== undefined ? di.orig_x : di.x;
            const yLabelVal = (orientation === 'v') ? sizeVal : di.orig_y !== undefined ? di.orig_y : di.y;

            extendFlat(pointData, {
                color: getTraceColor(trace, di),

                x0: xc - rad,
                x1: xc + rad,
                xLabelVal: xLabelVal,

                y0: yc - rad,
                y1: yc + rad,
                yLabelVal: yLabelVal,

                spikeDistance: dxy(di),
                hovertemplate: trace.hovertemplate
            });

            fillText(di, trace, pointData);
            Registry.getComponentMethod('errorbars', 'hoverInfo')(di, trace, pointData);

            return [pointData];
        }
    }

    function isHoverPointInFillElement(el: any) {
        // Uses SVGElement.isPointInFill to accurately determine wether
        // the hover point / cursor is contained in the fill, taking
        // curved or jagged edges into account, which the Polygon-based
        // approach does not.
        if(!el) {
            return false;
        }
        const svgElement = el.node();
        try {
            const domPoint = new DOMPoint(pt[0], pt[1]);
            return svgElement.isPointInFill(domPoint);
        } catch(TypeError) {
            const svgPoint = svgElement.ownerSVGElement.createSVGPoint();
            svgPoint.x = pt[0];
            svgPoint.y = pt[1];
            return svgElement.isPointInFill(svgPoint);
        }
    }

    function getHoverLabelPosition(polygons: any) {
        // Uses Polygon s to determine the left- and right-most x-coordinates
        // of the subshape of the fill that contains the hover point / cursor.
        // Doing this with the SVGElement directly is quite tricky, so this falls
        // back to the existing relatively simple code, accepting some small inaccuracies
        // of label positioning for curved/jagged edges.
        let i;
        const polygonsIn: any[] = [];
        let xmin = Infinity;
        let xmax = -Infinity;
        let ymin = Infinity;
        let ymax = -Infinity;
        let yPos;

        for(i = 0; i < polygons.length; i++) {
            const polygon = polygons[i];
            // This is not going to work right for curved or jagged edges, it will
            // act as though they're straight.
            if(polygon.contains(pt)) {
                polygonsIn.push(polygon);
                ymin = Math.min(ymin, polygon.ymin);
                ymax = Math.max(ymax, polygon.ymax);
            }
        }

        // The above found no polygon that contains the cursor, but we know that
        // the cursor must be inside the fill as determined by the SVGElement
        // (so we are probably close to a curved/jagged edge...).
        if(polygonsIn.length === 0) {
            return null;
        }

        // constrain ymin/max to the visible plot, so the label goes
        // at the middle of the piece you can see
        ymin = Math.max(ymin, 0);
        ymax = Math.min(ymax, ya._length);

        yPos = (ymin + ymax) / 2;

        // find the overall left-most and right-most points of the
        // polygon(s) we're inside at their combined vertical midpoint.
        // This is where we will draw the hover label.
        // Note that this might not be the vertical midpoint of the
        // whole trace, if it's disjoint.
        let j, pts, xAtYPos, x0, x1, y0, y1;
        for(i = 0; i < polygonsIn.length; i++) {
            pts = (polygonsIn[i] as any).pts;
            for(j = 1; j < pts.length; j++) {
                y0 = pts[j - 1][1];
                y1 = pts[j][1];
                if((y0 > yPos) !== (y1 >= yPos)) {
                    x0 = pts[j - 1][0];
                    x1 = pts[j][0];
                    if(y1 - y0) {
                        xAtYPos = x0 + (x1 - x0) * (yPos - y0) / (y1 - y0);
                        xmin = Math.min(xmin, xAtYPos);
                        xmax = Math.max(xmax, xAtYPos);
                    }
                }
            }
        }

        // constrain xmin/max to the visible plot now too
        xmin = Math.max(xmin, 0);
        xmax = Math.min(xmax, xa._length);

        return {
            x0: xmin,
            x1: xmax,
            y0: yPos,
            y1: yPos,
        };
    }

    // even if hoveron is 'fills', only use it if we have a fill element too
    if(hoveron.indexOf('fills') !== -1 && trace._fillElement) {
        const inside = isHoverPointInFillElement(trace._fillElement) && !isHoverPointInFillElement(trace._fillExclusionElement);

        if(inside) {
            let hoverLabelCoords = getHoverLabelPosition(trace._polygons);

            // getHoverLabelPosition may return null if the cursor / hover point is not contained
            // in any of the trace's polygons, which can happen close to curved edges. in that
            // case we fall back to displaying the hover label at the cursor position.
            if(hoverLabelCoords === null) {
                hoverLabelCoords = {
                    x0: pt[0],
                    x1: pt[0],
                    y0: pt[1],
                    y1: pt[1]
                };
            }

            // get only fill or line color for the hover color
            let color = Color.defaultLine;
            if(Color.opacity(trace.fillcolor)) color = trace.fillcolor;
            else if(Color.opacity((trace.line || {}).color)) {
                color = trace.line.color;
            }

            extendFlat(pointData, {
                // never let a 2D override 1D type as closest point
                // also: no spikeDistance, it's not allowed for fills
                distance: pointData.maxHoverDistance,
                x0: hoverLabelCoords.x0,
                x1: hoverLabelCoords.x1,
                y0: hoverLabelCoords.y0,
                y1: hoverLabelCoords.y1,
                color: color,
                hovertemplate: false
            });

            delete pointData.index;

            if(trace.text && !isArrayOrTypedArray(trace.text)) {
                pointData.text = String(trace.text);
            } else pointData.text = trace.name;

            return [pointData];
        }
    }
}
