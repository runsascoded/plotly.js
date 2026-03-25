import d3 from '@plotly/d3';
import styleOne from './style_one.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;

export default function style(gd) {
    var s = gd._fullLayout._pielayer.selectAll('.trace');
    resizeText(gd, s, 'pie');

    s.each(function(cd) {
        var cd0 = cd[0];
        var trace = cd0.trace;
        var traceSelection = d3.select(this);

        traceSelection.style({opacity: trace.opacity});

        traceSelection.selectAll('path.surface').each(function(pt) {
            d3.select(this).call(styleOne, pt, trace, gd);
        });
    });
}
