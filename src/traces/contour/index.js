import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from './calc.js';
import { plot as _req3 } from './plot.js';
import _req4 from './style.js';
import _req5 from './colorbar.js';
import _req6 from './hover.js';
import _req7 from '../../plots/cartesian/index.js';
export default {
    attributes: _req0,
    supplyDefaults: _req1,
    calc: _req2,
    plot: _req3,
    style: _req4,
    colorbar: _req5,
    hoverPoints: _req6,
    moduleType: 'trace',
    name: 'contour',
    basePlotModule: _req7,
    categories: ['cartesian', 'svg', '2dMap', 'contour', 'showLegend'],
    meta: {
        description: [
            'The data from which contour lines are computed is set in `z`.',
            'Data in `z` must be a {2D array} of numbers.',
            'Say that `z` has N rows and M columns, then by default,',
            'these N rows correspond to N y coordinates',
            '(set in `y` or auto-generated) and the M columns',
            'correspond to M x coordinates (set in `x` or auto-generated).',
            'By setting `transpose` to *true*, the above behavior is flipped.'
        ].join(' ')
    }
};
