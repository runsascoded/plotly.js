import Fx from '../../components/fx/index.js';
import Lib from '../../lib/index.js';
import _hover from '../bar/hover.js';
const { getTraceColor } = _hover;
import _hover2 from '../scatterpolar/hover.js';
const { makeHoverPointText } = _hover2;
import _helpers from '../../plots/polar/helpers.js';
const { isPtInsidePolygon } = _helpers;
const fillText = Lib.fillText;
export default function hoverPoints(pointData, xval, yval) {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const subplot = pointData.subplot;
    const radialAxis = subplot.radialAxis;
    const angularAxis = subplot.angularAxis;
    const vangles = subplot.vangles;
    const inboxFn = vangles ? isPtInsidePolygon : Lib.isPtInsideSector;
    const maxHoverDistance = pointData.maxHoverDistance;
    const period = angularAxis._period || 2 * Math.PI;
    const rVal = Math.abs(radialAxis.g2p(Math.sqrt(xval * xval + yval * yval)));
    let thetaVal = Math.atan2(yval, xval);
    // polar.(x|y)axis.p2c doesn't get the reversed radial axis range case right
    if (radialAxis.range[0] > radialAxis.range[1]) {
        thetaVal += Math.PI;
    }
    const distFn = (di) => {
        if (inboxFn(rVal, thetaVal, [di.rp0, di.rp1], [di.thetag0, di.thetag1], vangles)) {
            return maxHoverDistance +
                // add a little to the pseudo-distance for wider bars, so that like scatter,
                // if you are over two overlapping bars, the narrower one wins.
                Math.min(1, Math.abs(di.thetag1 - di.thetag0) / period) - 1 +
                // add a gradient so hovering near the end of a
                // bar makes it a little closer match
                (di.rp1 - rVal) / (di.rp1 - di.rp0) - 1;
        }
        else {
            return Infinity;
        }
    };
    Fx.getClosest(cd, distFn, pointData);
    if (pointData.index === false)
        return;
    const index = pointData.index;
    const cdi = cd[index];
    pointData.x0 = pointData.x1 = cdi.ct[0];
    pointData.y0 = pointData.y1 = cdi.ct[1];
    const _cdi = Lib.extendFlat({}, cdi, { r: cdi.s, theta: cdi.p });
    fillText(cdi, trace, pointData);
    makeHoverPointText(_cdi, trace, subplot, pointData);
    pointData.hovertemplate = trace.hovertemplate;
    pointData.color = getTraceColor(trace, cdi);
    pointData.xLabelVal = pointData.yLabelVal = undefined;
    if (cdi.s < 0) {
        pointData.idealAlign = 'left';
    }
    return [pointData];
}
