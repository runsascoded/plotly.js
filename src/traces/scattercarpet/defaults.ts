import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import constants from '../scatter/constants.js';
import subTypes from '../scatter/subtypes.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleLineShapeDefaults from '../scatter/line_shape_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';
import handleFillColorDefaults from '../scatter/fillcolor_defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr, dflt?) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    coerce('carpet');

    // XXX: Don't hard code this
    traceOut.xaxis = 'x';
    traceOut.yaxis = 'y';

    const a = coerce('a');
    const b = coerce('b');
    const len = Math.min(a.length, b.length);

    if (!len) {
        traceOut.visible = false;
        return;
    }

    traceOut._length = len;

    coerce('text');
    coerce('texttemplate');
    coerce('texttemplatefallback');
    coerce('hovertext');

    const defaultMode = len < constants.PTS_LINESONLY ? 'lines+markers' : 'lines';
    coerce('mode', defaultMode);

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { gradient: true });
    }

    if (subTypes.hasLines(traceOut)) {
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce, { backoff: true });
        handleLineShapeDefaults(traceIn, traceOut, coerce);
        coerce('connectgaps');
    }

    if (subTypes.hasText(traceOut)) {
        handleTextDefaults(traceIn, traceOut, layout, coerce);
    }

    const dfltHoverOn = [];

    if (subTypes.hasMarkers(traceOut) || subTypes.hasText(traceOut)) {
        coerce('marker.maxdisplayed');
        dfltHoverOn.push('points');
    }

    coerce('fill');
    if (traceOut.fill !== 'none') {
        handleFillColorDefaults(traceIn, traceOut, defaultColor, coerce);
        if (!subTypes.hasLines(traceOut)) handleLineShapeDefaults(traceIn, traceOut, coerce);
    }

    if (traceOut.fill === 'tonext' || traceOut.fill === 'toself') {
        dfltHoverOn.push('fills');
    }

    const hoverOn = coerce('hoveron', dfltHoverOn.join('+') || 'points');
    if (hoverOn !== 'fills') {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }

    coerce('zorder');
    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
