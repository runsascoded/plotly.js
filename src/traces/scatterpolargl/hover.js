import hover from '../scattergl/hover.js';
import _hover from '../scatterpolar/hover.js';
const { makeHoverPointText } = _hover;

function hoverPoints(pointData, xval, yval, hovermode) {
    var cd = pointData.cd;
    var stash = cd[0].t;
    var rArray = stash.r;
    var thetaArray = stash.theta;

    var scatterPointData = hover.hoverPoints(pointData, xval, yval, hovermode);
    if(!scatterPointData || scatterPointData[0].index === false) return;

    var newPointData = scatterPointData[0];

    if(newPointData.index === undefined) {
        return scatterPointData;
    }

    var subplot = pointData.subplot;
    var cdi = newPointData.cd[newPointData.index];
    var trace = newPointData.trace;

    // augment pointData with r/theta param
    cdi.r = rArray[newPointData.index];
    cdi.theta = thetaArray[newPointData.index];

    if(!subplot.isPtInside(cdi)) return;

    newPointData.xLabelVal = undefined;
    newPointData.yLabelVal = undefined;
    makeHoverPointText(cdi, trace, subplot, newPointData);

    return scatterPointData;
}

export default {
    hoverPoints: hoverPoints
};
