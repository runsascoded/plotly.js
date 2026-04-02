import type { FullTrace, GraphDiv } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import calcMarkerColorscale from '../scatter/colorscale_calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray, _ } = _index;

function isNonBlankString(v: any) {
    return v && typeof v === 'string';
}

export default function calc(gd: GraphDiv, trace: FullTrace) {
    const hasLocationData = isArrayOrTypedArray(trace.locations);
    const len = hasLocationData ? trace.locations.length : trace._length;
    const calcTrace = new Array(len);

    let isValidLoc;
    if(trace.geojson) {
        isValidLoc = function(v: any) { return isNonBlankString(v) || isNumeric(v); };
    } else {
        isValidLoc = isNonBlankString;
    }

    for(let i = 0; i < len; i++) {
        const calcPt: any = calcTrace[i] = {};

        if(hasLocationData) {
            const loc = trace.locations[i];
            calcPt.loc = isValidLoc(loc) ? loc : null;
        } else {
            const lon = trace.lon[i];
            const lat = trace.lat[i];

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
