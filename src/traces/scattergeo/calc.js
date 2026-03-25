import isNumeric from 'fast-isnumeric';
import { BADNUM } from '../../constants/numerical.js';
import calcMarkerColorscale from '../scatter/colorscale_calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import { isArrayOrTypedArray } from '../../lib/index.js';
import { _ } from '../../lib/index.js';

function isNonBlankString(v) {
    return v && typeof v === 'string';
}

export default function calc(gd, trace) {
    var hasLocationData = isArrayOrTypedArray(trace.locations);
    var len = hasLocationData ? trace.locations.length : trace._length;
    var calcTrace = new Array(len);

    var isValidLoc;
    if(trace.geojson) {
        isValidLoc = function(v) { return isNonBlankString(v) || isNumeric(v); };
    } else {
        isValidLoc = isNonBlankString;
    }

    for(var i = 0; i < len; i++) {
        var calcPt = calcTrace[i] = {};

        if(hasLocationData) {
            var loc = trace.locations[i];
            calcPt.loc = isValidLoc(loc) ? loc : null;
        } else {
            var lon = trace.lon[i];
            var lat = trace.lat[i];

            if(isNumeric(lon) && isNumeric(lat)) calcPt.lonlat = [+lon, +lat];
            else calcPt.lonlat = [BADNUM, BADNUM];
        }
    }

    arraysToCalcdata(calcTrace, trace);
    calcMarkerColorscale(gd, trace);
    calcSelection(calcTrace, trace);

    if(len) {
        calcTrace[0].t = {
            labels: {
                lat: _(gd, 'lat:') + ' ',
                lon: _(gd, 'lon:') + ' '
            }
        };
    }

    return calcTrace;
}
