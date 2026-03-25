import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../histogram/cross_trace_defaults.js';
import _req3 from '../contour/calc.js';
import { plot as _req4 } from '../contour/plot.js';
import _req5 from '../contour/style.js';
import _req6 from '../contour/colorbar.js';
import _req7 from '../contour/hover.js';
import _req8 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    crossTraceDefaults: _req2,
    calc: _req3,
    plot: _req4,
    layerName: 'contourlayer',
    style: _req5,
    colorbar: _req6,
    hoverPoints: _req7,

    moduleType: 'trace',
    name: 'histogram2dcontour',
    basePlotModule: _req8,
    categories: ['cartesian', 'svg', '2dMap', 'contour', 'histogram', 'showLegend'],
    meta: {
        hrName: 'histogram_2d_contour',
        description: [
            'The sample data from which statistics are computed is set in `x`',
            'and `y` (where `x` and `y` represent marginal distributions,',
            'binning is set in `xbins` and `ybins` in this case)',
            'or `z` (where `z` represent the 2D distribution and binning set,',
            'binning is set by `x` and `y` in this case).',
            'The resulting distribution is visualized as a contour plot.'
        ].join(' ')
    }
};
