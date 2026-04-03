import isNumeric from 'fast-isnumeric';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import Axes from '../../plots/cartesian/axes.js';
import calcColorscale from '../scatter/colorscale_calc.js';
import arraysToCalcdata from '../scatter/arrays_to_calcdata.js';
import calcSelection from '../scatter/calc_selection.js';
import _calc from '../scatter/calc.js';
const { calcMarkerSize } = _calc;
export default function calc(gd, trace) {
    const fullLayout = gd._fullLayout;
    const subplotId = trace.subplot;
    const radialAxis = fullLayout[subplotId].radialaxis;
    const angularAxis = fullLayout[subplotId].angularaxis;
    const rArray = radialAxis.makeCalcdata(trace, 'r');
    const thetaArray = angularAxis.makeCalcdata(trace, 'theta');
    const len = trace._length;
    const cd = new Array(len);
    for (let i = 0; i < len; i++) {
        const r = rArray[i];
        const theta = thetaArray[i];
        const cdi = cd[i] = {};
        if (isNumeric(r) && isNumeric(theta)) {
            cdi.r = r;
            cdi.theta = theta;
        }
        else {
            cdi.r = BADNUM;
        }
    }
    const ppad = calcMarkerSize(trace, len);
    trace._extremes.x = Axes.findExtremes(radialAxis, rArray, { ppad: ppad });
    calcColorscale(gd, trace);
    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);
    return cd;
}
