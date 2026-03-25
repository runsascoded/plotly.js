import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../contour/colorbar.js';
import _req3 from './calc.js';
import _req4 from './plot.js';
import _req5 from '../contour/style.js';
import _req6 from '../../plots/cartesian/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    calc: _req3,
    plot: _req4,
    style: _req5,

    moduleType: 'trace',
    name: 'contourcarpet',
    basePlotModule: _req6,
    categories: ['cartesian', 'svg', 'carpet', 'contour', 'symbols', 'showLegend', 'hasLines', 'carpetDependent', 'noHover', 'noSortingByValue'],
    meta: {
        hrName: 'contour_carpet',
        description: [
            'Plots contours on either the first carpet axis or the',
            'carpet axis with a matching `carpet` attribute. Data `z`',
            'is interpreted as matching that of the corresponding carpet',
            'axis.'
        ].join(' ')
    }
};
