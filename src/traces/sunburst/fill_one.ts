import type { FullTrace, GraphDiv } from '../../../types/core';
import { pointStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';

export default function fillOne(s: any, pt: any, trace: FullTrace, gd: GraphDiv, fadedColor?: string) {
    const cdi = pt.data.data;
    const ptNumber = cdi.i;

    const color = fadedColor || cdi.color;

    if(ptNumber >= 0) {
        pt.i = cdi.i;

        const marker = trace.marker;
        if(marker.pattern) {
            if(!marker.colors || !marker.pattern.shape) {
                marker.color = color;
                pt.color = color;
            }
        } else {
            marker.color = color;
            pt.color = color;
        }

        pointStyle(s, trace, gd, pt);
    } else {
        Color.fill(s, color);
    }
}
