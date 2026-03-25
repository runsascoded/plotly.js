import _req0 from '../../plots/cartesian/index.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import { calc as _req3 } from './calc.js';
import _req4 from './plot.js';
import _req5 from './style.js';
import { hoverPoints as _req6 } from './hover.js';
import _req7 from './select.js';

export default {
    moduleType: 'trace',
    name: 'ohlc',
    basePlotModule: _req0,
    categories: ['cartesian', 'svg', 'showLegend'],
    meta: {
        description: [
            'The ohlc (short for Open-High-Low-Close) is a style of financial chart describing',
            'open, high, low and close for a given `x` coordinate (most likely time).',

            'The tip of the lines represent the `low` and `high` values and',
            'the horizontal segments represent the `open` and `close` values.',

            'Sample points where the close value is higher (lower) then the open',
            'value are called increasing (decreasing).',

            'By default, increasing items are drawn in green whereas',
            'decreasing are drawn in red.'
        ].join(' ')
    },

    attributes: _req1,
    supplyDefaults: _req2,
    calc: _req3,
    plot: _req4,
    style: _req5,
    hoverPoints: _req6,
    selectPoints: _req7
};
