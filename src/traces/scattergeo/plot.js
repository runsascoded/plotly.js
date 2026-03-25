import d3 from '@plotly/d3';
import Lib from '../../lib/index.js';
import { getTopojsonFeatures } from '../../lib/topojson_utils.js';
import geoJsonUtils from '../../lib/geojson_utils.js';
import geoUtils from '../../lib/geo_location_utils.js';
import { findExtremes } from '../../plots/cartesian/autorange.js';
import { BADNUM } from '../../constants/numerical.js';
import { calcMarkerSize } from '../scatter/calc.js';
import subTypes from '../scatter/subtypes.js';
import style from './style.js';

function plot(gd, geo, calcData) {
    var scatterLayer = geo.layers.frontplot.select('.scatterlayer');
    var gTraces = Lib.makeTraceGroups(scatterLayer, calcData, 'trace scattergeo');

    function removeBADNUM(d, node) {
        if(d.lonlat[0] === BADNUM) {
            d3.select(node).remove();
        }
    }

    // TODO find a way to order the inner nodes on update
    gTraces.selectAll('*').remove();

    gTraces.each(function(calcTrace) {
        var s = d3.select(this);
        var trace = calcTrace[0].trace;

        if(subTypes.hasLines(trace) || trace.fill !== 'none') {
            var lineCoords = geoJsonUtils.calcTraceToLineCoords(calcTrace);

            var lineData = (trace.fill !== 'none') ?
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

function calcGeoJSON(calcTrace, fullLayout) {
    var trace = calcTrace[0].trace;
    var geoLayout = fullLayout[trace.geo];
    var geo = geoLayout._subplot;
    var len = trace._length;
    var i, calcPt;

    if(Lib.isArrayOrTypedArray(trace.locations)) {
        var locationmode = trace.locationmode;
        var features = locationmode === 'geojson-id' ?
            geoUtils.extractTraceFeature(calcTrace) :
            getTopojsonFeatures(trace, geo.topojson);

        for(i = 0; i < len; i++) {
            calcPt = calcTrace[i];

            var feature = locationmode === 'geojson-id' ?
                calcPt.fOut :
                geoUtils.locationToFeature(locationmode, calcPt.loc, features);

            calcPt.lonlat = feature ? feature.properties.ct : [BADNUM, BADNUM];
        }
    }

    var opts = {padded: true};
    var lonArray;
    var latArray;

    if(geoLayout.fitbounds === 'geojson' && trace.locationmode === 'geojson-id') {
        var bboxGeojson = geoUtils.computeBbox(geoUtils.getTraceGeojson(trace));
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
