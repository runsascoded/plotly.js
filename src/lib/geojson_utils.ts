import _numerical from '../constants/numerical.js';
const { BADNUM } = _numerical;

export function calcTraceToLineCoords(calcTrace: any[]): number[][][] {
    const trace = calcTrace[0].trace;
    const connectgaps = trace.connectgaps;

    const coords: number[][][] = [];
    let lineString: number[][] = [];

    for(let i = 0; i < calcTrace.length; i++) {
        const calcPt = calcTrace[i];
        const lonlat = calcPt.lonlat;

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
}

interface GeoJSONGeometry {
    type: string;
    coordinates: any;
}

export function makeLine(coords: number[][][]): GeoJSONGeometry {
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
}

export function makePolygon(coords: number[][][]): GeoJSONGeometry {
    if(coords.length === 1) {
        return {
            type: 'Polygon',
            coordinates: coords
        };
    } else {
        const _coords = new Array(coords.length);

        for(let i = 0; i < coords.length; i++) {
            _coords[i] = [coords[i]];
        }

        return {
            type: 'MultiPolygon',
            coordinates: _coords
        };
    }
}

export function makeBlank(): GeoJSONGeometry {
    return {
        type: 'Point',
        coordinates: []
    };
}

export default { calcTraceToLineCoords, makeLine, makePolygon, makeBlank };
