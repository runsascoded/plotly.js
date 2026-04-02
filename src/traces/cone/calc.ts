import colorscaleCalc from '../../components/colorscale/calc.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    const u = trace.u;
    const v = trace.v;
    const w = trace.w;
    const len = Math.min(
        trace.x!.length, trace.y!.length, trace.z!.length,
        u.length, v.length, w.length
    );
    let normMax = -Infinity;
    let normMin = Infinity;

    for(let i = 0; i < len; i++) {
        const uu = u[i];
        const vv = v[i];
        const ww = w[i];
        const norm = Math.sqrt(uu * uu + vv * vv + ww * ww);

        normMax = Math.max(normMax, norm);
        normMin = Math.min(normMin, norm);
    }

    trace._len = len;
    trace._normMax = normMax;

    colorscaleCalc(gd, trace, {
        vals: [normMin, normMax],
        containerStr: '',
        cLetter: 'c'
    });
}
