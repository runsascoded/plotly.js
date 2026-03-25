import Axes from '../../plots/cartesian/axes.js';

export default function formatLabels(cdi, trace, fullLayout) {
    var labels = {};

    var subplot = fullLayout[trace.subplot]._subplot;
    labels.aLabel = Axes.tickText(subplot.aaxis, cdi.a, true).text;
    labels.bLabel = Axes.tickText(subplot.baxis, cdi.b, true).text;
    labels.cLabel = Axes.tickText(subplot.caxis, cdi.c, true).text;

    return labels;
}
