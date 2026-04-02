import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { dashLine, lineGroupStyle } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';
import scatterStyle from '../scatter/style.js';
const stylePoints = scatterStyle.stylePoints;
const styleText = scatterStyle.styleText;

export default function style(gd: GraphDiv, calcTrace) {
    if(calcTrace) styleTrace(gd, calcTrace);
}

function styleTrace(gd: GraphDiv, calcTrace) {
    const trace = calcTrace[0].trace;
    const s = calcTrace[0].node3;

    s.style('opacity', calcTrace[0].trace.opacity);

    stylePoints(s, trace, gd);
    styleText(s, trace, gd);

    // this part is incompatible with lineGroupStyle
    s.selectAll('path.js-line')
        .style('fill', 'none')
        .each(function(d) {
            const path = select(this);
            const trace = d.trace;
            const line = trace.line || {};

            path.call(Color.stroke, line.color)
                .call(dashLine, line.dash || '', line.width || 0);

            if(trace.fill !== 'none') {
                path.call(Color.fill, trace.fillcolor);
            }
        });
}
