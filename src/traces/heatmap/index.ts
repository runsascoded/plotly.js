import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import _req3 from './plot.js';
import _req4 from './colorbar.js';
import _req5 from './style.js';
import _req6 from './hover.js';
import _req7 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    plot: _req3,
    colorbar: _req4,
    style: _req5,
    hoverPoints: _req6,

    moduleType: 'trace',
    name: 'heatmap',
    basePlotModule: _req7,
    categories: ['cartesian', 'svg', '2dMap', 'showLegend'],
    meta: {
        description: [
            'The data that describes the heatmap value-to-color mapping',
            'is set in `z`.',
            'Data in `z` can either be a {2D array} of values (ragged or not)',
            'or a 1D array of values.',

            'In the case where `z` is a {2D array},',
            'say that `z` has N rows and M columns.',
            'Then, by default, the resulting heatmap will have N partitions along',
            'the y axis and M partitions along the x axis.',
            'In other words, the i-th row/ j-th column cell in `z`',
            'is mapped to the i-th partition of the y axis',
            '(starting from the bottom of the plot) and the j-th partition',
            'of the x-axis (starting from the left of the plot).',
            'This behavior can be flipped by using `transpose`.',
            'Moreover, `x` (`y`) can be provided with M or M+1 (N or N+1) elements.',
            'If M (N), then the coordinates correspond to the center of the',
            'heatmap cells and the cells have equal width.',
            'If M+1 (N+1), then the coordinates correspond to the edges of the',
            'heatmap cells.',

            'In the case where `z` is a 1D {array}, the x and y coordinates must be',
            'provided in `x` and `y` respectively to form data triplets.'
        ].join(' ')
    }
};
