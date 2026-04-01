import isNumeric from 'fast-isnumeric';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import colorscaleCalc from '../../components/colorscale/calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

function isNonBlankString(v) {
    return v && typeof v === 'string';
}

export default function calc(gd: GraphDiv, trace: FullTrace) {
    var len = trace._length;
    var calcTrace = new Array(len);

    var isValidLoc;

    if(trace.geojson) {
        isValidLoc = function(v) { return isNonBlankString(v) || isNumeric(v); };
    } else {
        isValidLoc = isNonBlankString;
    }

    for(var i = 0; i < len; i++) {
        var calcPt: any = calcTrace[i] = {};
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
