import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../scatter/marker_colorbar.js';
import _req3 from './format_labels.js';
import _req4 from './calc.js';
import _req5 from './plot.js';
import _style from '../scatter/style.js';
const { style: _req6, styleOnSelect: _req7 } = _style;
import _req8 from './hover.js';
import _req9 from '../scatter/select.js';
import _req10 from './event_data.js';
import _req11 from '../../plots/ternary/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    formatLabels: _req3,
    calc: _req4,
    plot: _req5,
    style: _req6,
    styleOnSelect: _req7,
    hoverPoints: _req8,
    selectPoints: _req9,
    eventData: _req10,

    moduleType: 'trace',
    name: 'scatterternary',
    basePlotModule: _req11,
    categories: ['ternary', 'symbols', 'showLegend', 'scatter-like'],
    meta: {
        hrName: 'scatter_ternary',
        description: [
            'Provides similar functionality to the *scatter* type but on a ternary phase diagram.',
            'The data is provided by at least two arrays out of `a`, `b`, `c` triplets.'
        ].join(' ')
    }
};
