import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../isosurface/calc.js';
import _req3 from './convert.js';
import _req4 from '../../plots/gl3d/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    colorbar: {
        min: 'cmin',
        max: 'cmax'
    },
    plot: _req3,

    moduleType: 'trace',
    name: 'volume',
    basePlotModule: _req4,
    categories: ['gl3d', 'showLegend'],
    meta: {
        description: [
            'Draws volume trace between iso-min and iso-max values with coordinates given by',
            'four 1-dimensional arrays containing the `value`, `x`, `y` and `z` of every vertex',
            'of a uniform or non-uniform 3-D grid. Horizontal or vertical slices, caps as well as',
            'spaceframe between iso-min and iso-max values could also be drawn using this trace.'
        ].join(' ')
    }
};
