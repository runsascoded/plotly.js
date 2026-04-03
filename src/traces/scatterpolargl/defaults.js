import Lib from '../../lib/index.js';
import subTypes from '../scatter/subtypes.js';
import _defaults from '../scatterpolar/defaults.js';
const { handleRThetaDefaults } = _defaults;
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';
import handleFillColorDefaults from '../scatter/fillcolor_defaults.js';
import _constants from '../scatter/constants.js';
const { PTS_LINESONLY } = _constants;
import attributes from './attributes.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const len = handleRThetaDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }
    coerce('thetaunit');
    coerce('mode', len < PTS_LINESONLY ? 'lines+markers' : 'lines');
    coerce('text');
    coerce('hovertext');
    if (traceOut.hoveron !== 'fills') {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }
    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noAngleRef: true, noStandOff: true });
    }
    if (subTypes.hasLines(traceOut)) {
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);
        coerce('connectgaps');
    }
    if (subTypes.hasText(traceOut)) {
        coerce('texttemplate');
        coerce('texttemplatefallback');
        handleTextDefaults(traceIn, traceOut, layout, coerce, {
            noFontShadow: true,
            noFontLineposition: true,
            noFontTextcase: true
        });
    }
    coerce('fill');
    if (traceOut.fill !== 'none') {
        handleFillColorDefaults(traceIn, traceOut, defaultColor, coerce);
    }
    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
