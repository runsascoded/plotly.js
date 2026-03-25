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

    moduleType: 'trace',
    name: 'table',
    basePlotModule: _req4,
    categories: ['noOpacity'],
    meta: {
        description: [
            'Table view for detailed data viewing.',
            'The data are arranged in a grid of rows and columns.',
            'Most styling can be specified for columns, rows or individual cells.',
            'Table is using a column-major order, ie. the grid is represented as a vector of column vectors.'
        ].join(' ')
    }
};
