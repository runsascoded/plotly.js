import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcColorscale from '../scatter/colorscale_calc.js';
export default function calc(gd, trace) {
    const cd = [{ x: false, y: false, trace: trace, t: {} }];
    arraysToCalcdata(cd, trace);
    calcColorscale(gd, trace);
    return cd;
}
