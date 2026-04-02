import hover from '../scattergl/hover.js';
import _hover from '../scatterpolar/hover.js';
const { makeHoverPointText } = _hover;

function hoverPoints(pointData: any, xval: any, yval: any, hovermode: any) {
    const cd = pointData.cd;
    const stash = cd[0].t;
    const rArray = stash.r;
    const thetaArray = stash.theta;

    const scatterPointData = hover.hoverPoints(pointData, xval, yval, hovermode);
    if(!scatterPointData || scatterPointData[0].index === false) return;

    const newPointData = scatterPointData[0];

    if(newPointData.index === undefined) {
        return scatterPointData;
    }

    const subplot = pointData.subplot;
    const cdi = newPointData.cd[newPointData.index];
    const trace = newPointData.trace;

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
