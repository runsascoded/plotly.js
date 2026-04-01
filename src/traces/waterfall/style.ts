import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { dashLine, lineGroupStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import barStyle from '../bar/style.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
var styleTextPoints = barStyle.styleTextPoints;

function style(gd: GraphDiv,  cd,  sel) {
    var s = sel ? sel : select(gd).selectAll('g[class^="waterfalllayer"]').selectAll('g.trace');
    resizeText(gd, s, 'waterfall');

    s.style('opacity', function(d) { return d[0].trace.opacity; });

    s.each(function(d) {
        var gTrace = select(this);
        var trace = d[0].trace;

        gTrace.selectAll('.point > path').each(function(di) {
            if(!di.isBlank) {
                var cont = trace[di.dir].marker;

                select(this)
                    .call(Color.fill, cont.color)
                    .call(Color.stroke, cont.line.color)
                    .call(dashLine, cont.line.dash, cont.line.width)
                    .style('opacity', trace.selectedpoints && !di.selected ? DESELECTDIM : 1);
            }
        });

        styleTextPoints(gTrace, trace, gd);

        gTrace.selectAll('.lines').each(function() {
            var cont = trace.connector.line;

            lineGroupStyle(
                select(this).selectAll('path'),
                cont.width,
                cont.color,
                cont.dash
            );
        });
    });
}

export default {
    style: style
};
