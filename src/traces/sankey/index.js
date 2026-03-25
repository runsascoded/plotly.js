import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import _req3 from './plot.js';
import _req4 from './base_plot.js';
import _req5 from './select.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    plot: _req3,

    moduleType: 'trace',
    name: 'sankey',
    basePlotModule: _req4,
    selectPoints: _req5,
    categories: ['noOpacity'],
    meta: {
        description: [
            'Sankey plots for network flow data analysis.',
            'The nodes are specified in `nodes` and the links between sources and targets in `links`.',
            'The colors are set in `nodes[i].color` and `links[i].color`, otherwise defaults are used.'
        ].join(' ')
    }
};
