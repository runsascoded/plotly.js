import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import handleAnnotationCommonDefaults from './common_defaults.js';
import attributes from './attributes.js';
export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    handleArrayContainerDefaults(layoutIn, layoutOut, {
        name: 'annotations',
        handleItemDefaults: handleAnnotationDefaults
    });
}
function handleAnnotationDefaults(annIn, annOut, fullLayout) {
    function coerce(attr, dflt) {
        return Lib.coerce(annIn, annOut, attributes, attr, dflt);
    }
    const visible = coerce('visible');
    const clickToShow = coerce('clicktoshow');
    if (!(visible || clickToShow))
        return;
    handleAnnotationCommonDefaults(annIn, annOut, fullLayout, coerce);
    const showArrow = annOut.showarrow;
    // positioning
    const axLetters = ['x', 'y'];
    const arrowPosDflt = [-10, -30];
    const gdMock = { _fullLayout: fullLayout };
    for (let i = 0; i < 2; i++) {
        const axLetter = axLetters[i];
        // xref, yref
        const axRef = Axes.coerceRef(annIn, annOut, gdMock, axLetter, '', 'paper');
        if (axRef !== 'paper') {
            const ax = Axes.getFromId(gdMock, axRef);
            ax._annIndices.push(annOut._index);
        }
        // x, y
        Axes.coercePosition(annOut, gdMock, coerce, axRef, axLetter, 0.5);
        if (showArrow) {
            const arrowPosAttr = 'a' + axLetter;
            // axref, ayref
            let aaxRef = Axes.coerceRef(annIn, annOut, gdMock, arrowPosAttr, 'pixel', ['pixel', 'paper']);
            // for now the arrow can only be on the same axis or specified as pixels
            // TODO: sometime it might be interesting to allow it to be on *any* axis
            // but that would require updates to drawing & autorange code and maybe more
            if (aaxRef !== 'pixel' && aaxRef !== axRef) {
                aaxRef = annOut[arrowPosAttr] = 'pixel';
            }
            // ax, ay
            const aDflt = (aaxRef === 'pixel') ? arrowPosDflt[i] : 0.4;
            Axes.coercePosition(annOut, gdMock, coerce, aaxRef, arrowPosAttr, aDflt);
        }
        // xanchor, yanchor
        coerce(axLetter + 'anchor');
        // xshift, yshift
        coerce(axLetter + 'shift');
    }
    // if you have one coordinate you should have both
    Lib.noneOrAll(annIn, annOut, ['x', 'y']);
    // if you have one part of arrow length you should have both
    if (showArrow) {
        Lib.noneOrAll(annIn, annOut, ['ax', 'ay']);
    }
    if (clickToShow) {
        const xClick = coerce('xclick');
        const yClick = coerce('yclick');
        // put the actual click data to bind to into private attributes
        // so we don't have to do this little bit of logic on every hover event
        annOut._xclick = (xClick === undefined) ?
            annOut.x :
            Axes.cleanPosition(xClick, gdMock, annOut.xref);
        annOut._yclick = (yClick === undefined) ?
            annOut.y :
            Axes.cleanPosition(yClick, gdMock, annOut.yref);
    }
}
