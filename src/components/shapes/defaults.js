import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
import helpers from './helpers.js';
export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    handleArrayContainerDefaults(layoutIn, layoutOut, {
        name: 'shapes',
        handleItemDefaults: handleShapeDefaults
    });
}
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
function handleShapeDefaults(shapeIn, shapeOut, fullLayout) {
    function coerce(attr, dflt) {
        return Lib.coerce(shapeIn, shapeOut, attributes, attr, dflt);
    }
    shapeOut._isShape = true;
    const visible = coerce('visible');
    if (!visible)
        return;
    const showlegend = coerce('showlegend');
    if (showlegend) {
        coerce('legend');
        coerce('legendwidth');
        coerce('legendgroup');
        coerce('legendgrouptitle.text');
        Lib.coerceFont(coerce, 'legendgrouptitle.font');
        coerce('legendrank');
    }
    const path = coerce('path');
    const dfltType = path ? 'path' : 'rect';
    const shapeType = coerce('type', dfltType);
    const noPath = shapeType !== 'path';
    if (noPath)
        delete shapeOut.path;
    coerce('editable');
    coerce('layer');
    coerce('opacity');
    coerce('fillcolor');
    coerce('fillrule');
    const lineWidth = coerce('line.width');
    if (lineWidth) {
        coerce('line.color');
        coerce('line.dash');
    }
    const xSizeMode = coerce('xsizemode');
    const ySizeMode = coerce('ysizemode');
    // positioning
    const axLetters = ['x', 'y'];
    for (let i = 0; i < 2; i++) {
        const axLetter = axLetters[i];
        const attrAnchor = axLetter + 'anchor';
        const sizeMode = axLetter === 'x' ? xSizeMode : ySizeMode;
        const gdMock = { _fullLayout: fullLayout };
        let ax;
        let pos2r;
        let r2pos;
        // xref, yref
        const axRef = Axes.coerceRef(shapeIn, shapeOut, gdMock, axLetter, undefined, 'paper');
        const axRefType = Axes.getRefType(axRef);
        if (axRefType === 'range') {
            ax = Axes.getFromId(gdMock, axRef);
            ax._shapeIndices.push(shapeOut._index);
            r2pos = helpers.rangeToShapePosition(ax);
            pos2r = helpers.shapePositionToRange(ax);
            if (ax.type === 'category' || ax.type === 'multicategory') {
                coerce(axLetter + '0shift');
                coerce(axLetter + '1shift');
            }
        }
        else {
            pos2r = r2pos = Lib.identity;
        }
        // Coerce x0, x1, y0, y1
        if (noPath) {
            const dflt0 = 0.25;
            const dflt1 = 0.75;
            // hack until V3.0 when log has regular range behavior - make it look like other
            // ranges to send to coerce, then put it back after
            // this is all to give reasonable default position behavior on log axes, which is
            // a pretty unimportant edge case so we could just ignore this.
            const attr0 = axLetter + '0';
            const attr1 = axLetter + '1';
            const in0 = shapeIn[attr0];
            const in1 = shapeIn[attr1];
            shapeIn[attr0] = pos2r(shapeIn[attr0], true);
            shapeIn[attr1] = pos2r(shapeIn[attr1], true);
            if (sizeMode === 'pixel') {
                coerce(attr0, 0);
                coerce(attr1, 10);
            }
            else {
                Axes.coercePosition(shapeOut, gdMock, coerce, axRef, attr0, dflt0);
                Axes.coercePosition(shapeOut, gdMock, coerce, axRef, attr1, dflt1);
            }
            // hack part 2
            shapeOut[attr0] = r2pos(shapeOut[attr0]);
            shapeOut[attr1] = r2pos(shapeOut[attr1]);
            shapeIn[attr0] = in0;
            shapeIn[attr1] = in1;
        }
        // Coerce xanchor and yanchor
        if (sizeMode === 'pixel') {
            // Hack for log axis described above
            const inAnchor = shapeIn[attrAnchor];
            shapeIn[attrAnchor] = pos2r(shapeIn[attrAnchor], true);
            Axes.coercePosition(shapeOut, gdMock, coerce, axRef, attrAnchor, 0.25);
            // Hack part 2
            shapeOut[attrAnchor] = r2pos(shapeOut[attrAnchor]);
            shapeIn[attrAnchor] = inAnchor;
        }
    }
    if (noPath) {
        Lib.noneOrAll(shapeIn, shapeOut, ['x0', 'x1', 'y0', 'y1']);
    }
    // Label options
    const isLine = shapeType === 'line';
    let labelTextTemplate, labelText;
    if (noPath) {
        labelTextTemplate = coerce('label.texttemplate');
        coerce('label.texttemplatefallback');
    }
    if (!labelTextTemplate) {
        labelText = coerce('label.text');
    }
    if (labelText || labelTextTemplate) {
        coerce('label.textangle');
        const labelTextPosition = coerce('label.textposition', isLine ? 'middle' : 'middle center');
        coerce('label.xanchor');
        coerce('label.yanchor', dfltLabelYanchor(isLine, labelTextPosition));
        coerce('label.padding');
        Lib.coerceFont(coerce, 'label.font', fullLayout.font);
    }
}
