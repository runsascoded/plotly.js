import d3 from '@plotly/d3';

export default function makeTraceGroups(traceLayer, cdModule, cls) {
    var traces = traceLayer.selectAll('g.' + cls.replace(/\s/g, '.'))
        .data(cdModule, function(cd) { return cd[0].trace.uid; });

    traces.exit().remove();

    traces.enter().append('g')
        .attr('class', cls);

    traces.order();

    // stash ref node to trace group in calcdata,
    // useful for (fast) styleOnSelect
    var k = traceLayer.classed('rangeplot') ? 'nodeRangePlot3' : 'node3';
    traces.each(function(cd) { cd[0][k] = d3.select(this); });

    return traces;
}
