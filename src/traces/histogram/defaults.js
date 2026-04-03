import { getComponentMethod } from '../../registry.js';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import handleStyleDefaults from '../bar/style_defaults.js';
import attributes from './attributes.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const x = coerce('x');
    const y = coerce('y');
    const cumulative = coerce('cumulative.enabled');
    if (cumulative) {
        coerce('cumulative.direction');
        coerce('cumulative.currentbin');
    }
    coerce('text');
    const textposition = coerce('textposition');
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
    const orientation = coerce('orientation', y && !x ? 'h' : 'v');
    const sampleLetter = orientation === 'v' ? 'x' : 'y';
    const aggLetter = orientation === 'v' ? 'y' : 'x';
    const len = x && y ? Math.min(Lib.minRowLength(x) && Lib.minRowLength(y)) : Lib.minRowLength(traceOut[sampleLetter] || []);
    if (!len) {
        traceOut.visible = false;
        return;
    }
    traceOut._length = len;
    const handleCalendarDefaults = getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);
    const hasAggregationData = traceOut[aggLetter];
    if (hasAggregationData)
        coerce('histfunc');
    coerce('histnorm');
    // Note: bin defaults are now handled in Histogram.crossTraceDefaults
    // autobin(x|y) are only included here to appease Plotly.validate
    coerce('autobin' + sampleLetter);
    handleStyleDefaults(traceIn, traceOut, coerce, defaultColor, layout);
    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
    const lineColor = (traceOut.marker.line || {}).color;
    // override defaultColor for error bars with defaultLine
    const errorBarsSupplyDefaults = getComponentMethod('errorbars', 'supplyDefaults');
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'y' });
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'x', inherit: 'y' });
    coerce('zorder');
}
