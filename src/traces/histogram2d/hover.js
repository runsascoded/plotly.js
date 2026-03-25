import heatmapHover from '../heatmap/hover.js';
import _axes from '../../plots/cartesian/axes.js';
const { hoverLabelText } = _axes;

export default function hoverPoints(pointData, xval, yval, hovermode, opts) {
    var pts = heatmapHover(pointData, xval, yval, hovermode, opts);

    if(!pts) return;

    pointData = pts[0];
    var indices = pointData.index;
    var ny = indices[0];
    var nx = indices[1];
    var cd0 = pointData.cd[0];
    var trace = cd0.trace;
    var xRange = cd0.xRanges[nx];
    var yRange = cd0.yRanges[ny];

    pointData.xLabel = hoverLabelText(pointData.xa, [xRange[0], xRange[1]], trace.xhoverformat);
    pointData.yLabel = hoverLabelText(pointData.ya, [yRange[0], yRange[1]], trace.yhoverformat);

    return pts;
}
