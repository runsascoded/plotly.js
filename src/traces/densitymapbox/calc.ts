import isNumeric from 'fast-isnumeric';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray, _ } = _index;
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import colorscaleCalc from '../../components/colorscale/calc.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    var len = trace._length;
    var calcTrace = new Array(len);
    var z = trace.z;
    var hasZ = isArrayOrTypedArray(z) && z.length;

    for(var i = 0; i < len; i++) {
        var cdi: any = calcTrace[i] = {};

        var lon = trace.lon[i];
        var lat = trace.lat[i];

        cdi.lonlat = isNumeric(lon) && isNumeric(lat) ?
            [+lon, +lat] :
            [BADNUM, BADNUM];

        if(hasZ) {
            var zi = z[i];
            cdi.z = isNumeric(zi) ? zi : BADNUM;
        }
    }

    colorscaleCalc(gd, trace, {
        vals: hasZ ? z : [0, 1],
        containerStr: '',
        cLetter: 'z'
    });

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
