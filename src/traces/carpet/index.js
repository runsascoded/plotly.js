import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './plot.js';
import _req3 from './calc.js';
import _req4 from '../../plots/cartesian/index.js';
export default {
    attributes: _req0,
    supplyDefaults: _req1,
    plot: _req2,
    calc: _req3,
    animatable: true,
    isContainer: true, // so carpet traces get `calc` before other traces
    moduleType: 'trace',
    name: 'carpet',
    basePlotModule: _req4,
    categories: ['cartesian', 'svg', 'carpet', 'carpetAxis', 'notLegendIsolatable', 'noMultiCategory', 'noHover', 'noSortingByValue'],
    meta: {
        description: [
            'The data describing carpet axis layout is set in `y` and (optionally)',
            'also `x`. If only `y` is present, `x` the plot is interpreted as a',
            'cheater plot and is filled in using the `y` values.',
            '`x` and `y` may either be 2D arrays matching with each dimension matching',
            'that of `a` and `b`, or they may be 1D arrays with total length equal to',
            'that of `a` and `b`.'
        ].join(' ')
    }
};
