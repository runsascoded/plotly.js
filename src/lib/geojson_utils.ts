import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;

export var calcTraceToLineCoords = function(calcTrace: any[]): number[][][] {
    var trace = calcTrace[0].trace;
    var connectgaps = trace.connectgaps;

    var coords: number[][][] = [];
    var lineString: number[][] = [];

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

interface GeoJSONGeometry {
    type: string;
    coordinates: any;
}

export var makeLine = function(coords: number[][][]): GeoJSONGeometry {
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

export var makePolygon = function(coords: number[][][]): GeoJSONGeometry {
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

export var makeBlank = function(): GeoJSONGeometry {
    return {
        type: 'Point',
        coordinates: []
    };
};

export default { calcTraceToLineCoords, makeLine, makePolygon, makeBlank };
