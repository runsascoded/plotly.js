import _req0 from '../../plots/polar/index.js';
import _req1 from './attributes.js';
import _req2 from './defaults.js';
import _req3 from '../scatter/marker_colorbar.js';
import _req4 from './format_labels.js';
import _req5 from './calc.js';
import _hover from './hover.js';
const { hoverPoints: _req6 } = _hover;
import _req7 from '../scattergl/select.js';

export default {
    moduleType: 'trace',
    name: 'scatterpolargl',
    basePlotModule: _req0,
    categories: ['gl', 'regl', 'polar', 'symbols', 'showLegend', 'scatter-like'],

    attributes: _req1,
    supplyDefaults: _req2,
    colorbar: _req3,
    formatLabels: _req4,

    calc: _req5,
    hoverPoints: _req6,
    selectPoints: _req7,

    meta: {
        hrName: 'scatter_polar_gl',
        description: [
            'The scatterpolargl trace type encompasses line charts, scatter charts, and bubble charts',
            'in polar coordinates using the WebGL plotting engine.',
            'The data visualized as scatter point or lines is set in',
            '`r` (radial) and `theta` (angular) coordinates',
            'Bubble charts are achieved by setting `marker.size` and/or `marker.color`',
            'to numerical arrays.'
        ].join(' ')
    }
};
