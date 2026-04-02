import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { dashLine, lineGroupStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';
import _interactions from '../../constants/interactions.js';
const { DESELECTDIM } = _interactions;
import barStyle from '../bar/style.js';
import _uniform_text from '../bar/uniform_text.js';
const { resizeText } = _uniform_text;
const styleTextPoints = barStyle.styleTextPoints;

function style(gd: GraphDiv,  cd: any,  sel: any) {
    const s = sel ? sel : select(gd).selectAll('g[class^="waterfalllayer"]').selectAll('g.trace');
    resizeText(gd, s, 'waterfall');

    s.style('opacity', function(d: any) { return d[0].trace.opacity; });

    s.each(function(this: any, d: any) {
        const gTrace = select(this);
        const trace = d[0].trace;

        gTrace.selectAll('.point > path').each(function(this: any, di: any) {
            if(!di.isBlank) {
                const cont = trace[di.dir].marker;

                select(this)
                    .call(Color.fill, cont.color)
                    .call(Color.stroke, cont.line.color)
                    .call(dashLine, cont.line.dash, cont.line.width)
                    .style('opacity', trace.selectedpoints && !di.selected ? DESELECTDIM : 1);
            }
        });

        styleTextPoints(gTrace, trace, gd);

        gTrace.selectAll('.lines').each(function(this: any) {
            const cont = trace.connector.line;

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
