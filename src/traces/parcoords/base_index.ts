import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import _req3 from './base_plot.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    colorbar: {
        container: 'line',
        min: 'cmin',
        max: 'cmax'
    },

    moduleType: 'trace',
    name: 'parcoords',
    basePlotModule: _req3,
    categories: ['gl', 'regl', 'noOpacity', 'noHover'],
    meta: {
        description: [
            'Parallel coordinates for multidimensional exploratory data analysis.',
            'The samples are specified in `dimensions`.',
            'The colors are set in `line.color`.'
        ].join(' ')
    }
};
