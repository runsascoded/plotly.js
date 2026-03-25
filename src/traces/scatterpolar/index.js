import _req0 from '../../plots/polar/index.js';
import _req1 from './attributes.js';
import { supplyDefaults as _req2 } from './defaults.js';
import _req3 from '../scatter/marker_colorbar.js';
import _req4 from './format_labels.js';
import _req5 from './calc.js';
import _req6 from './plot.js';
import { style as _req7 } from '../scatter/style.js';
import { styleOnSelect as _req8 } from '../scatter/style.js';
import { hoverPoints as _req9 } from './hover.js';
import _req10 from '../scatter/select.js';

export default {
    moduleType: 'trace',
    name: 'scatterpolar',
    basePlotModule: _req0,
    categories: ['polar', 'symbols', 'showLegend', 'scatter-like'],

    attributes: _req1,
    supplyDefaults: _req2,
    colorbar: _req3,
    formatLabels: _req4,
    calc: _req5,
    plot: _req6,
    style: _req7,
    styleOnSelect: _req8,
    hoverPoints: _req9,
    selectPoints: _req10,

    meta: {
        hrName: 'scatter_polar',
        description: [
            'The scatterpolar trace type encompasses line charts, scatter charts, text charts, and bubble charts',
            'in polar coordinates.',
            'The data visualized as scatter point or lines is set in',
            '`r` (radial) and `theta` (angular) coordinates',
            'Text (appearing either on the chart or on hover only) is via `text`.',
            'Bubble charts are achieved by setting `marker.size` and/or `marker.color`',
            'to numerical arrays.'
        ].join(' ')
    }
};
