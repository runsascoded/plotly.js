import _req0 from './convert.js';
import _req1 from './attributes.js';
import _req2 from '../../constants/gl3d_markers.js';
import _req3 from './defaults.js';
import _req4 from './calc.js';
import _req5 from '../../plots/gl3d/index.js';
export default {
    plot: _req0,
    attributes: _req1,
    markerSymbols: _req2,
    supplyDefaults: _req3,
    colorbar: [
        {
            container: 'marker',
            min: 'cmin',
            max: 'cmax'
        }, {
            container: 'line',
            min: 'cmin',
            max: 'cmax'
        }
    ],
    calc: _req4,
    moduleType: 'trace',
    name: 'scatter3d',
    basePlotModule: _req5,
    categories: ['gl3d', 'symbols', 'showLegend', 'scatter-like'],
    meta: {
        hrName: 'scatter_3d',
        description: [
            'The data visualized as scatter point or lines in 3D dimension',
            'is set in `x`, `y`, `z`.',
            'Text (appearing either on the chart or on hover only) is via `text`.',
            'Bubble charts are achieved by setting `marker.size` and/or `marker.color`',
            'Projections are achieved via `projection`.',
            'Surface fills are achieved via `surfaceaxis`.'
        ].join(' ')
    }
};
