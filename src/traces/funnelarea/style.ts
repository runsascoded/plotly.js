import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import styleOne from '../pie/style_one.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;

export default function style(gd: GraphDiv) {
    const s = gd._fullLayout._funnelarealayer.selectAll('.trace');
    resizeText(gd, s, 'funnelarea');

    s.each(function(this: any, cd) {
        const cd0 = cd[0];
        const trace = cd0.trace;
        const traceSelection = select(this);

        traceSelection.style({opacity: trace.opacity});

        traceSelection.selectAll('path.surface').each(function(this: any, pt) {
            select(this).call(styleOne, pt, trace, gd);
        });
    });
}
