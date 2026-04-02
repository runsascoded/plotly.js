import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';

export default function style(gd: GraphDiv): void {
    select(gd).selectAll('.im image')
        .style('opacity', function(d: any) {
            return d[0].trace.opacity;
        });
}
