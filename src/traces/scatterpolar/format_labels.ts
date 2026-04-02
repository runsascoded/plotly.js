import type { FullLayout, FullTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';

export default function formatLabels(cdi, trace: FullTrace, fullLayout: FullLayout) {
    const labels: any = {};

    let subplot = fullLayout[trace.subplot]._subplot;
    let radialAxis;
    let angularAxis;

    // for scatterpolargl texttemplate, _subplot is NOT defined, this takes part during the convert step
    // TODO we should consider moving the texttemplate formatting logic to the plot step
    if(!subplot) {
        subplot = fullLayout[trace.subplot];
        radialAxis = subplot.radialaxis;
        angularAxis = subplot.angularaxis;
    } else {
        radialAxis = subplot.radialAxis;
        angularAxis = subplot.angularAxis;
    }

    const rVal = radialAxis.c2l(cdi.r);
    labels.rLabel = Axes.tickText(radialAxis, rVal, true).text;

    // N.B here the ° sign is part of the formatted value for thetaunit:'degrees'
    const thetaVal = angularAxis.thetaunit === 'degrees' ? Lib.rad2deg(cdi.theta) : cdi.theta;
    labels.thetaLabel = Axes.tickText(angularAxis, thetaVal, true).text;

    return labels;
}
