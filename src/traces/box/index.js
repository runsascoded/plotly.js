import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import { supplyDefaults as _req2 } from './defaults.js';
import { crossTraceDefaults as _req3 } from './defaults.js';
import { supplyLayoutDefaults as _req4 } from './layout_defaults.js';
import _req5 from './calc.js';
import { crossTraceCalc as _req6 } from './cross_trace_calc.js';
import { plot as _req7 } from './plot.js';
import { style as _req8 } from './style.js';
import { styleOnSelect as _req9 } from './style.js';
import { hoverPoints as _req10 } from './hover.js';
import _req11 from './event_data.js';
import _req12 from './select.js';
import _req13 from '../../plots/cartesian/index.js';

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
    eventData: _req11,
    selectPoints: _req12,

    moduleType: 'trace',
    name: 'box',
    basePlotModule: _req13,
    categories: ['cartesian', 'svg', 'symbols', 'oriented', 'box-violin', 'showLegend', 'boxLayout', 'zoomScale'],
    meta: {
        description: [
            'Each box spans from quartile 1 (Q1) to quartile 3 (Q3).',
            'The second quartile (Q2, i.e. the median) is marked by a line inside the box.',
            'The fences grow outward from the boxes\' edges,',
            'by default they span +/- 1.5 times the interquartile range (IQR: Q3-Q1),',
            'The sample mean and standard deviation as well as notches and',
            'the sample, outlier and suspected outliers points can be optionally',
            'added to the box plot.',

            'The values and positions corresponding to each boxes can be input',
            'using two signatures.',

            'The first signature expects users to supply the sample values in the `y`',
            'data array for vertical boxes (`x` for horizontal boxes).',
            'By supplying an `x` (`y`) array, one box per distinct `x` (`y`) value is drawn',
            'If no `x` (`y`) {array} is provided, a single box is drawn.',
            'In this case, the box is positioned with the trace `name` or with `x0` (`y0`) if provided.',

            'The second signature expects users to supply the boxes corresponding Q1, median and Q3',
            'statistics in the `q1`, `median` and `q3` data arrays respectively.',
            'Other box features relying on statistics namely `lowerfence`, `upperfence`, `notchspan`',
            'can be set directly by the users.',
            'To have plotly compute them or to show sample points besides the boxes,',
            'users can set the `y` data array for vertical boxes (`x` for horizontal boxes)',
            'to a 2D array with the outer length corresponding',
            'to the number of boxes in the traces and the inner length corresponding the sample size.'
        ].join(' ')
    }
};
