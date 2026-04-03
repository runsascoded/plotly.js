import Axes from '../../plots/cartesian/axes.js';
import attributes from './attributes.js';
import _index from '../../lib/index.js';
const { fillText } = _index;
export default function hoverPoints(pointData, xval, yval) {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const geo = pointData.subplot;
    let pt, i, j, isInside;
    const xy = [xval, yval];
    const altXy = [xval + 360, yval];
    for (i = 0; i < cd.length; i++) {
        pt = cd[i];
        isInside = false;
        if (pt._polygons) {
            for (j = 0; j < pt._polygons.length; j++) {
                if (pt._polygons[j].contains(xy)) {
                    isInside = !isInside;
                }
                // for polygons that cross antimeridian as xval is in [-180, 180]
                if (pt._polygons[j].contains(altXy)) {
                    isInside = !isInside;
                }
            }
            if (isInside)
                break;
        }
    }
    if (!isInside || !pt)
        return;
    pointData.x0 = pointData.x1 = pointData.xa.c2p(pt.ct);
    pointData.y0 = pointData.y1 = pointData.ya.c2p(pt.ct);
    pointData.index = pt.index;
    pointData.location = pt.loc;
    pointData.z = pt.z;
    pointData.zLabel = Axes.tickText(geo.mockAxis, geo.mockAxis.c2l(pt.z), 'hover').text;
    pointData.hovertemplate = pt.hovertemplate;
    makeHoverInfo(pointData, trace, pt);
    return [pointData];
}
function makeHoverInfo(pointData, trace, pt) {
    if (trace.hovertemplate)
        return;
    const hoverinfo = pt.hi || trace.hoverinfo;
    const loc = String(pt.loc);
    const parts = (hoverinfo === 'all') ?
        attributes.hoverinfo.flags :
        hoverinfo.split('+');
    const hasName = (parts.indexOf('name') !== -1);
    const hasLocation = (parts.indexOf('location') !== -1);
    const hasZ = (parts.indexOf('z') !== -1);
    const hasText = (parts.indexOf('text') !== -1);
    const hasIdAsNameLabel = !hasName && hasLocation;
    const text = [];
    if (hasIdAsNameLabel) {
        pointData.nameOverride = loc;
    }
    else {
        if (hasName)
            pointData.nameOverride = trace.name;
        if (hasLocation)
            text.push(loc);
    }
    if (hasZ) {
        text.push(pointData.zLabel);
    }
    if (hasText) {
        fillText(pt, trace, text);
    }
    pointData.extraText = text.join('<br>');
}
