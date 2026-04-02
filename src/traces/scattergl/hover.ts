import type { FullTrace } from '../../../types/core';
import { errorbarHoverInfo } from '../../components/errorbars/index.js';
import Lib from '../../lib/index.js';
import getTraceColor from '../scatter/get_trace_color.js';

function hoverPoints(pointData: any, xval: any, yval: any, hovermode?: any) {
    const cd = pointData.cd;
    const stash = cd[0].t;
    const trace = cd[0].trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const x = stash.x;
    const y = stash.y;
    const xpx = xa.c2p(xval);
    const ypx = ya.c2p(yval);
    const maxDistance = pointData.distance;
    let ids;

    // FIXME: make sure this is a proper way to calc search radius
    if(stash.tree) {
        const xl = xa.p2c(xpx - maxDistance);
        const xr = xa.p2c(xpx + maxDistance);
        const yl = ya.p2c(ypx - maxDistance);
        const yr = ya.p2c(ypx + maxDistance);

        if(hovermode === 'x') {
            ids = stash.tree.range(
                Math.min(xl, xr), Math.min(ya._rl[0], ya._rl[1]),
                Math.max(xl, xr), Math.max(ya._rl[0], ya._rl[1])
            );
        } else {
            ids = stash.tree.range(
                Math.min(xl, xr), Math.min(yl, yr),
                Math.max(xl, xr), Math.max(yl, yr)
            );
        }
    } else {
        ids = stash.ids;
    }

    // pick the id closest to the point
    // note that point possibly may not be found
    let k, closestId, ptx, pty, i, dx, dy, dist, dxy;

    let minDist = maxDistance;
    if(hovermode === 'x') {
        const xPeriod = !!trace.xperiodalignment;
        const yPeriod = !!trace.yperiodalignment;

        for(i = 0; i < ids.length; i++) {
            k = ids[i];
            ptx = x[k];

            dx = Math.abs(xa.c2p(ptx) - xpx);
            if(xPeriod) {
                const x0 = xa.c2p(trace._xStarts[k]);
                const x1 = xa.c2p(trace._xEnds[k]);

                dx = (
                    xpx >= Math.min(x0, x1) &&
                    xpx <= Math.max(x0, x1)
                ) ? 0 : Infinity;
            }

            if(dx < minDist) {
                minDist = dx;
                pty = y[k];
                dy = ya.c2p(pty) - ypx;

                if(yPeriod) {
                    const y0 = ya.c2p(trace._yStarts[k]);
                    const y1 = ya.c2p(trace._yEnds[k]);

                    dy = (
                        ypx >= Math.min(y0, y1) &&
                        ypx <= Math.max(y0, y1)
                    ) ? 0 : Infinity;
                }

                dxy = Math.sqrt(dx * dx + dy * dy);
                closestId = ids[i];
            }
        }
    } else {
        for(i = ids.length - 1; i > -1; i--) {
            k = ids[i];
            ptx = x[k];
            pty = y[k];
            dx = xa.c2p(ptx) - xpx;
            dy = ya.c2p(pty) - ypx;

            dist = Math.sqrt(dx * dx + dy * dy);
            if(dist < minDist) {
                minDist = dxy = dist;
                closestId = k;
            }
        }
    }

    pointData.index = closestId;
    pointData.distance = minDist;
    pointData.dxy = dxy;

    if(closestId === undefined) return [pointData];

    return [calcHover(pointData, x, y, trace)];
}

