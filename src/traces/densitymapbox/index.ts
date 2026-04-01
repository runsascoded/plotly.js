import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../heatmap/colorbar.js';
import _req3 from '../scattermapbox/format_labels.js';
import _req4 from './calc.js';
import _req5 from './plot.js';
import _req6 from './hover.js';
import _req7 from './event_data.js';
import _req8 from '../../plots/mapbox/index.js';

var deprecationWarning = [
    '*densitymapbox* trace is deprecated!',
    'Please consider switching to the *densitymap* trace type and `map` subplots.',
    'Learn more at: https://plotly.com/python/maplibre-migration/',
    'as well as https://plotly.com/javascript/maplibre-migration/'
].join(' ');

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
        var mapLayers = subplot.getMapLayers();

        // find first layer with `type: 'symbol'`,
        // that is not a plotly layer
        for(var i = 0; i < mapLayers.length; i++) {
            var layer = mapLayers[i];
            var layerId = layer.id;
            if(layer.type === 'symbol' &&
                typeof layerId === 'string' && layerId.indexOf('plotly-') === -1
            ) {
                return layerId;
            }
        }
    },

    moduleType: 'trace',
    name: 'densitymapbox',
    basePlotModule: _req8,
    categories: ['mapbox', 'gl', 'showLegend'],
    meta: {
        hr_name: 'density_mapbox',
        description: [
            deprecationWarning,
            'Draws a bivariate kernel density estimation with a Gaussian kernel',
            'from `lon` and `lat` coordinates and optional `z` values using a colorscale.'
        ].join(' ')
    }
};
