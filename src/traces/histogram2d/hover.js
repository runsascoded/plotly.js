import heatmapHover from '../heatmap/hover.js';
import _axes from '../../plots/cartesian/axes.js';
const { hoverLabelText } = _axes;
export default function hoverPoints(pointData, xval, yval, hovermode, opts) {
    const pts = heatmapHover(pointData, xval, yval, hovermode, opts);
    if (!pts)
        return;
    pointData = pts[0];
    const indices = pointData.index;
    const ny = indices[0];
    const nx = indices[1];
    const cd0 = pointData.cd[0];
    const trace = cd0.trace;
    const xRange = cd0.xRanges[nx];
    const yRange = cd0.yRanges[ny];
    pointData.xLabel = hoverLabelText(pointData.xa, [xRange[0], xRange[1]], trace.xhoverformat);
    pointData.yLabel = hoverLabelText(pointData.ya, [yRange[0], yRange[1]], trace.yhoverformat);
    return pts;
}
