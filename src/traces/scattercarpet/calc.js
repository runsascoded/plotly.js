import isNumeric from 'fast-isnumeric';
import calcColorscale from '../scatter/colorscale_calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import _calc from '../scatter/calc.js';
const { calcMarkerSize } = _calc;
import lookupCarpet from '../carpet/lookup_carpetid.js';
export default function calc(gd, trace) {
    const carpet = trace._carpetTrace = lookupCarpet(gd, trace);
    if (!carpet || !carpet.visible || carpet.visible === 'legendonly')
        return;
    let i;
    // Transfer this over from carpet before plotting since this is a necessary
    // condition in order for cartesian to actually plot this trace:
    trace.xaxis = carpet.xaxis;
    trace.yaxis = carpet.yaxis;
    // make the calcdata array
    const serieslen = trace._length;
    const cd = new Array(serieslen);
    let a, b;
    let needsCull = false;
    for (i = 0; i < serieslen; i++) {
        a = trace.a[i];
        b = trace.b[i];
        if (isNumeric(a) && isNumeric(b)) {
            const xy = carpet.ab2xy(+a, +b, true);
            const visible = carpet.isVisible(+a, +b);
            if (!visible)
                needsCull = true;
            cd[i] = { x: xy[0], y: xy[1], a: a, b: b, vis: visible };
        }
        else
            cd[i] = { x: false, y: false };
    }
    trace._needsCull = needsCull;
    cd[0].carpet = carpet;
    cd[0].trace = trace;
    calcMarkerSize(trace, serieslen);
    calcColorscale(gd, trace);
    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);
    return cd;
}
