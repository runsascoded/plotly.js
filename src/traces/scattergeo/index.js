import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../scatter/marker_colorbar.js';
import _req3 from './format_labels.js';
import _req4 from './calc.js';
import { calcGeoJSON as _req5 } from './plot.js';
import { plot as _req6 } from './plot.js';
import _req7 from './style.js';
import { styleOnSelect as _req8 } from '../scatter/style.js';
import _req9 from './hover.js';
import _req10 from './event_data.js';
import _req11 from './select.js';
import _req12 from '../../plots/geo/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    formatLabels: _req3,
    calc: _req4,
    calcGeoJSON: _req5,
    plot: _req6,
    style: _req7,
    styleOnSelect: _req8,
    hoverPoints: _req9,
    eventData: _req10,
    selectPoints: _req11,

    moduleType: 'trace',
    name: 'scattergeo',
    basePlotModule: _req12,
    categories: ['geo', 'symbols', 'showLegend', 'scatter-like'],
    meta: {
        hrName: 'scatter_geo',
        description: [
            'The data visualized as scatter point or lines on a geographic map',
            'is provided either by longitude/latitude pairs in `lon` and `lat`',
            'respectively or by geographic location IDs or names in `locations`.'
        ].join(' ')
    }
};
