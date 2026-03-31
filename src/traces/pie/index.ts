import _req0 from './attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req1 } = _defaults;
import _req2 from './layout_defaults.js';
import _req3 from './layout_attributes.js';
import _calc from './calc.js';
const { calc: _req4, crossTraceCalc: _req5 } = _calc;
import _plot from './plot.js';
const { plot: _req6 } = _plot;
import _req7 from './style.js';
import _req8 from './style_one.js';
import _req9 from './base_plot.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    supplyLayoutDefaults: _req2,
    layoutAttributes: _req3,

    calc: _req4,
    crossTraceCalc: _req5,

    plot: _req6,
    style: _req7,
    styleOne: _req8,

    moduleType: 'trace' as const,
    name: 'pie',
    basePlotModule: _req9,
    categories: ['pie-like', 'pie', 'showLegend'],
    meta: {
        description: [
            'A data visualized by the sectors of the pie is set in `values`.',
            'The sector labels are set in `labels`.',
            'The sector colors are set in `marker.colors`'
        ].join(' ')
    }
};
