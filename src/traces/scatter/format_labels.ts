import type { CalcDatum, FullLayout, FullTrace } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';

export default function formatLabels(cdi: CalcDatum, trace: FullTrace, fullLayout: FullLayout): any {
    const labels: any = {};

    const mockGd = {_fullLayout: fullLayout};
    const xa = Axes.getFromTrace(mockGd, trace, 'x');
    const ya = Axes.getFromTrace(mockGd, trace, 'y');

    let x = cdi.orig_x;
    if(x === undefined) x = cdi.x;

    let y = cdi.orig_y;
    if(y === undefined) y = cdi.y;

    labels.xLabel = Axes.tickText(xa, xa.c2l(x), true).text;
    labels.yLabel = Axes.tickText(ya, ya.c2l(y), true).text;

    return labels;
}
