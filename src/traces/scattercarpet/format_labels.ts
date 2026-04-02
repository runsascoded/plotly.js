import type { FullTrace } from '../../../types/core';
export default function formatLabels(cdi: any, trace: FullTrace) {
    const labels: any = {};

    const carpet = trace._carpet;
    const ij = carpet.ab2ij([cdi.a, cdi.b]);
    const i0 = Math.floor(ij[0]);
    const ti = ij[0] - i0;
    const j0 = Math.floor(ij[1]);
    const tj = ij[1] - j0;
    const xy = carpet.evalxy([], i0, j0, ti, tj);

    labels.yLabel = xy[1].toFixed(3);

    return labels;
}
