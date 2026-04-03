import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _req2 from './defaults.js';
import _defaults from '../box/defaults.js';
const { crossTraceDefaults: _req3 } = _defaults;
import _req4 from './layout_defaults.js';
import _req5 from './calc.js';
import _req6 from './cross_trace_calc.js';
import _req7 from './plot.js';
import _req8 from './style.js';
import _style from '../scatter/style.js';
const { styleOnSelect: _req9 } = _style;
import _req10 from './hover.js';
import _req11 from '../box/select.js';
import _req12 from '../../plots/cartesian/index.js';
export default {
    attributes: _req0,
    layoutAttributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    plot: _req7,
    style: _req8,
    styleOnSelect: _req9,
    hoverPoints: _req10,
    selectPoints: _req11,
    moduleType: 'trace',
    name: 'violin',
    basePlotModule: _req12,
    categories: ['cartesian', 'svg', 'symbols', 'oriented', 'box-violin', 'showLegend', 'violinLayout', 'zoomScale'],
    meta: {
        description: [
            'In vertical (horizontal) violin plots,',
            'statistics are computed using `y` (`x`) values.',
            'By supplying an `x` (`y`) array, one violin per distinct x (y) value',
            'is drawn',
            'If no `x` (`y`) {array} is provided, a single violin is drawn.',
            'That violin position is then positioned with',
            'with `name` or with `x0` (`y0`) if provided.'
        ].join(' ')
    }
};
