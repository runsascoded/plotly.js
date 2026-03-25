import _req0 from './attributes.js';
import _req1 from '../bar/layout_attributes.js';
import _req2 from './defaults.js';
import _req3 from './cross_trace_defaults.js';
import _req4 from '../bar/layout_defaults.js';
import { calc as _req5 } from './calc.js';
import { crossTraceCalc as _req6 } from '../bar/cross_trace_calc.js';
import { plot as _req7 } from '../bar/plot.js';
import { style as _req8 } from '../bar/style.js';
import { styleOnSelect as _req9 } from '../bar/style.js';
import _req10 from '../scatter/marker_colorbar.js';
import _req11 from './hover.js';
import _req12 from '../bar/select.js';
import _req13 from './event_data.js';
import _req14 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    layoutAttributes: _req1,
    supplyDefaults: _req2,
    crossTraceDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    plot: _req7,
    layerName: 'barlayer',
    style: _req8,
    styleOnSelect: _req9,
    colorbar: _req10,
    hoverPoints: _req11,
    selectPoints: _req12,
    eventData: _req13,

    moduleType: 'trace',
    name: 'histogram',
    basePlotModule: _req14,
    categories: ['bar-like', 'cartesian', 'svg', 'bar', 'histogram', 'oriented', 'errorBarsOK', 'showLegend'],
    meta: {
        description: [
            'The sample data from which statistics are computed is set in `x`',
            'for vertically spanning histograms and',
            'in `y` for horizontally spanning histograms.',
            'Binning options are set `xbins` and `ybins` respectively',
            'if no aggregation data is provided.'
        ].join(' ')
    }
};
