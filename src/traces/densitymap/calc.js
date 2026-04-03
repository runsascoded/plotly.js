import isNumeric from 'fast-isnumeric';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray, _ } = _index;
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import colorscaleCalc from '../../components/colorscale/calc.js';
export default function calc(gd, trace) {
    const len = trace._length;
    const calcTrace = new Array(len);
    const z = trace.z;
    const hasZ = isArrayOrTypedArray(z) && z.length;
    for (let i = 0; i < len; i++) {
        const cdi = calcTrace[i] = {};
        const lon = trace.lon[i];
        const lat = trace.lat[i];
        cdi.lonlat = isNumeric(lon) && isNumeric(lat) ?
            [+lon, +lat] :
            [BADNUM, BADNUM];
        if (hasZ) {
            const zi = z[i];
            cdi.z = isNumeric(zi) ? zi : BADNUM;
        }
    }
    colorscaleCalc(gd, trace, {
        vals: hasZ ? z : [0, 1],
        containerStr: '',
        cLetter: 'z'
    });
    if (len) {
        calcTrace[0].t = {
            labels: {
                lat: _(gd, 'lat:') + ' ',
                lon: _(gd, 'lon:') + ' '
            }
        };
    }
    return calcTrace;
}
