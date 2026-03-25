import _hover from '../bar/hover.js';
const { hoverPoints: barHover } = _hover;
import _axes from '../../plots/cartesian/axes.js';
const { hoverLabelText } = _axes;

export default function hoverPoints(pointData, xval, yval, hovermode, opts) {
    var pts = barHover(pointData, xval, yval, hovermode, opts);

    if(!pts) return;

    pointData = pts[0];
    var di = pointData.cd[pointData.index];
    var trace = pointData.cd[0].trace;

    if(!trace.cumulative.enabled) {
        var posLetter = trace.orientation === 'h' ? 'y' : 'x';

        pointData[posLetter + 'Label'] = hoverLabelText(pointData[posLetter + 'a'], [di.ph0, di.ph1], trace[posLetter + 'hoverformat']);
    }

    return pts;
}
