import { locationmodeToLayer } from '../plots/geo/constants.js';
import { feature as topojsonFeature } from 'topojson-client';

var topojsonUtils = {};

topojsonUtils.getTopojsonName = function(geoLayout) {
    return [
        geoLayout.scope.replace(/ /g, '-'), '_',
        geoLayout.resolution.toString(), 'm'
    ].join('');
};

topojsonUtils.getTopojsonPath = function(topojsonURL, topojsonName) {
    topojsonURL += topojsonURL.endsWith('/') ? '' : '/';
    
    return `${topojsonURL}${topojsonName}.json`;
};

topojsonUtils.getTopojsonFeatures = function(trace, topojson) {
    var layer = locationmodeToLayer[trace.locationmode];
    var obj = topojson.objects[layer];

    return topojsonFeature(topojson, obj).features;
};

export default topojsonUtils;
