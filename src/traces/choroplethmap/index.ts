import _req0 from './attributes.js';
import _req1 from './defaults.js';
import _req2 from '../heatmap/colorbar.js';
import _req3 from '../choropleth/calc.js';
import _req4 from './plot.js';
import _req5 from '../choropleth/hover.js';
import _req6 from '../choropleth/event_data.js';
import _req7 from '../choropleth/select.js';
import _req8 from '../../plots/map/index.js';

export default {
    attributes: _req0,
    supplyDefaults: _req1,
    colorbar: _req2,
    calc: _req3,
    plot: _req4,
    hoverPoints: _req5,
    eventData: _req6,
    selectPoints: _req7,

    styleOnSelect: function(_, cd) {
        if(cd) {
            const trace = cd[0].trace;
            trace._glTrace.updateOnSelect(cd);
        }
    },

    getBelow: function(trace, subplot) {
        const mapLayers = subplot.getMapLayers();

        // find layer just above top-most "water" layer
        // that is not a plotly layer
        for(let i = mapLayers.length - 2; i >= 0; i--) {
            let layerId = mapLayers[i].id;

            if(typeof layerId === 'string' &&
                layerId.indexOf('water') === 0
             ) {
                for(let j = i + 1; j < mapLayers.length; j++) {
                    layerId = mapLayers[j].id;

                    if(typeof layerId === 'string' &&
                        layerId.indexOf('plotly-') === -1
                    ) {
                        return layerId;
                    }
                }
            }
        }
    },

    moduleType: 'trace',
    name: 'choroplethmap',
    basePlotModule: _req8,
    categories: ['map', 'gl', 'noOpacity', 'showLegend'],
    meta: {
        hr_name: 'choropleth_map',
        description: [
            'GeoJSON features to be filled are set in `geojson`',
            'The data that describes the choropleth value-to-color mapping',
            'is set in `locations` and `z`.'
        ].join(' ')
    }
};
