import type { FullLayout, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import _topojson_utils from '../../lib/topojson_utils.js';
const { getTopojsonFeatures } = _topojson_utils;
import geoJsonUtils from '../../lib/geojson_utils.js';
import geoUtils from '../../lib/geo_location_utils.js';
import _autorange from '../../plots/cartesian/autorange.js';
const { findExtremes } = _autorange;
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import _calc from '../scatter/calc.js';
const { calcMarkerSize } = _calc;
import subTypes from '../scatter/subtypes.js';
import style from './style.js';

function plot(gd: GraphDiv, geo, calcData) {
    const scatterLayer = geo.layers.frontplot.select('.scatterlayer');
    const gTraces = Lib.makeTraceGroups(scatterLayer, calcData, 'trace scattergeo');

    function removeBADNUM(d, node) {
        if(d.lonlat[0] === BADNUM) {
            select(node).remove();
        }
    }

    // TODO find a way to order the inner nodes on update
    gTraces.selectAll('*').remove();

    gTraces.each(function(calcTrace) {
        const s = select(this);
        const trace = calcTrace[0].trace;

        if(subTypes.hasLines(trace) || trace.fill !== 'none') {
            const lineCoords = geoJsonUtils.calcTraceToLineCoords(calcTrace);

            const lineData = (trace.fill !== 'none') ?
                geoJsonUtils.makePolygon(lineCoords) :
                geoJsonUtils.makeLine(lineCoords);

            s.selectAll('path.js-line')
                .data([{geojson: lineData, trace: trace}])
              .enter().append('path')
                .classed('js-line', true)
                .style('stroke-miterlimit', 2);
        }

        if(subTypes.hasMarkers(trace)) {
            s.selectAll('path.point')
                .data(Lib.identity)
             .enter().append('path')
                .classed('point', true)
                .each(function(calcPt) { removeBADNUM(calcPt, this); });
        }

        if(subTypes.hasText(trace)) {
            s.selectAll('g')
                .data(Lib.identity)
              .enter().append('g')
                .append('text')
                .each(function(calcPt) { removeBADNUM(calcPt, this); });
        }

        // call style here within topojson request callback
        style(gd, calcTrace);
    });
}

function calcGeoJSON(calcTrace, fullLayout: FullLayout) {
    const trace = calcTrace[0].trace;
    const geoLayout = fullLayout[trace.geo];
    const geo = geoLayout._subplot;
    const len = trace._length;
    let i, calcPt;

    if(Lib.isArrayOrTypedArray(trace.locations)) {
        const locationmode = trace.locationmode;
        const features = locationmode === 'geojson-id' ?
            geoUtils.extractTraceFeature(calcTrace) :
            getTopojsonFeatures(trace, geo.topojson);

        for(i = 0; i < len; i++) {
            calcPt = calcTrace[i];

            const feature = locationmode === 'geojson-id' ?
                calcPt.fOut :
                geoUtils.locationToFeature(locationmode, calcPt.loc, features);

            calcPt.lonlat = feature ? feature.properties.ct : [BADNUM, BADNUM];
        }
    }

    const opts: any = {padded: true};
    let lonArray;
    let latArray;

    if(geoLayout.fitbounds === 'geojson' && trace.locationmode === 'geojson-id') {
        const bboxGeojson = geoUtils.computeBbox(geoUtils.getTraceGeojson(trace));
        lonArray = [bboxGeojson[0], bboxGeojson[2]];
        latArray = [bboxGeojson[1], bboxGeojson[3]];
    } else {
        lonArray = new Array(len);
        latArray = new Array(len);
        for(i = 0; i < len; i++) {
            calcPt = calcTrace[i];
            lonArray[i] = calcPt.lonlat[0];
            latArray[i] = calcPt.lonlat[1];
        }

        opts.ppad = calcMarkerSize(trace, len);
    }

    trace._extremes.lon = findExtremes(geoLayout.lonaxis._ax, lonArray, opts);
    trace._extremes.lat = findExtremes(geoLayout.lataxis._ax, latArray, opts);
}

export default {
    calcGeoJSON: calcGeoJSON,
    plot: plot
};
