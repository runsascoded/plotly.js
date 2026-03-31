import Color from '../../components/color/index.js';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import { coercePattern } from '../../lib/index.js';

export default function handleStyleDefaults(traceIn: any, traceOut: any, coerce: any, defaultColor: any, layout: any): void {
    var markerColor = coerce('marker.color', defaultColor);
    var hasMarkerColorscale = hasColorscale(traceIn, 'marker');
    if(hasMarkerColorscale) {
        colorscaleDefaults(
            traceIn, traceOut, layout, coerce, {prefix: 'marker.', cLetter: 'c'}
        );
    }

    coerce('marker.line.color', Color.defaultLine);

    if(hasColorscale(traceIn, 'marker.line')) {
        colorscaleDefaults(
            traceIn, traceOut, layout, coerce, {prefix: 'marker.line.', cLetter: 'c'}
        );
    }

    coerce('marker.line.width');
    coerce('marker.opacity');
    coercePattern(coerce, 'marker.pattern', markerColor, hasMarkerColorscale);
    coerce('selected.marker.color');
    coerce('unselected.marker.color');
}
