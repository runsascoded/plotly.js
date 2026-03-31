import _req0 from './base_plot.js';
import _req1 from './attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req2 } = _defaults;
import _calc from './calc.js';
const { calc: _req3 } = _calc;
import _req4 from './plot.js';

export default {
    moduleType: 'trace',
    name: 'indicator',
    basePlotModule: _req0,
    categories: ['svg', 'noOpacity', 'noHover'],
    animatable: true,

    attributes: _req1,
    supplyDefaults: _req2,

    calc: _req3,

    plot: _req4,

    meta: {
        description: [
            'An indicator is used to visualize a single `value` along with some',
            'contextual information such as `steps` or a `threshold`, using a',
            'combination of three visual elements: a number, a delta, and/or a gauge.',
            'Deltas are taken with respect to a `reference`.',
            'Gauges can be either angular or bullet (aka linear) gauges.'
        ].join(' ')
    }
};
