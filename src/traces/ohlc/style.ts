import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { dashLine } from '../../components/drawing/index.js';
import Color from '../../components/color/index.js';

export default function style(gd: GraphDiv,  cd: any,  sel: any) {
    const s = sel ? sel : select(gd).selectAll('g.ohlclayer').selectAll('g.trace');

    s.style('opacity', function(d: any) {
        return d[0].trace.opacity;
    });

    s.each(function(this: any, d: any) {
        const trace = d[0].trace;

        select(this).selectAll('path').each(function(this: any, di: any) {
            if(di.empty) return;

            const dirLine = trace[di.dir].line;
            select(this)
                .style('fill', 'none')
                .call(Color.stroke, dirLine.color)
                .call(dashLine, dirLine.dash, dirLine.width)
                // TODO: custom selection style for OHLC
                .style('opacity', trace.selectedpoints && !di.selected ? 0.3 : 1);
        });
    });
}
