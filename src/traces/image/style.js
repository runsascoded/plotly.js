import d3 from '@plotly/d3';

export default function style(gd) {
    d3.select(gd).selectAll('.im image')
        .style('opacity', function(d) {
            return d[0].trace.opacity;
        });
}
