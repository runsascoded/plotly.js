import { locationmodeToLayer } from '../plots/geo/constants.js';
import { feature as topojsonFeature } from 'topojson-client';
const topojsonUtils = {};
topojsonUtils.getTopojsonName = function (geoLayout) {
    return [
        geoLayout.scope.replace(/ /g, '-'), '_',
        geoLayout.resolution.toString(), 'm'
    ].join('');
};
topojsonUtils.getTopojsonPath = function (topojsonURL, topojsonName) {
    topojsonURL += topojsonURL.endsWith('/') ? '' : '/';
    return `${topojsonURL}${topojsonName}.json`;
};
topojsonUtils.getTopojsonFeatures = function (trace, topojson) {
    const layer = locationmodeToLayer[trace.locationmode];
    const obj = topojson.objects[layer];
    return topojsonFeature(topojson, obj).features;
};
export default topojsonUtils;
