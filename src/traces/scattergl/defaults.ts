import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import Registry from '../../registry.js';
import helpers from './helpers.js';
import attributes from './attributes.js';
import constants from '../scatter/constants.js';
import subTypes from '../scatter/subtypes.js';
import handleXYDefaults from '../scatter/xy_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleFillColorDefaults from '../scatter/fillcolor_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr, dflt?) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const isOpen = traceIn.marker ? helpers.isOpenSymbol(traceIn.marker.symbol) : false;
    const isBubble = subTypes.isBubble(traceIn);

    const len = handleXYDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    const defaultMode = len < constants.PTS_LINESONLY ? 'lines+markers' : 'lines';

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('mode', defaultMode);

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noAngleRef: true, noStandOff: true });
        coerce('marker.line.width', isOpen || isBubble ? 1 : 0);
    }

    if (subTypes.hasLines(traceOut)) {
        coerce('connectgaps');
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);
        coerce('line.shape');
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

    const lineColor = (traceOut.line || {}).color;
    const markerColor = (traceOut.marker || {}).color;

    coerce('fill');
    if (traceOut.fill !== 'none') {
        handleFillColorDefaults(traceIn, traceOut, defaultColor, coerce);
    }

    const errorBarsSupplyDefaults = Registry.getComponentMethod('errorbars', 'supplyDefaults');
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'y' });
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'x', inherit: 'y' });

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
