import type { FullAxis, FullTrace, PlotInfo } from '../../../types/core';
import scatterHover from '../scatter/hover.js';

function hoverPoints(pointData, xval, yval, hovermode) {
    const scatterPointData = scatterHover(pointData, xval, yval, hovermode);
    if(!scatterPointData || scatterPointData[0].index === false) return;

    const newPointData = scatterPointData[0];

    // hovering on fill case
    if(newPointData.index === undefined) {
        return scatterPointData;
    }

    const subplot = pointData.subplot;
    const cdi = newPointData.cd[newPointData.index];
    const trace = newPointData.trace;

    if(!subplot.isPtInside(cdi)) return;

    newPointData.xLabelVal = undefined;
    newPointData.yLabelVal = undefined;
    makeHoverPointText(cdi, trace, subplot, newPointData);
    newPointData.hovertemplate = trace.hovertemplate;
    return scatterPointData;
}

function makeHoverPointText(cdi, trace: FullTrace, subplot: PlotInfo, pointData) {
    const radialAxis = subplot.radialAxis;
    const angularAxis = subplot.angularAxis;
    radialAxis._hovertitle = 'r';
    angularAxis._hovertitle = 'θ';

    const fullLayout: any = {};
    fullLayout[trace.subplot] = {_subplot: subplot};
    const labels = trace._module.formatLabels(cdi, trace, fullLayout);
    pointData.rLabel = labels.rLabel;
    pointData.thetaLabel = labels.thetaLabel;

    const hoverinfo = cdi.hi || trace.hoverinfo;
    const text = [];
    function textPart(ax: FullAxis, val) {
        text.push(ax._hovertitle + ': ' + val);
    }

    if(!trace.hovertemplate) {
        let parts = hoverinfo.split('+');

        if(parts.indexOf('all') !== -1) parts = ['r', 'theta', 'text'];
        if(parts.indexOf('r') !== -1) textPart(radialAxis, pointData.rLabel);
        if(parts.indexOf('theta') !== -1) textPart(angularAxis, pointData.thetaLabel);

        if(parts.indexOf('text') !== -1 && pointData.text) {
            text.push(pointData.text);
            delete pointData.text;
        }

        pointData.extraText = text.join('<br>');
    }
}

export default {
    hoverPoints: hoverPoints,
    makeHoverPointText: makeHoverPointText
};
