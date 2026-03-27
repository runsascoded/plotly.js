import { select } from 'd3-selection';
import Drawing from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';
import scatterStyle from '../scatter/style.js';
var stylePoints = scatterStyle.stylePoints;
var styleText = scatterStyle.styleText;

export default function style(gd, calcTrace) {
    if(calcTrace) styleTrace(gd, calcTrace);
}

function styleTrace(gd, calcTrace) {
    var trace = calcTrace[0].trace;
    var s = calcTrace[0].node3;

    s.style('opacity', calcTrace[0].trace.opacity);

    stylePoints(s, trace, gd);
    styleText(s, trace, gd);

    // this part is incompatible with Drawing.lineGroupStyle
    s.selectAll('path.js-line')
        .style('fill', 'none')
        .each(function(d) {
            var path = select(this);
            var trace = d.trace;
            var line = trace.line || {};

            path.call(Color.stroke, line.color)
                .call(Drawing.dashLine, line.dash || '', line.width || 0);

            if(trace.fill !== 'none') {
                path.call(Color.fill, trace.fillcolor);
            }
        });
}
