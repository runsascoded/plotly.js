import type { FullTrace } from '../../../types/core';
import Fx from '../../components/fx/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import getTraceColor from '../scatter/get_trace_color.js';
import _index from '../../lib/index.js';
const { fillText } = _index;
import attributes from './attributes.js';

export default function hoverPoints(pointData, xval, yval) {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const geo = pointData.subplot;

    const isLonLatOverEdges = geo.projection.isLonLatOverEdges;
    const project = geo.project;

    function distFn(d) {
        const lonlat = d.lonlat;

        if(lonlat[0] === BADNUM) return Infinity;
        if(isLonLatOverEdges(lonlat)) return Infinity;

        const pt = project(lonlat);
        const px = project([xval, yval]);
        const dx = Math.abs(pt[0] - px[0]);
        const dy = Math.abs(pt[1] - px[1]);
        const rad = Math.max(3, d.mrc || 0);

        // N.B. d.mrc is the calculated marker radius
        // which is only set for trace with 'markers' mode.

        return Math.max(Math.sqrt(dx * dx + dy * dy) - rad, 1 - 3 / rad);
    }

    Fx.getClosest(cd, distFn, pointData);

    // skip the rest (for this trace) if we didn't find a close point
    if(pointData.index === false) return;

    const di = cd[pointData.index];
    const lonlat = di.lonlat;
    const pos = [xa.c2p(lonlat), ya.c2p(lonlat)];
    const rad = di.mrc || 1;

    pointData.x0 = pos[0] - rad;
    pointData.x1 = pos[0] + rad;
    pointData.y0 = pos[1] - rad;
    pointData.y1 = pos[1] + rad;

    pointData.loc = di.loc;
    pointData.lon = lonlat[0];
    pointData.lat = lonlat[1];

    const fullLayout: any = {};
    fullLayout[trace.geo] = {_subplot: geo};
    const labels = trace._module.formatLabels(di, trace, fullLayout);
    pointData.lonLabel = labels.lonLabel;
    pointData.latLabel = labels.latLabel;

    pointData.color = getTraceColor(trace, di);
    pointData.extraText = getExtraText(trace, di, pointData, cd[0].t.labels);
    pointData.hovertemplate = trace.hovertemplate;

    return [pointData];
}

function getExtraText(trace: FullTrace, pt, pointData, labels) {
    if(trace.hovertemplate) return;

    const hoverinfo = pt.hi || trace.hoverinfo;

    const parts = hoverinfo === 'all' ?
        attributes.hoverinfo.flags :
        hoverinfo.split('+');

    const hasLocation = parts.indexOf('location') !== -1 && Array.isArray(trace.locations);
    const hasLon = (parts.indexOf('lon') !== -1);
    const hasLat = (parts.indexOf('lat') !== -1);
    const hasText = (parts.indexOf('text') !== -1);
    const text: any[] = [];

    function format(val) { return val + '\u00B0'; }

    if(hasLocation) {
        text.push(pt.loc);
    } else if(hasLon && hasLat) {
        text.push('(' + format(pointData.latLabel) + ', ' + format(pointData.lonLabel) + ')');
    } else if(hasLon) {
        text.push(labels.lon + format(pointData.lonLabel));
    } else if(hasLat) {
        text.push(labels.lat + format(pointData.latLabel));
    }

    if(hasText) {
        fillText(pt, trace, text);
    }

    return text.join('<br>');
}
