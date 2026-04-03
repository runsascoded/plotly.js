import Color from '../../color/index.js';
import Lib from '../../../lib/index.js';
function dfltLabelYanchor(isLine, labelTextPosition) {
    // If shape is a line, default y-anchor is 'bottom' (so that text is above line by default)
    // Otherwise, default y-anchor is equal to y-component of `textposition`
    // (so that text is positioned inside shape bounding box by default)
    return isLine
        ? 'bottom'
        : labelTextPosition.indexOf('top') !== -1
            ? 'top'
            : labelTextPosition.indexOf('bottom') !== -1
                ? 'bottom'
                : 'middle';
}
export default function supplyDrawNewShapeDefaults(layoutIn, layoutOut, coerce) {
    coerce('newshape.visible');
    coerce('newshape.name');
    coerce('newshape.showlegend');
    coerce('newshape.legend');
    coerce('newshape.legendwidth');
    coerce('newshape.legendgroup');
    coerce('newshape.legendgrouptitle.text');
    Lib.coerceFont(coerce, 'newshape.legendgrouptitle.font');
    coerce('newshape.legendrank');
    coerce('newshape.drawdirection');
    coerce('newshape.layer');
    coerce('newshape.fillcolor');
    coerce('newshape.fillrule');
    coerce('newshape.opacity');
    const newshapeLineWidth = coerce('newshape.line.width');
    if (newshapeLineWidth) {
        const bgcolor = (layoutIn || {}).plot_bgcolor || '#FFF';
        coerce('newshape.line.color', Color.contrast(bgcolor));
        coerce('newshape.line.dash');
    }
    const isLine = layoutIn.dragmode === 'drawline';
    const labelText = coerce('newshape.label.text');
    const labelTextTemplate = coerce('newshape.label.texttemplate');
    coerce('newshape.label.texttemplatefallback');
    if (labelText || labelTextTemplate) {
        coerce('newshape.label.textangle');
        const labelTextPosition = coerce('newshape.label.textposition', isLine ? 'middle' : 'middle center');
        coerce('newshape.label.xanchor');
        coerce('newshape.label.yanchor', dfltLabelYanchor(isLine, labelTextPosition));
        coerce('newshape.label.padding');
        Lib.coerceFont(coerce, 'newshape.label.font', layoutOut.font);
    }
    coerce('activeshape.fillcolor');
    coerce('activeshape.opacity');
}
