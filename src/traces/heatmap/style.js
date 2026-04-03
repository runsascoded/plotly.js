import { select } from 'd3-selection';
export default function style(gd) {
    select(gd).selectAll('.hm image')
        .style('opacity', function (d) {
        return d.trace.opacity;
    });
}
