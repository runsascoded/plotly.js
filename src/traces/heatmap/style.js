import d3 from '@plotly/d3';

export default function style(gd) {
    d3.select(gd).selectAll('.hm image')
        .style('opacity', function(d) {
            return d.trace.opacity;
        });
}
