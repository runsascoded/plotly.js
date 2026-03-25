import { BADNUM } from '../constants/numerical.js';

export var calcTraceToLineCoords = function(calcTrace) {
    var trace = calcTrace[0].trace;
    var connectgaps = trace.connectgaps;

    var coords = [];
    var lineString = [];

    for(var i = 0; i < calcTrace.length; i++) {
        var calcPt = calcTrace[i];
        var lonlat = calcPt.lonlat;

        if(lonlat[0] !== BADNUM) {
            lineString.push(lonlat);
        } else if(!connectgaps && lineString.length > 0) {
            coords.push(lineString);
            lineString = [];
        }
    }

    if(lineString.length > 0) {
        coords.push(lineString);
    }

    return coords;
};

export var makeLine = function(coords) {
    if(coords.length === 1) {
        return {
            type: 'LineString',
            coordinates: coords[0]
        };
    } else {
        return {
            type: 'MultiLineString',
            coordinates: coords
        };
    }
};

export var makePolygon = function(coords) {
    if(coords.length === 1) {
        return {
            type: 'Polygon',
            coordinates: coords
        };
    } else {
        var _coords = new Array(coords.length);

        for(var i = 0; i < coords.length; i++) {
            _coords[i] = [coords[i]];
        }

        return {
            type: 'MultiPolygon',
            coordinates: _coords
        };
    }
};

export var makeBlank = function() {
    return {
        type: 'Point',
        coordinates: []
    };
};

export default { calcTraceToLineCoords, makeLine, makePolygon, makeBlank };
