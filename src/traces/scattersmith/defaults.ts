import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import subTypes from '../scatter/subtypes.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleLineShapeDefaults from '../scatter/line_shape_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';
import handleFillColorDefaults from '../scatter/fillcolor_defaults.js';
import _constants from '../scatter/constants.js';
const { PTS_LINESONLY } = _constants;
import attributes from './attributes.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr, dflt?) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleRealImagDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    coerce('mode', len < PTS_LINESONLY ? 'lines+markers' : 'lines');
    coerce('text');
    coerce('hovertext');
    if (traceOut.hoveron !== 'fills') {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { gradient: true });
    }

    if (subTypes.hasLines(traceOut)) {
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce, { backoff: true });
        handleLineShapeDefaults(traceIn, traceOut, coerce);
        coerce('connectgaps');
    }

    if (subTypes.hasText(traceOut)) {
        coerce('texttemplate');
        coerce('texttemplatefallback');
        handleTextDefaults(traceIn, traceOut, layout, coerce);
    }

    const dfltHoverOn = [];

    if (subTypes.hasMarkers(traceOut) || subTypes.hasText(traceOut)) {
        coerce('cliponaxis');
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
    coerce('hoveron', dfltHoverOn.join('+') || 'points');

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}

function handleRealImagDefaults(traceIn: InputTrace, traceOut: FullTrace, layout: FullLayout, coerce) {
    let real = coerce('real');
    let imag = coerce('imag');
    let len;

    if (real && imag) {
        len = Math.min(real.length, imag.length);
    }

    // TODO: handle this case outside supply defaults step
    if (Lib.isTypedArray(real)) {
        traceOut.real = real = Array.from(real);
    }
    if (Lib.isTypedArray(imag)) {
        traceOut.imag = imag = Array.from(imag);
    }

    traceOut._length = len;
    return len;
}
