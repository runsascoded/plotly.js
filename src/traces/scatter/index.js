import subtypes from './subtypes.js';
import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _req2 from './defaults.js';
import _req3 from './cross_trace_defaults.js';
import _req4 from './layout_defaults.js';
import _calc from './calc.js';
const { calc: _req5 } = _calc;
import _req6 from './cross_trace_calc.js';
import _req7 from './arrays_to_calcdata.js';
import _req8 from './plot.js';
import _req9 from './marker_colorbar.js';
import _req10 from './format_labels.js';
import _style from './style.js';
const { style: _req11, styleOnSelect: _req12 } = _style;
import _req13 from './hover.js';
import _req14 from './select.js';
import _req15 from '../../plots/cartesian/index.js';
export default {
    hasLines: subtypes.hasLines,
    hasMarkers: subtypes.hasMarkers,
    hasText: subtypes.hasText,
    isBubble: subtypes.isBubble,
    attributes: _req0,
    layoutAttributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    arraysToCalcdata: _req7,
    plot: _req8,
    colorbar: _req9,
    formatLabels: _req10,
    style: _req11,
    styleOnSelect: _req12,
    hoverPoints: _req13,
    selectPoints: _req14,
    animatable: true,
    moduleType: 'trace',
    name: 'scatter',
    basePlotModule: _req15,
    categories: [
        'cartesian', 'svg', 'symbols', 'errorBarsOK', 'showLegend', 'scatter-like',
        'zoomScale'
    ],
    meta: {
        description: [
            'The scatter trace type encompasses line charts, scatter charts, text charts, and bubble charts.',
            'The data visualized as scatter point or lines is set in `x` and `y`.',
            'Text (appearing either on the chart or on hover only) is via `text`.',
            'Bubble charts are achieved by setting `marker.size` and/or `marker.color`',
            'to numerical arrays.'
        ].join(' ')
    }
};
