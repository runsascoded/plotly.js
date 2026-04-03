import scatterHover from '../scatter/hover.js';
function hoverPoints(pointData, xval, yval, hovermode) {
    const scatterPointData = scatterHover(pointData, xval, yval, hovermode);
    if (!scatterPointData || scatterPointData[0].index === false)
        return;
    const newPointData = scatterPointData[0];
    // hovering on fill case
    if (newPointData.index === undefined) {
        return scatterPointData;
    }
    const subplot = pointData.subplot;
    const cdi = newPointData.cd[newPointData.index];
    const trace = newPointData.trace;
    if (!subplot.isPtInside(cdi))
        return;
    newPointData.xLabelVal = undefined;
    newPointData.yLabelVal = undefined;
    makeHoverPointText(cdi, trace, subplot, newPointData);
    newPointData.hovertemplate = trace.hovertemplate;
    return scatterPointData;
}
function makeHoverPointText(cdi, trace, subplot, pointData) {
    const realAxis = subplot.radialAxis;
    const imaginaryAxis = subplot.angularAxis;
    realAxis._hovertitle = 'real';
    imaginaryAxis._hovertitle = 'imag';
    const fullLayout = {};
    fullLayout[trace.subplot] = { _subplot: subplot };
    const labels = trace._module.formatLabels(cdi, trace, fullLayout);
    pointData.realLabel = labels.realLabel;
    pointData.imagLabel = labels.imagLabel;
    const hoverinfo = cdi.hi || trace.hoverinfo;
    const text = [];
    function textPart(ax, val) {
        text.push(ax._hovertitle + ': ' + val);
    }
    if (!trace.hovertemplate) {
        let parts = hoverinfo.split('+');
        if (parts.indexOf('all') !== -1)
            parts = ['real', 'imag', 'text'];
        if (parts.indexOf('real') !== -1)
            textPart(realAxis, pointData.realLabel);
        if (parts.indexOf('imag') !== -1)
            textPart(imaginaryAxis, pointData.imagLabel);
        if (parts.indexOf('text') !== -1 && pointData.text) {
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
