import type { FullTrace } from '../../../types/core';
import Fx from '../../components/fx/index.js';
import Lib from '../../lib/index.js';
import getTraceColor from '../scatter/get_trace_color.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import _constants from '../../plots/map/constants.js';
const { traceLayerPrefix: LAYER_PREFIX } = _constants;
const fillText = Lib.fillText;

function hoverPoints(pointData, xval, yval) {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const subplot = pointData.subplot;
    let clusteredPointsIds = [];
    const layer = LAYER_PREFIX + trace.uid + '-circle';
    const hasCluster = trace.cluster && trace.cluster.enabled;

    if(hasCluster) {
        const elems = subplot.map.queryRenderedFeatures(null, {layers: [layer]});
        clusteredPointsIds = elems.map(function(elem) {return elem.id;});
    }

    // compute winding number about [-180, 180] globe
    const winding = (xval >= 0) ?
        Math.floor((xval + 180) / 360) :
        Math.ceil((xval - 180) / 360);

    // shift longitude to [-180, 180] to determine closest point
    const lonShift = winding * 360;
    const xval2 = xval - lonShift;

    function distFn(d) {
        const lonlat = d.lonlat;
        if(lonlat[0] === BADNUM) return Infinity;
        if(hasCluster && clusteredPointsIds.indexOf(d.i + 1) === -1) return Infinity;

        const lon = Lib.modHalf(lonlat[0], 360);
        const lat = lonlat[1];
        const pt = subplot.project([lon, lat]);
        const dx = pt.x - xa.c2p([xval2, lat]);
        const dy = pt.y - ya.c2p([lon, yval]);
        const rad = Math.max(3, d.mrc || 0);

        return Math.max(Math.sqrt(dx * dx + dy * dy) - rad, 1 - 3 / rad);
    }

    Fx.getClosest(cd, distFn, pointData);

    // skip the rest (for this trace) if we didn't find a close point
    if(pointData.index === false) return;

    const di = cd[pointData.index];
    const lonlat = di.lonlat;
    const lonlatShifted = [Lib.modHalf(lonlat[0], 360) + lonShift, lonlat[1]];

    // shift labels back to original winded globe
    const xc = xa.c2p(lonlatShifted);
    const yc = ya.c2p(lonlatShifted);
    const rad = di.mrc || 1;

    pointData.x0 = xc - rad;
    pointData.x1 = xc + rad;
    pointData.y0 = yc - rad;
    pointData.y1 = yc + rad;

    const fullLayout: any = {};
    fullLayout[trace.subplot] = {_subplot: subplot};
    const labels = trace._module.formatLabels(di, trace, fullLayout);
    pointData.lonLabel = labels.lonLabel;
    pointData.latLabel = labels.latLabel;

    pointData.color = getTraceColor(trace, di);
    pointData.extraText = getExtraText(trace, di, cd[0].t.labels);
    pointData.hovertemplate = trace.hovertemplate;

    return [pointData];
}

function getExtraText(trace: FullTrace, di, labels) {
    if(trace.hovertemplate) return;

    const hoverinfo = di.hi || trace.hoverinfo;
    const parts = hoverinfo.split('+');
    const isAll = parts.indexOf('all') !== -1;
    const hasLon = parts.indexOf('lon') !== -1;
    const hasLat = parts.indexOf('lat') !== -1;
    const lonlat = di.lonlat;
    const text = [];

    // TODO should we use a mock axis to format hover?
    // If so, we'll need to make precision be zoom-level dependent
    function format(v) {
        return v + '\u00B0';
    }

    if(isAll || (hasLon && hasLat)) {
        text.push('(' + format(lonlat[1]) + ', ' + format(lonlat[0]) + ')');
    } else if(hasLon) {
        text.push(labels.lon + format(lonlat[0]));
    } else if(hasLat) {
        text.push(labels.lat + format(lonlat[1]));
    }

    if(isAll || parts.indexOf('text') !== -1) {
        fillText(di, trace, text);
    }

    return text.join('<br>');
}

export default {
    hoverPoints: hoverPoints,
    getExtraText: getExtraText
};
