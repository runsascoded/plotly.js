import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import geoUtils from '../../lib/geo_location_utils.js';
import _topojson_utils from '../../lib/topojson_utils.js';
const { getTopojsonFeatures } = _topojson_utils;
import _autorange from '../../plots/cartesian/autorange.js';
const { findExtremes } = _autorange;
import _style from './style.js';
const { style } = _style;
import type { GraphDiv } from '../../../types/core';

function plot(gd: GraphDiv, geo, calcData) {
    const choroplethLayer = geo.layers.backplot.select('.choroplethlayer');

    Lib.makeTraceGroups(choroplethLayer, calcData, 'trace choropleth').each(function(this: any, calcTrace) {
        const sel = select(this);

        const paths = sel.selectAll('path.choroplethlocation')
            .data(Lib.identity);

        paths.enter().append('path')
            .classed('choroplethlocation', true);

        paths.exit().remove();

        // call style here within topojson request callback
        style(gd, calcTrace);
    });
}

function calcGeoJSON(calcTrace, fullLayout) {
    const trace = calcTrace[0].trace;
    const geoLayout = fullLayout[trace.geo];
    const geo = geoLayout._subplot;
    const locationmode = trace.locationmode;
    const len = trace._length;

    const features = locationmode === 'geojson-id' ?
        geoUtils.extractTraceFeature(calcTrace) :
        getTopojsonFeatures(trace, geo.topojson);

    let lonArray = [];
    let latArray = [];

    for(let i = 0; i < len; i++) {
        const calcPt = calcTrace[i];
        const feature = locationmode === 'geojson-id' ?
            calcPt.fOut :
            geoUtils.locationToFeature(locationmode, calcPt.loc, features);

        if(feature) {
            calcPt.geojson = feature;
            calcPt.ct = feature.properties.ct;
            calcPt._polygons = geoUtils.feature2polygons(feature);

            const bboxFeature = geoUtils.computeBbox(feature);
            lonArray.push(bboxFeature[0], bboxFeature[2]);
            latArray.push(bboxFeature[1], bboxFeature[3]);
        } else {
            calcPt.geojson = null;
        }
    }

    if(geoLayout.fitbounds === 'geojson' && locationmode === 'geojson-id') {
        const bboxGeojson = geoUtils.computeBbox(geoUtils.getTraceGeojson(trace));
        lonArray = [bboxGeojson[0], bboxGeojson[2]];
        latArray = [bboxGeojson[1], bboxGeojson[3]];
    }

    const opts = {padded: true};
    trace._extremes.lon = findExtremes(geoLayout.lonaxis._ax, lonArray, opts);
    trace._extremes.lat = findExtremes(geoLayout.lataxis._ax, latArray, opts);
}

export default {
    calcGeoJSON: calcGeoJSON,
    plot: plot
};
