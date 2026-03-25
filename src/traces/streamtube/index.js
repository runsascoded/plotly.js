import _req0 from '../../plots/gl3d/index.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import { calc as _req3 } from './calc.js';
import _req4 from './convert.js';

export default {
    moduleType: 'trace',
    name: 'streamtube',
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
        out.tubex = out.x;
        out.tubey = out.y;
        out.tubez = out.z;

        out.tubeu = pt.traceCoordinate[3];
        out.tubev = pt.traceCoordinate[4];
        out.tubew = pt.traceCoordinate[5];

        out.norm = pt.traceCoordinate[6];
        out.divergence = pt.traceCoordinate[7];

        // Does not correspond to input x/y/z, so delete them
        delete out.x;
        delete out.y;
        delete out.z;

        return out;
    },

    meta: {
        description: [
            'Use a streamtube trace to visualize flow in a vector field.',
            '',
            'Specify a vector field using 6 1D arrays of equal length,',
            '3 position arrays `x`, `y` and `z`',
            'and 3 vector component arrays `u`, `v`, and `w`.',
            '',
            'By default, the tubes\' starting positions will be cut from the vector field\'s',
            'x-z plane at its minimum y value.',
            'To specify your own starting position, use attributes `starts.x`, `starts.y`',
            'and `starts.z`.',
            'The color is encoded by the norm of (u, v, w), and the local radius',
            'by the divergence of (u, v, w).'
        ].join(' ')
    }
};
