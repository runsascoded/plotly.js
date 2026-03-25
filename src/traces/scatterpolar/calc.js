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
    var fullLayout = gd._fullLayout;
    var subplotId = trace.subplot;
    var radialAxis = fullLayout[subplotId].radialaxis;
    var angularAxis = fullLayout[subplotId].angularaxis;
    var rArray = radialAxis.makeCalcdata(trace, 'r');
    var thetaArray = angularAxis.makeCalcdata(trace, 'theta');
    var len = trace._length;
    var cd = new Array(len);

    for(var i = 0; i < len; i++) {
        var r = rArray[i];
        var theta = thetaArray[i];
        var cdi = cd[i] = {};

        if(isNumeric(r) && isNumeric(theta)) {
            cdi.r = r;
            cdi.theta = theta;
        } else {
            cdi.r = BADNUM;
        }
    }

    var ppad = calcMarkerSize(trace, len);
    trace._extremes.x = Axes.findExtremes(radialAxis, rArray, {ppad: ppad});

    calcColorscale(gd, trace);
    arraysToCalcdata(cd, trace);
    calcSelection(cd, trace);

    return cd;
}
