import type { FullLayout, FullTrace } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';

export default function formatLabels(cdi, trace: FullTrace, fullLayout: FullLayout) {
    var labels: any = {};

    var subplot = fullLayout[trace.subplot]._subplot;
    var ax = subplot.mockAxis;

    var lonlat = cdi.lonlat;
    labels.lonLabel = Axes.tickText(ax, ax.c2l(lonlat[0]), true).text;
    labels.latLabel = Axes.tickText(ax, ax.c2l(lonlat[1]), true).text;

    return labels;
}
