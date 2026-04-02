import type { FullTrace, GraphDiv } from '../../../types/core';
import calcColorscale from '../scatter/colorscale_calc.js';
import _calc from '../scatter/calc.js';
const { calcMarkerSize } = _calc;
import convert from '../scattergl/convert.js';
import Axes from '../../plots/cartesian/axes.js';
import _constants from '../scattergl/constants.js';
const { TOO_MANY_POINTS } = _constants;

export default function calc(gd: GraphDiv, trace: FullTrace) {
    const fullLayout = gd._fullLayout;
    const subplotId = trace.subplot;
    const radialAxis = fullLayout[subplotId].radialaxis;
    const angularAxis = fullLayout[subplotId].angularaxis;
    let rArray = trace._r = radialAxis.makeCalcdata(trace, 'r');
    let thetaArray = trace._theta = angularAxis.makeCalcdata(trace, 'theta');
    const len = trace._length;
    const stash: any = {};

    if(len < rArray.length) rArray = rArray.slice(0, len);
    if(len < thetaArray.length) thetaArray = thetaArray.slice(0, len);

    stash.r = rArray;
    stash.theta = thetaArray;

    calcColorscale(gd, trace);

    // only compute 'style' options in calc, as position options
    // depend on the radial range and must be set in plot
    const opts = stash.opts = convert.style(gd, trace);

    // For graphs with very large number of points and array marker.size,
    // use average marker size instead to speed things up.
    let ppad;
    if(len < TOO_MANY_POINTS) {
        ppad = calcMarkerSize(trace, len);
    } else if(opts.marker) {
        ppad = 2 * (opts.marker.sizeAvg || Math.max(opts.marker.size, 3));
    }
    trace._extremes.x = Axes.findExtremes(radialAxis, rArray, {ppad: ppad});

    return [{x: false, y: false, t: stash, trace: trace}];
}
