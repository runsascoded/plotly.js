import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Color from '../../components/color/index.js';
import _style from '../scatter/style.js';
const { stylePoints } = _style;

export default function style(gd: GraphDiv): any {
    var s = select(gd).selectAll('g.trace.violins');

    s.style('opacity', function(d) { return d[0].trace.opacity; });

    s.each(function(d) {
        var trace = d[0].trace;
        var sel = select(this);
        var box = trace.box || {};
        var boxLine = box.line || {};
        var meanline = trace.meanline || {};
        var meanLineWidth = meanline.width;

        sel.selectAll('path.violin')
            .style('stroke-width', trace.line.width + 'px')
            .call(Color.stroke, trace.line.color)
            .call(Color.fill, trace.fillcolor);

        sel.selectAll('path.box')
            .style('stroke-width', boxLine.width + 'px')
            .call(Color.stroke, boxLine.color)
            .call(Color.fill, box.fillcolor);

        var meanLineStyle = {
            'stroke-width': meanLineWidth + 'px',
            'stroke-dasharray': (2 * meanLineWidth) + 'px,' + meanLineWidth + 'px'
        };

        sel.selectAll('path.mean')
            .style(meanLineStyle)
            .call(Color.stroke, meanline.color);

        sel.selectAll('path.meanline')
            .style(meanLineStyle)
            .call(Color.stroke, meanline.color);

        stylePoints(sel, trace, gd);
    });
}
