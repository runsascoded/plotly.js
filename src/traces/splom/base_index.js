import Registry from '../../registry.js';
import Grid from '../../components/grid/index.js';
import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../scatter/marker_colorbar.js';
import _req3 from './calc.js';
import _req4 from './plot.js';
import { hoverPoints as _req5 } from './hover.js';
import _req6 from './select.js';
import _req7 from './edit_style.js';

export default {
    moduleType: 'trace',
    name: 'splom',

    categories: ['gl', 'regl', 'cartesian', 'symbols', 'showLegend', 'scatter-like'],

    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,

    calc: _req3,
    plot: _req4,
    hoverPoints: _req5,
    selectPoints: _req6,
    editStyle: _req7,

    meta: {
        description: [
            'Splom traces generate scatter plot matrix visualizations.',
            'Each splom `dimensions` items correspond to a generated axis.',
            'Values for each of those dimensions are set in `dimensions[i].values`.',
            'Splom traces support all `scattergl` marker style attributes.',
            'Specify `layout.grid` attributes and/or layout x-axis and y-axis attributes',
            'for more control over the axis positioning and style. '
        ].join(' ')
    }
};

// splom traces use the 'grid' component to generate their axes,
// register it here
Registry.register(Grid);
