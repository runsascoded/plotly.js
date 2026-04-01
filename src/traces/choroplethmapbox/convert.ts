import isNumeric from 'fast-isnumeric';
import Lib from '../../lib/index.js';
import Colorscale from '../../components/colorscale/index.js';
import { makeSelectedPointStyleFns } from '../../components/drawing/index.js';
import { makeBlank } from '../../lib/geojson_utils.js';
import geoUtils from '../../lib/geo_location_utils.js';

/* N.B.
 *
 * We fetch the GeoJSON files "ourselves" (during
 * mapbox.prototype.fetchMapData) where they are stored in a global object
 * named `PlotlyGeoAssets` (same as for topojson files in `geo` subplots).
 *
 * Mapbox does allow using URLs as geojson sources, but does NOT allow filtering
 * features by feature `id` that are not numbers (more info in:
 * https://github.com/mapbox/mapbox-gl-js/issues/8088).
 */

function convert(calcTrace) {
    var trace = calcTrace[0].trace;
    var isVisible = trace.visible === true && trace._length !== 0;

    var fill = {
        layout: {visibility: 'none'},
        paint: {}
    };

    var line = {
        layout: {visibility: 'none'},
        paint: {}
    };

    var opts = trace._opts = {
        fill: fill,
        line: line,
        geojson: makeBlank()
    };

    if(!isVisible) return opts;

    var features = geoUtils.extractTraceFeature(calcTrace);

    if(!features) return opts;

    var sclFunc = Colorscale.makeColorScaleFuncFromTrace(trace);
    var marker = trace.marker;
    var markerLine = marker.line || {};

    var opacityFn;
    if(Lib.isArrayOrTypedArray(marker.opacity)) {
        opacityFn = function(d) {
            var mo = d.mo;
            return isNumeric(mo) ? +Lib.constrain(mo, 0, 1) : 0;
        };
    }

    var lineColorFn;
    if(Lib.isArrayOrTypedArray(markerLine.color)) {
        lineColorFn = function(d) { return d.mlc; };
    }

    var lineWidthFn;
    if(Lib.isArrayOrTypedArray(markerLine.width)) {
        lineWidthFn = function(d) { return d.mlw; };
    }

    for(var i = 0; i < calcTrace.length; i++) {
        var cdi = calcTrace[i];
        var fOut = cdi.fOut;

        if(fOut) {
            var props = fOut.properties;
            props.fc = sclFunc(cdi.z);
            if(opacityFn) props.mo = opacityFn(cdi);
            if(lineColorFn) props.mlc = lineColorFn(cdi);
            if(lineWidthFn) props.mlw = lineWidthFn(cdi);
            cdi.ct = props.ct;
            cdi._polygons = geoUtils.feature2polygons(fOut);
        }
    }

    var opacitySetting = opacityFn ?
        {type: 'identity', property: 'mo'} :
        marker.opacity;

    Lib.extendFlat(fill.paint, {
        'fill-color': {type: 'identity', property: 'fc'},
        'fill-opacity': opacitySetting
    });

    Lib.extendFlat(line.paint, {
        'line-color': lineColorFn ?
            {type: 'identity', property: 'mlc'} :
            markerLine.color,
        'line-width': lineWidthFn ?
            {type: 'identity', property: 'mlw'} :
            markerLine.width,
        'line-opacity': opacitySetting
    });

    fill.layout.visibility = 'visible';
    line.layout.visibility = 'visible';

    opts.geojson = {type: 'FeatureCollection', features: features} as any;

    convertOnSelect(calcTrace);

    return opts;
}

function convertOnSelect(calcTrace) {
    var trace = calcTrace[0].trace;
    var opts = trace._opts;
    var opacitySetting;

    if(trace.selectedpoints) {
        var fns = makeSelectedPointStyleFns(trace);

        for(var i = 0; i < calcTrace.length; i++) {
            var cdi = calcTrace[i];
            if(cdi.fOut) {
                cdi.fOut.properties.mo2 = fns.selectedOpacityFn(cdi);
            }
        }

        opacitySetting = {type: 'identity', property: 'mo2'};
    } else {
        opacitySetting = Lib.isArrayOrTypedArray(trace.marker.opacity) ?
            {type: 'identity', property: 'mo'} :
            trace.marker.opacity;
    }

    Lib.extendFlat(opts.fill.paint, {'fill-opacity': opacitySetting});
    Lib.extendFlat(opts.line.paint, {'line-opacity': opacitySetting});

    return opts;
}

export default {
    convert: convert,
    convertOnSelect: convertOnSelect
};
