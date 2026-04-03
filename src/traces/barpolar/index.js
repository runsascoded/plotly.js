import _req0 from '../../plots/polar/index.js';
import _req1 from './attributes.js';
import _req2 from './layout_attributes.js';
import _req3 from './defaults.js';
import _req4 from './layout_defaults.js';
import _calc from './calc.js';
const { calc: _req5, crossTraceCalc: _req6 } = _calc;
import _req7 from './plot.js';
import _req8 from '../scatter/marker_colorbar.js';
import _req9 from '../scatterpolar/format_labels.js';
import _style from '../bar/style.js';
const { style: _req10, styleOnSelect: _req11 } = _style;
import _req12 from './hover.js';
import _req13 from '../bar/select.js';
export default {
    moduleType: 'trace',
    name: 'barpolar',
    basePlotModule: _req0,
    categories: ['polar', 'bar', 'showLegend'],
    attributes: _req1,
    layoutAttributes: _req2,
    supplyDefaults: _req3,
    supplyLayoutDefaults: _req4,
    calc: _req5,
    crossTraceCalc: _req6,
    plot: _req7,
    colorbar: _req8,
    formatLabels: _req9,
    style: _req10,
    styleOnSelect: _req11,
    hoverPoints: _req12,
    selectPoints: _req13,
    meta: {
        hrName: 'bar_polar',
        description: [
            'The data visualized by the radial span of the bars is set in `r`'
            // 'if `orientation` is set to *radial* (the default)',
            // 'and the labels are set in `theta`.',
            // 'By setting `orientation` to *angular*, the roles are interchanged.'
        ].join(' ')
    }
};
