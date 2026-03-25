import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import { handleText } from '../bar/defaults.js';
import handleStyleDefaults from '../bar/style_defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    var x = coerce('x');
    var y = coerce('y');

    var cumulative = coerce('cumulative.enabled');
    if (cumulative) {
        coerce('cumulative.direction');
        coerce('cumulative.currentbin');
    }

    coerce('text');
    var textposition = coerce('textposition');
    handleText(traceIn, traceOut, layout, coerce, textposition, {
        moduleHasSelected: true,
        moduleHasUnselected: true,
        moduleHasConstrain: true,
        moduleHasCliponaxis: true,
        moduleHasTextangle: true,
        moduleHasInsideanchor: true
    });

    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('xhoverformat');
    coerce('yhoverformat');

    var orientation = coerce('orientation', y && !x ? 'h' : 'v');
    var sampleLetter = orientation === 'v' ? 'x' : 'y';
    var aggLetter = orientation === 'v' ? 'y' : 'x';

    var len =
        x && y ? Math.min(Lib.minRowLength(x) && Lib.minRowLength(y)) : Lib.minRowLength(traceOut[sampleLetter] || []);

    if (!len) {
        traceOut.visible = false;
        return;
    }

    traceOut._length = len;

    var handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);

    var hasAggregationData = traceOut[aggLetter];
    if (hasAggregationData) coerce('histfunc');
    coerce('histnorm');

    // Note: bin defaults are now handled in Histogram.crossTraceDefaults
    // autobin(x|y) are only included here to appease Plotly.validate
    coerce('autobin' + sampleLetter);

    handleStyleDefaults(traceIn, traceOut, coerce, defaultColor, layout);

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);

    var lineColor = (traceOut.marker.line || {}).color;

    // override defaultColor for error bars with defaultLine
    var errorBarsSupplyDefaults = Registry.getComponentMethod('errorbars', 'supplyDefaults');
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'y' });
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'x', inherit: 'y' });

    coerce('zorder');
}
