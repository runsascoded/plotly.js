import _req0 from '../../plots/gl3d/index.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import _req3 from './calc.js';
import _req4 from './convert.js';

export default {
    moduleType: 'trace',
    name: 'cone',
    basePlotModule: _req0,
    categories: ['gl3d', 'showLegend'],

    attributes: _req1,
    supplyDefaults: _req2,
    colorbar: {
        min: 'cmin',
        max: 'cmax'
    },
    calc: _req3,
    plot: _req4,
    eventData: function(out, pt) {
        out.norm = pt.traceCoordinate[6];
        return out;
    },

    meta: {
        description: [
            'Use cone traces to visualize vector fields.',
            '',
            'Specify a vector field using 6 1D arrays,',
            '3 position arrays `x`, `y` and `z`',
            'and 3 vector component arrays `u`, `v`, `w`.',
            'The cones are drawn exactly at the positions given',
            'by `x`, `y` and `z`.'
        ].join(' ')
    }
};
