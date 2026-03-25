import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../heatmap/colorbar.js';
import _req3 from './calc.js';
import { calcGeoJSON as _req4 } from './plot.js';
import { plot as _req5 } from './plot.js';
import { style as _req6 } from './style.js';
import { styleOnSelect as _req7 } from './style.js';
import _req8 from './hover.js';
import _req9 from './event_data.js';
import _req10 from './select.js';
import _req11 from '../../plots/geo/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    calc: _req3,
    calcGeoJSON: _req4,
    plot: _req5,
    style: _req6,
    styleOnSelect: _req7,
    hoverPoints: _req8,
    eventData: _req9,
    selectPoints: _req10,

    moduleType: 'trace',
    name: 'choropleth',
    basePlotModule: _req11,
    categories: ['geo', 'noOpacity', 'showLegend'],
    meta: {
        description: [
            'The data that describes the choropleth value-to-color mapping',
            'is set in `z`.',
            'The geographic locations corresponding to each value in `z`',
            'are set in `locations`.'
        ].join(' ')
    }
};
