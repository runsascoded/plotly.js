import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import styleOne from '../pie/style_one.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;

export default function style(gd: GraphDiv) {
    var s = gd._fullLayout._funnelarealayer.selectAll('.trace');
    resizeText(gd, s, 'funnelarea');

    s.each(function(cd) {
        var cd0 = cd[0];
        var trace = cd0.trace;
        var traceSelection = select(this);

        traceSelection.style({opacity: trace.opacity});

        traceSelection.selectAll('path.surface').each(function(pt) {
            select(this).call(styleOne, pt, trace, gd);
        });
    });
}
