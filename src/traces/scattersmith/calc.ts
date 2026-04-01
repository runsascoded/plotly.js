import type { FullTrace, GraphDiv } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import calcColorscale from '../scatter/colorscale_calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import _calc from '../scatter/calc.js';
const { calcMarkerSize } = _calc;

export default function calc(gd: GraphDiv, trace: FullTrace) {
    var fullLayout = gd._fullLayout;
    var subplotId = trace.subplot;
    var realAxis = fullLayout[subplotId].realaxis;
    var imaginaryAxis = fullLayout[subplotId].imaginaryaxis;
    var realArray = realAxis.makeCalcdata(trace, 'real');
    var imagArray = imaginaryAxis.makeCalcdata(trace, 'imag');
    var len = trace._length;
    var cd = new Array(len);

    for(var i = 0; i < len; i++) {
        var real = realArray[i];
        var imag = imagArray[i];
        var cdi: any = cd[i] = {};

        if(isNumeric(real) && isNumeric(imag)) {
            cdi.real = real;
            cdi.imag = imag;
        } else {
            cdi.real = BADNUM;
        }
    }

    calcMarkerSize(trace, len);
    calcColorscale(gd, trace);
    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);

    return cd;
}
