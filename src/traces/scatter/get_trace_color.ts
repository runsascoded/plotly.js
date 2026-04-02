import type { CalcDatum, FullTrace } from '../../../types/core';
import Color from '../../components/color/index.js';
import subtypes from './subtypes.js';

export default function getTraceColor(trace: FullTrace, di: CalcDatum): string {
    let lc, tc;

    // TODO: text modes

    if(trace.mode === 'lines') {
        lc = trace.line.color;
        return (lc && Color.opacity(lc)) ?
            lc : trace.fillcolor;
    } else if(trace.mode === 'none') {
        return trace.fill ? trace.fillcolor : '';
    } else {
        const mc = di.mcc || (trace.marker || {}).color;
        const mlc = di.mlcc || ((trace.marker || {}).line || {}).color;

        tc = (mc && Color.opacity(mc)) ? mc :
            (mlc && Color.opacity(mlc) &&
                (di.mlw || ((trace.marker || {}).line || {}).width)) ? mlc : '';

        if(tc) {
            // make sure the points aren't TOO transparent
            if(Color.opacity(tc) < 0.3) {
                return Color.addOpacity(tc, 0.3);
            } else return tc;
        } else {
            lc = (trace.line || {}).color;
            return (lc && Color.opacity(lc) &&
                subtypes.hasLines(trace) && trace.line.width) ?
                    lc : trace.fillcolor;
        }
    }
}
