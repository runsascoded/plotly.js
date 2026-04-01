import type { FullAxis, FullTrace, PlotInfo } from '../../../types/core';
import scatterHover from '../scatter/hover.js';

function hoverPoints(pointData, xval, yval, hovermode) {
    var scatterPointData = scatterHover(pointData, xval, yval, hovermode);
    if(!scatterPointData || scatterPointData[0].index === false) return;

    var newPointData = scatterPointData[0];

    // hovering on fill case
    if(newPointData.index === undefined) {
        return scatterPointData;
    }

    var subplot = pointData.subplot;
    var cdi = newPointData.cd[newPointData.index];
    var trace = newPointData.trace;

    if(!subplot.isPtInside(cdi)) return;

    newPointData.xLabelVal = undefined;
    newPointData.yLabelVal = undefined;
    makeHoverPointText(cdi, trace, subplot, newPointData);
    newPointData.hovertemplate = trace.hovertemplate;
    return scatterPointData;
}

function makeHoverPointText(cdi, trace: FullTrace, subplot: PlotInfo, pointData) {
    var realAxis = subplot.radialAxis;
    var imaginaryAxis = subplot.angularAxis;
    realAxis._hovertitle = 'real';
    imaginaryAxis._hovertitle = 'imag';

    var fullLayout: any = {};
    fullLayout[trace.subplot] = {_subplot: subplot};
    var labels = trace._module.formatLabels(cdi, trace, fullLayout);
    pointData.realLabel = labels.realLabel;
    pointData.imagLabel = labels.imagLabel;

    var hoverinfo = cdi.hi || trace.hoverinfo;
    var text = [];
    function textPart(ax: FullAxis, val) {
        text.push(ax._hovertitle + ': ' + val);
    }

    if(!trace.hovertemplate) {
        var parts = hoverinfo.split('+');

        if(parts.indexOf('all') !== -1) parts = ['real', 'imag', 'text'];
        if(parts.indexOf('real') !== -1) textPart(realAxis, pointData.realLabel);
        if(parts.indexOf('imag') !== -1) textPart(imaginaryAxis, pointData.imagLabel);

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
