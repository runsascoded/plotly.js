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
    const fullLayout = gd._fullLayout;
    const subplotId = trace.subplot;
    const realAxis = fullLayout[subplotId].realaxis;
    const imaginaryAxis = fullLayout[subplotId].imaginaryaxis;
    const realArray = realAxis.makeCalcdata(trace, 'real');
    const imagArray = imaginaryAxis.makeCalcdata(trace, 'imag');
    const len = trace._length;
    const cd = new Array(len);

    for(let i = 0; i < len; i++) {
        const real = realArray[i];
        const imag = imagArray[i];
        const cdi: any = cd[i] = {};

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
