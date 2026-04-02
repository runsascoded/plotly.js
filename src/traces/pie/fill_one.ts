import type { FullTrace, GraphDiv } from '../../../types/core';
import { pointStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';

export default function fillOne(s: any, pt: any, trace: FullTrace, gd: GraphDiv): void {
    const pattern = trace.marker.pattern;
    if(pattern && pattern.shape) {
        pointStyle(s, trace, gd, pt);
    } else {
        Color.fill(s, pt.color);
    }
}
