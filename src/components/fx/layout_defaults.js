import Lib, { coerceFont } from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
import handleHoverModeDefaults from './hovermode_defaults.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';
export default function supplyLayoutDefaults(layoutIn, layoutOut) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    const hoverMode = handleHoverModeDefaults(layoutIn, layoutOut);
    if (hoverMode) {
        coerce('hoverdistance');
        coerce('spikedistance');
    }
    const dragMode = coerce('dragmode');
    if (dragMode === 'select')
        coerce('selectdirection');
    // if only mapbox, map or geo subplots is present on graph,
    // reset 'zoom' dragmode to 'pan' until 'zoom' is implemented,
    // so that the correct modebar button is active
    const hasMapbox = layoutOut._has('mapbox');
    const hasMap = layoutOut._has('map');
    const hasGeo = layoutOut._has('geo');
    const len = layoutOut._basePlotModules.length;
    if (layoutOut.dragmode === 'zoom' && (((hasMapbox || hasMap || hasGeo) && len === 1) ||
        ((hasMapbox || hasMap) && hasGeo && len === 2))) {
        layoutOut.dragmode = 'pan';
    }
    handleHoverLabelDefaults(layoutIn, layoutOut, coerce);
    coerceFont(coerce, 'hoverlabel.grouptitlefont', layoutOut.hoverlabel.font);
}
