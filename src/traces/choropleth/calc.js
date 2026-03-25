import isNumeric from 'fast-isnumeric';
import { BADNUM } from '../../constants/numerical.js';
import colorscaleCalc from '../../components/colorscale/calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';

function isNonBlankString(v) {
    return v && typeof v === 'string';
}

export default function calc(gd, trace) {
    var len = trace._length;
    var calcTrace = new Array(len);

    var isValidLoc;

    if(trace.geojson) {
        isValidLoc = function(v) { return isNonBlankString(v) || isNumeric(v); };
    } else {
        isValidLoc = isNonBlankString;
    }

    for(var i = 0; i < len; i++) {
        var calcPt = calcTrace[i] = {};
        var loc = trace.locations[i];
        var z = trace.z[i];

        if(isValidLoc(loc) && isNumeric(z)) {
            calcPt.loc = loc;
            calcPt.z = z;
        } else {
            calcPt.loc = null;
            calcPt.z = BADNUM;
        }

        calcPt.index = i;
    }

    arraysToCalcdata(calcTrace, trace);
    colorscaleCalc(gd, trace, {
        vals: trace.z,
        containerStr: '',
        cLetter: 'z'
    });
    calcSelection(calcTrace, trace);

    return calcTrace;
}
