import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../heatmap/colorbar.js';
import _req3 from '../scattermap/format_labels.js';
import _req4 from './calc.js';
import _req5 from './plot.js';
import _req6 from './hover.js';
import _req7 from './event_data.js';
import _req8 from '../../plots/map/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    formatLabels: _req3,
    calc: _req4,
    plot: _req5,
    hoverPoints: _req6,
    eventData: _req7,

    getBelow: function(trace, subplot) {
        const mapLayers = subplot.getMapLayers();

        // find first layer with `type: 'symbol'`,
        // that is not a plotly layer
        for(let i = 0; i < mapLayers.length; i++) {
            const layer = mapLayers[i];
            const layerId = layer.id;
            if(layer.type === 'symbol' &&
                typeof layerId === 'string' && layerId.indexOf('plotly-') === -1
            ) {
                return layerId;
            }
        }
    },

    moduleType: 'trace',
    name: 'densitymap',
    basePlotModule: _req8,
    categories: ['map', 'gl', 'showLegend'],
    meta: {
        hr_name: 'density_map',
        description: [
            'Draws a bivariate kernel density estimation with a Gaussian kernel',
            'from `lon` and `lat` coordinates and optional `z` values using a colorscale.'
        ].join(' ')
    }
};
