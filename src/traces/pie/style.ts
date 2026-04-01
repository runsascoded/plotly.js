import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import styleOne from './style_one.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;

export default function style(gd: GraphDiv): void {
    var s = gd._fullLayout._pielayer.selectAll('.trace');
    resizeText(gd, s, 'pie');

    s.each(function(this: any, cd: any) {
        var cd0 = cd[0];
        var trace = cd0.trace;
        var traceSelection = select(this);

        traceSelection.style({opacity: trace.opacity});

        traceSelection.selectAll('path.surface').each(function(this: any, pt: any) {
            select(this).call(styleOne, pt, trace, gd);
        });
    });
}
