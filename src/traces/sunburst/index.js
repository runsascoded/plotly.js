import _req0 from './base_plot.js';
import _req1 from './attributes.js';
import _req2 from './layout_attributes.js';
import _req3 from './defaults.js';
import _req4 from './layout_defaults.js';
import { calc as _req5 } from './calc.js';
import { crossTraceCalc as _req6 } from './calc.js';
import { plot as _req7 } from './plot.js';
import _style from './style.js';
const { style: _req8 } = _style;
import _req9 from '../scatter/marker_colorbar.js';

export default {
    moduleType: 'trace',
    name: 'sunburst',
    basePlotModule: _req0,
    categories: [],
    animatable: true,

    attributes: _req1,
    layoutAttributes: _req2,
    supplyDefaults: _req3,
    supplyLayoutDefaults: _req4,

    calc: _req5,
    crossTraceCalc: _req6,

    plot: _req7,
    style: _req8,

    colorbar: _req9,

    meta: {
        description: [
            'Visualize hierarchal data spanning outward radially from root to leaves.',
            'The sunburst sectors are determined by the entries in *labels* or *ids*',
            'and in *parents*.'
        ].join(' ')
    }
};
