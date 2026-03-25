import _req0 from './base_plot.js';
import _req1 from './attributes.js';
import _req2 from './layout_attributes.js';
import _req3 from './defaults.js';
import _req4 from './layout_defaults.js';
import { calc as _req5 } from './calc.js';
import { crossTraceCalc as _req6 } from './calc.js';
import _req7 from './plot.js';
import _req8 from './style.js';
import _req9 from '../pie/style_one.js';

export default {
    moduleType: 'trace',
    name: 'funnelarea',
    basePlotModule: _req0,
    categories: ['pie-like', 'funnelarea', 'showLegend'],

    attributes: _req1,
    layoutAttributes: _req2,
    supplyDefaults: _req3,
    supplyLayoutDefaults: _req4,

    calc: _req5,
    crossTraceCalc: _req6,

    plot: _req7,
    style: _req8,
    styleOne: _req9,

    meta: {
        description: [
            'Visualize stages in a process using area-encoded trapezoids. This trace can be used',
            'to show data in a part-to-whole representation similar to a "pie" trace, wherein',
            'each item appears in a single stage. See also the "funnel" trace type for a different',
            'approach to visualizing funnel data.'
        ].join(' ')
    }
};
