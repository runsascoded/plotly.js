import { locationmodeToLayer } from '../plots/geo/constants.js';
import { feature as topojsonFeature } from 'topojson-client';

const topojsonUtils: Record<string, (...args: any[]) => any> = {};

topojsonUtils.getTopojsonName = function(geoLayout: any): string {
    return [
        geoLayout.scope.replace(/ /g, '-'), '_',
        geoLayout.resolution.toString(), 'm'
    ].join('');
};

topojsonUtils.getTopojsonPath = function(topojsonURL: string, topojsonName: string): string {
    topojsonURL += topojsonURL.endsWith('/') ? '' : '/';

    return `${topojsonURL}${topojsonName}.json`;
};

topojsonUtils.getTopojsonFeatures = function(trace: any, topojson: any): any[] {
    const layer = (locationmodeToLayer as any)[trace.locationmode];
    const obj = topojson.objects[layer];

    return topojsonFeature(topojson, obj).features;
};

export default topojsonUtils;
