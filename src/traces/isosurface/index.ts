import _req0 from './attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req1 } = _defaults;
import _req2 from './calc.js';
import _convert from './convert.js';
const { createIsosurfaceTrace: _req3 } = _convert;
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
    name: 'isosurface',
    basePlotModule: _req4,
    categories: ['gl3d', 'showLegend'],
    meta: {
        description: [
            'Draws isosurfaces between iso-min and iso-max values with coordinates given by',
            'four 1-dimensional arrays containing the `value`, `x`, `y` and `z` of every vertex',
            'of a uniform or non-uniform 3-D grid. Horizontal or vertical slices, caps as well as',
            'spaceframe between iso-min and iso-max values could also be drawn using this trace.'
        ].join(' ')
    }
};
