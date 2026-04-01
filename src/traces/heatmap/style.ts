import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';

export default function style(gd: GraphDiv) {
    select(gd).selectAll('.hm image')
        .style('opacity', function(d) {
            return d.trace.opacity;
        });
}
