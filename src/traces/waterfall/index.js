import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req2, crossTraceDefaults: _req3 } = _defaults;
import _req4 from './layout_defaults.js';
import _req5 from './calc.js';
import _req6 from './cross_trace_calc.js';
import _req7 from './plot.js';
import _style from './style.js';
const { style: _req8 } = _style;
import _req9 from './hover.js';
import _req10 from './event_data.js';
import _req11 from '../bar/select.js';
import _req12 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    layoutAttributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    plot: _req7,
    style: _req8,
    hoverPoints: _req9,
    eventData: _req10,

    selectPoints: _req11,

    moduleType: 'trace',
    name: 'waterfall',
    basePlotModule: _req12,
    categories: ['bar-like', 'cartesian', 'svg', 'oriented', 'showLegend', 'zoomScale'],
    meta: {
        description: [
            'Draws waterfall trace which is useful graph to displays the',
            'contribution of various elements (either positive or negative)',
            'in a bar chart. The data visualized by the span of the bars is',
            'set in `y` if `orientation` is set to *v* (the default) and the',
            'labels are set in `x`.',
            'By setting `orientation` to *h*, the roles are interchanged.'
        ].join(' ')
    }
};
