import Axes from '../../plots/cartesian/axes.js';
import _hover from '../scattermap/hover.js';
const { hoverPoints: scatterMapHoverPoints, getExtraText } = _hover;

export default function hoverPoints(pointData, xval, yval) {
    var pts = scatterMapHoverPoints(pointData, xval, yval);
    if(!pts) return;

    var newPointData = pts[0];
    var cd = newPointData.cd;
    var trace = cd[0].trace;
    var di = cd[newPointData.index];

    // let Fx.hover pick the color
    delete newPointData.color;

    if('z' in di) {
        var ax = newPointData.subplot.mockAxis;
        newPointData.z = di.z;
        newPointData.zLabel = Axes.tickText(ax, ax.c2l(di.z), 'hover').text;
    }

    newPointData.extraText = getExtraText(trace, di, cd[0].t.labels);

    return [newPointData];
}
