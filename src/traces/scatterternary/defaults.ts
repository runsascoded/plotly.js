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

    const a = coerce('a');
    const b = coerce('b');
    const c = coerce('c');
    let len;

    // allow any one array to be missing, len is the minimum length of those
    // present. Note that after coerce data_array's are either Arrays (which
    // are truthy even if empty) or undefined. As in scatter, an empty array
    // is different from undefined, because it can signify that this data is
    // not known yet but expected in the future
    if (a) {
        len = a.length;
        if (b) {
            len = Math.min(len, b.length);
            if (c) len = Math.min(len, c.length);
        } else if (c) len = Math.min(len, c.length);
        else len = 0;
    } else if (b && c) {
        len = Math.min(b.length, c.length);
    }

    if (!len) {
        traceOut.visible = false;
        return;
    }

    traceOut._length = len;

    coerce('sum');

    coerce('text');
    coerce('hovertext');
    if (traceOut.hoveron !== 'fills') {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }

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
        coerce('texttemplate');
        coerce('texttemplatefallback');
        handleTextDefaults(traceIn, traceOut, layout, coerce);
    }

    const dfltHoverOn: any[] = [];

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
