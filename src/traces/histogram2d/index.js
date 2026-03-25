import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../histogram/cross_trace_defaults.js';
import _req3 from '../heatmap/calc.js';
import _req4 from '../heatmap/plot.js';
import _req5 from '../heatmap/colorbar.js';
import _req6 from '../heatmap/style.js';
import _req7 from './hover.js';
import _req8 from '../histogram/event_data.js';
import _req9 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    crossTraceDefaults: _req2,
    calc: _req3,
    plot: _req4,
    layerName: 'heatmaplayer',
    colorbar: _req5,
    style: _req6,
    hoverPoints: _req7,
    eventData: _req8,

    moduleType: 'trace',
    name: 'histogram2d',
    basePlotModule: _req9,
    categories: ['cartesian', 'svg', '2dMap', 'histogram', 'showLegend'],
    meta: {
        hrName: 'histogram_2d',
        description: [
            'The sample data from which statistics are computed is set in `x`',
            'and `y` (where `x` and `y` represent marginal distributions,',
            'binning is set in `xbins` and `ybins` in this case)',
            'or `z` (where `z` represent the 2D distribution and binning set,',
            'binning is set by `x` and `y` in this case).',
            'The resulting distribution is visualized as a heatmap.'
        ].join(' ')
    }
};
