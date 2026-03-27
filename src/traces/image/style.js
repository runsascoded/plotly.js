import { select } from 'd3-selection';

export default function style(gd) {
    select(gd).selectAll('.im image')
        .style('opacity', function(d) {
            return d[0].trace.opacity;
        });
}
