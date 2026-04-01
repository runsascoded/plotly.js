import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
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
    name: 'mesh3d',
    basePlotModule: _req4,
    categories: ['gl3d', 'showLegend'],
    meta: {
        description: [
            'Draws sets of triangles with coordinates given by',
            'three 1-dimensional arrays in `x`, `y`, `z` and',
            '(1) a sets of `i`, `j`, `k` indices',
            '(2) Delaunay triangulation or',
            '(3) the Alpha-shape algorithm or',
            '(4) the Convex-hull algorithm'
        ].join(' ')
    }
};
