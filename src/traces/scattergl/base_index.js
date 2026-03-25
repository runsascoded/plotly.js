import hover from './hover.js';
import _req0 from '../../plots/cartesian/index.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import _req3 from '../scatter/cross_trace_defaults.js';
import _req4 from '../scatter/marker_colorbar.js';
import _req5 from './format_labels.js';
import _req6 from './calc.js';
import _req7 from './select.js';

export default {
    moduleType: 'trace',
    name: 'scattergl',
    basePlotModule: _req0,
    categories: ['gl', 'regl', 'cartesian', 'symbols', 'errorBarsOK', 'showLegend', 'scatter-like'],

    attributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    colorbar: _req4,
    formatLabels: _req5,
    calc: _req6,
    hoverPoints: hover.hoverPoints,
    selectPoints: _req7,

    meta: {
        hrName: 'scatter_gl',
        description: [
            'The data visualized as scatter point or lines is set in `x` and `y`',
            'using the WebGL plotting engine.',
            'Bubble charts are achieved by setting `marker.size` and/or `marker.color`',
            'to a numerical arrays.'
        ].join(' ')
    }
};
