import Axes from '../../plots/cartesian/axes.js';

export default function formatLabels(cdi, trace, fullLayout) {
    var labels = {};

    var subplot = fullLayout[trace.subplot]._subplot;

    labels.realLabel = Axes.tickText(subplot.radialAxis, cdi.real, true).text;
    labels.imagLabel = Axes.tickText(subplot.angularAxis, cdi.imag, true).text;

    return labels;
}