function calcHover(pointData: any, x: any, y: any, trace: FullTrace) {
    const xa = pointData.xa;
    const ya = pointData.ya;
    const minDist = pointData.distance;
    const dxy = pointData.dxy;
    const id = pointData.index;

    // the closest data point
    const di: any = {
        pointNumber: id,
        x: x[id],
        y: y[id]
    };

    // that is single-item arrays_to_calcdata excerpt, since we are doing it for a single point and we don't have to do it beforehead for 1e6 points
    di.tx = Lib.isArrayOrTypedArray(trace.text) ? trace.text![id] : trace.text;
    di.htx = Array.isArray(trace.hovertext) ? trace.hovertext[id] : trace.hovertext;
    di.data = Array.isArray(trace.customdata) ? trace.customdata[id] : trace.customdata;
    di.tp = Array.isArray(trace.textposition) ? trace.textposition[id] : trace.textposition;

    const font = trace.textfont;
    if(font) {
        di.ts = Lib.isArrayOrTypedArray(font.size) ? font.size[id] : font.size;
        di.tc = Lib.isArrayOrTypedArray(font.color) ? font.color[id] : font.color;
        di.tf = Array.isArray(font.family) ? font.family[id] : font.family;
        di.tw = Array.isArray(font.weight) ? font.weight[id] : font.weight;
        di.ty = Array.isArray(font.style) ? font.style[id] : font.style;
        di.tv = Array.isArray(font.variant) ? font.variant[id] : font.variant;
    }

    const marker = trace.marker;
    if(marker) {
        di.ms = Lib.isArrayOrTypedArray(marker.size) ? marker.size[id] : marker.size;
        di.mo = Lib.isArrayOrTypedArray(marker.opacity) ? marker.opacity[id] : marker.opacity;
        di.mx = Lib.isArrayOrTypedArray(marker.symbol) ? marker.symbol[id] : marker.symbol;
        di.ma = Lib.isArrayOrTypedArray(marker.angle) ? marker.angle[id] : marker.angle;
        di.mc = Lib.isArrayOrTypedArray(marker.color) ? marker.color[id] : marker.color;
    }

    const line = marker && marker.line;
    if(line) {
        di.mlc = Array.isArray(line.color) ? line.color[id] : line.color;
        di.mlw = Lib.isArrayOrTypedArray(line.width) ? line.width[id] : line.width;
    }

    const grad = marker && marker.gradient;
    if(grad && grad.type !== 'none') {
        di.mgt = Array.isArray(grad.type) ? grad.type[id] : grad.type;
        di.mgc = Array.isArray(grad.color) ? grad.color[id] : grad.color;
    }

    const xp = xa.c2p(di.x, true);
    const yp = ya.c2p(di.y, true);
    const rad = di.mrc || 1;

    const hoverlabel = trace.hoverlabel;

    if(hoverlabel) {
        di.hbg = Array.isArray(hoverlabel.bgcolor) ? hoverlabel.bgcolor[id] : hoverlabel.bgcolor;
        di.hbc = Array.isArray(hoverlabel.bordercolor) ? hoverlabel.bordercolor[id] : hoverlabel.bordercolor;
        di.hts = Lib.isArrayOrTypedArray(hoverlabel.font.size) ? hoverlabel.font.size[id] : hoverlabel.font.size;
        di.htc = Array.isArray(hoverlabel.font.color) ? hoverlabel.font.color[id] : hoverlabel.font.color;
        di.htf = Array.isArray(hoverlabel.font.family) ? hoverlabel.font.family[id] : hoverlabel.font.family;
        di.hnl = Lib.isArrayOrTypedArray(hoverlabel.namelength) ? hoverlabel.namelength[id] : hoverlabel.namelength;
    }
    const hoverinfo = trace.hoverinfo;
    if(hoverinfo) {
        di.hi = Array.isArray(hoverinfo) ? hoverinfo[id] : hoverinfo;
    }

    const hovertemplate = trace.hovertemplate;
    if(hovertemplate) {
        di.ht = Array.isArray(hovertemplate) ? hovertemplate[id] : hovertemplate;
    }

    const fakeCd: any = {};
    fakeCd[pointData.index] = di;

    const origX = trace._origX;
    const origY = trace._origY;

    const pointData2 = Lib.extendFlat({}, pointData, {
        color: getTraceColor(trace, di),

        x0: xp - rad,
        x1: xp + rad,
        xLabelVal: origX ? origX[id] : di.x,

        y0: yp - rad,
        y1: yp + rad,
        yLabelVal: origY ? origY[id] : di.y,

        cd: fakeCd,
        distance: minDist,
        spikeDistance: dxy,

        hovertemplate: di.ht
    });

    if(di.htx) pointData2.text = di.htx;
    else if(di.tx) pointData2.text = di.tx;
    else if(trace.text) pointData2.text = trace.text;

    Lib.fillText(di, trace, pointData2);
    errorbarHoverInfo(di, trace, pointData2);

    return pointData2;
}

export default {
    hoverPoints: hoverPoints,
    calcHover: calcHover
};
