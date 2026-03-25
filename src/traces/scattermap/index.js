import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../scatter/marker_colorbar.js';
import _req3 from './format_labels.js';
import _req4 from '../scattergeo/calc.js';
import _req5 from './plot.js';
import { hoverPoints as _req6 } from './hover.js';
import _req7 from './event_data.js';
import _req8 from './select.js';
import _req9 from '../../plots/map/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    formatLabels: _req3,
    calc: _req4,
    plot: _req5,
    hoverPoints: _req6,
    eventData: _req7,
    selectPoints: _req8,

    styleOnSelect: function(_, cd) {
        if(cd) {
            var trace = cd[0].trace;
            trace._glTrace.update(cd);
        }
    },

    moduleType: 'trace',
    name: 'scattermap',
    basePlotModule: _req9,
    categories: ['map', 'gl', 'symbols', 'showLegend', 'scatter-like'],
    meta: {
        hrName: 'scatter_map',
        description: [
            'The data visualized as scatter point, lines or marker symbols',
            'on a MapLibre GL geographic map',
            'is provided by longitude/latitude pairs in `lon` and `lat`.'
        ].join(' ')
    }
};
