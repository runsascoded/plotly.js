import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import subTypes from '../scatter/subtypes.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';
import handleFillColorDefaults from '../scatter/fillcolor_defaults.js';
import attributes from './attributes.js';
import _constants from './constants.js';
const { isSupportedFont } = _constants;

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr, dflt?) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    function coerce2(attr: any, dflt?: any) {
        return Lib.coerce2(traceIn, traceOut, attributes, attr, dflt);
    }

    var len = handleLonLatDefaults(traceIn, traceOut, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    coerce('text');
    coerce('texttemplate');
    coerce('texttemplatefallback');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('mode');
    coerce('below');

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noLine: true, noAngle: true });

        coerce('marker.allowoverlap');
        coerce('marker.angle');

        // array marker.size and marker.color are only supported with circles
        var marker = traceOut.marker;
        if (marker.symbol !== 'circle') {
            if (Lib.isArrayOrTypedArray(marker.size)) marker.size = marker.size[0];
            if (Lib.isArrayOrTypedArray(marker.color)) marker.color = marker.color[0];
        }
    }

    if (subTypes.hasLines(traceOut)) {
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noDash: true });
        coerce('connectgaps');
    }

    var clusterMaxzoom = coerce2('cluster.maxzoom');
    var clusterStep = coerce2('cluster.step');
    var clusterColor = coerce2('cluster.color', (traceOut.marker && traceOut.marker.color) || defaultColor);
    var clusterSize = coerce2('cluster.size');
    var clusterOpacity = coerce2('cluster.opacity');

    var clusterEnabledDflt =
        clusterMaxzoom !== false ||
        clusterStep !== false ||
        clusterColor !== false ||
        clusterSize !== false ||
        clusterOpacity !== false;

    var clusterEnabled = coerce('cluster.enabled', clusterEnabledDflt);

    if (clusterEnabled || subTypes.hasText(traceOut)) {
        var layoutFontFamily = layout.font.family;

        handleTextDefaults(traceIn, traceOut, layout, coerce, {
            noSelect: true,
            noFontVariant: true,
            noFontShadow: true,
            noFontLineposition: true,
            noFontTextcase: true,
            font: {
                family: isSupportedFont(layoutFontFamily) ? layoutFontFamily : 'Open Sans Regular',
                weight: layout.font.weight,
                style: layout.font.style,
                size: layout.font.size,
                color: layout.font.color
            }
        });
    }

    coerce('fill');
    if (traceOut.fill !== 'none') {
        handleFillColorDefaults(traceIn, traceOut, defaultColor, coerce);
    }

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}

function handleLonLatDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce) {
    var lon = coerce('lon') || [];
    var lat = coerce('lat') || [];
    var len = Math.min(lon.length, lat.length);
    traceOut._length = len;

    return len;
}
