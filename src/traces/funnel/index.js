import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import { supplyDefaults as _req2 } from './defaults.js';
import { crossTraceDefaults as _req3 } from './defaults.js';
import _req4 from './layout_defaults.js';
import _req5 from './calc.js';
import _req6 from './cross_trace_calc.js';
import _req7 from './plot.js';
import { style as _req8 } from './style.js';
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
    name: 'funnel',
    basePlotModule: _req12,
    categories: ['bar-like', 'cartesian', 'svg', 'oriented', 'showLegend', 'zoomScale'],
    meta: {
        description: [
            'Visualize stages in a process using length-encoded bars. This trace can be used',
            'to show data in either a part-to-whole representation wherein each item appears',
            'in a single stage, or in a "drop-off" representation wherein each item appears in',
            'each stage it traversed. See also the "funnelarea" trace type for a different',
            'approach to visualizing funnel data.'
        ].join(' ')
    }
};
