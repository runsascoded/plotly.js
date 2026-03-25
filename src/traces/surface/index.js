import _req0 from './attributes.js';
import _defaults from './defaults.js';
const { supplyDefaults: _req1 } = _defaults;
import _req2 from './calc.js';
import _req3 from './convert.js';
import _req4 from '../../plots/gl3d/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: {
        min: 'cmin',
        max: 'cmax'
    },
    calc: _req2,
    plot: _req3,

    moduleType: 'trace',
    name: 'surface',
    basePlotModule: _req4,
    categories: ['gl3d', '2dMap', 'showLegend'],
    meta: {
        description: [
            'The data the describes the coordinates of the surface is set in `z`.',
            'Data in `z` should be a {2D array}.',

            'Coordinates in `x` and `y` can either be 1D {arrays}',
            'or {2D arrays} (e.g. to graph parametric surfaces).',

            'If not provided in `x` and `y`, the x and y coordinates are assumed',
            'to be linear starting at 0 with a unit step.',

            'The color scale corresponds to the `z` values by default.',
            'For custom color scales, use `surfacecolor` which should be a {2D array},',
            'where its bounds can be controlled using `cmin` and `cmax`.'
        ].join(' ')
    }
};
