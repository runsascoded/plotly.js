import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req2, crossTraceDefaults: _req3 } = _defaults;
import _req4 from './layout_defaults.js';
import _req5 from './calc.js';
import _cross_trace_calc from './cross_trace_calc.js';
const { crossTraceCalc: _req6 } = _cross_trace_calc;
import _req7 from '../scatter/marker_colorbar.js';
import _req8 from './arrays_to_calcdata.js';
import _plot from './plot.js';
const { plot: _req9 } = _plot;
import _style from './style.js';
const { style: _req10, styleOnSelect: _req11 } = _style;
import _hover from './hover.js';
const { hoverPoints: _req12 } = _hover;
import _req13 from './event_data.js';
import _req14 from './select.js';
import _req15 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    layoutAttributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    colorbar: _req7,
    arraysToCalcdata: _req8,
    plot: _req9,
    style: _req10,
    styleOnSelect: _req11,
    hoverPoints: _req12,
    eventData: _req13,
    selectPoints: _req14,

    moduleType: 'trace',
    name: 'bar',
    basePlotModule: _req15,
    categories: ['bar-like', 'cartesian', 'svg', 'bar', 'oriented', 'errorBarsOK', 'showLegend', 'zoomScale'],
    animatable: true,
    meta: {
        description: [
            'The data visualized by the span of the bars is set in `y`',
            'if `orientation` is set to *v* (the default)',
            'and the labels are set in `x`.',
            'By setting `orientation` to *h*, the roles are interchanged.'
        ].join(' ')
    }
};
