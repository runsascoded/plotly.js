import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib, { coerceSelectionMarkerOpacity } from '../../lib/index.js';
import { errorbarSupplyDefaults } from '../../components/errorbars/index.js';
import attributes from './attributes.js';
import constants from './constants.js';
import subTypes from './subtypes.js';
import handleXYDefaults from './xy_defaults.js';
import handlePeriodDefaults from './period_defaults.js';
import handleStackDefaults from './stack_defaults.js';
import handleMarkerDefaults from './marker_defaults.js';
import handleLineDefaults from './line_defaults.js';
import handleLineShapeDefaults from './line_shape_defaults.js';
import handleTextDefaults from './text_defaults.js';
import handleFillColorDefaults from './fillcolor_defaults.js';
import _index from '../../lib/index.js';
const { coercePattern } = _index;

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): any {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleXYDefaults(traceIn, traceOut, layout, coerce);
    if (!len) traceOut.visible = false;

    if (!traceOut.visible) return;

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('zorder');

    const stackGroupOpts = handleStackDefaults(traceIn, traceOut, layout, coerce);
    if (layout.scattermode === 'group' && traceOut.orientation === undefined) {
        coerce('orientation', 'v');
    }

    const defaultMode = !stackGroupOpts && len < constants.PTS_LINESONLY ? 'lines+markers' : 'lines';
    coerce('text');
    coerce('hovertext');
    coerce('mode', defaultMode);

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { gradient: true });
    }

    if (subTypes.hasLines(traceOut)) {
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce, { backoff: true });
        handleLineShapeDefaults(traceIn, traceOut, coerce);
        coerce('connectgaps');
        coerce('line.simplify');
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

    // It's possible for this default to be changed by a later trace.
    // We handle that case in some hacky code inside handleStackDefaults.
    coerce('fill', stackGroupOpts ? stackGroupOpts.fillDflt : 'none');
    if (traceOut.fill !== 'none') {
        handleFillColorDefaults(traceIn, traceOut, defaultColor, coerce, {
            moduleHasFillgradient: true
        });
        if (!subTypes.hasLines(traceOut)) handleLineShapeDefaults(traceIn, traceOut, coerce);
        coercePattern(coerce, 'fillpattern', traceOut.fillcolor, false);
    }

    const lineColor = (traceOut.line || {}).color;
    const markerColor = (traceOut.marker || {}).color;

    if (traceOut.fill === 'tonext' || traceOut.fill === 'toself') {
        dfltHoverOn.push('fills');
    }
    coerce('hoveron', dfltHoverOn.join('+') || 'points');
    if (traceOut.hoveron !== 'fills') {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }
    errorbarSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'y' });
    errorbarSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'x', inherit: 'y' });

    coerceSelectionMarkerOpacity(traceOut, coerce);
}
