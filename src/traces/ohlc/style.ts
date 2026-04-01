import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { dashLine } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';

export default function style(gd: GraphDiv,  cd,  sel) {
    var s = sel ? sel : select(gd).selectAll('g.ohlclayer').selectAll('g.trace');

    s.style('opacity', function(d) {
        return d[0].trace.opacity;
    });

    s.each(function(d) {
        var trace = d[0].trace;

        select(this).selectAll('path').each(function(di) {
            if(di.empty) return;

            var dirLine = trace[di.dir].line;
            select(this)
                .style('fill', 'none')
                .call(Color.stroke, dirLine.color)
                .call(dashLine, dirLine.dash, dirLine.width)
                // TODO: custom selection style for OHLC
                .style('opacity', trace.selectedpoints && !di.selected ? 0.3 : 1);
        });
    });
}
