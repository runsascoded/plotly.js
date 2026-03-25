import _req0 from '../../plots/cartesian/index.js';
import _req1 from './attributes.js';
import _req2 from '../box/layout_attributes.js';
import { supplyLayoutDefaults as _req3 } from '../box/layout_defaults.js';
import { crossTraceCalc as _req4 } from '../box/cross_trace_calc.js';
import _req5 from './defaults.js';
import _req6 from './calc.js';
import { plot as _req7 } from '../box/plot.js';
import { style as _req8 } from '../box/style.js';
import { hoverPoints as _req9 } from '../ohlc/hover.js';
import _req10 from '../ohlc/select.js';

export default {
    moduleType: 'trace',
    name: 'candlestick',
    basePlotModule: _req0,
    categories: ['cartesian', 'svg', 'showLegend', 'candlestick', 'boxLayout'],
    meta: {
        description: [
            'The candlestick is a style of financial chart describing',
            'open, high, low and close for a given `x` coordinate (most likely time).',

            'The boxes represent the spread between the `open` and `close` values and',
            'the lines represent the spread between the `low` and `high` values',

            'Sample points where the close value is higher (lower) then the open',
            'value are called increasing (decreasing).',

            'By default, increasing candles are drawn in green whereas',
            'decreasing are drawn in red.'
        ].join(' ')
    },

    attributes: _req1,
    layoutAttributes: _req2,
    supplyLayoutDefaults: _req3,
    crossTraceCalc: _req4,
    supplyDefaults: _req5,
    calc: _req6,
    plot: _req7,
    layerName: 'boxlayer',
    style: _req8,
    hoverPoints: _req9,
    selectPoints: _req10
};
