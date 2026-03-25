import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import _req3 from './plot.js';
import _req4 from './base_plot.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    plot: _req3,
    colorbar: {
        container: 'line',
        min: 'cmin',
        max: 'cmax'
    },

    moduleType: 'trace',
    name: 'parcats',
    basePlotModule: _req4,
    categories: ['noOpacity'],
    meta: {
        description: [
            'Parallel categories diagram for multidimensional categorical data.'
        ].join(' ')
    }
};
