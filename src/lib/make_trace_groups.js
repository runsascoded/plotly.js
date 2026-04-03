import { select } from 'd3-selection';
export default function makeTraceGroups(traceLayer, cdModule, cls) {
    const traces = traceLayer.selectAll('g.' + cls.replace(/\s/g, '.'))
        .data(cdModule, function (cd) { return cd[0].trace.uid; });
    traces.exit().remove();
    const enter = traces.enter().append('g')
        .attr('class', cls);
    const merged = traces.merge(enter);
    merged.order();
    // stash ref node to trace group in calcdata,
    // useful for (fast) styleOnSelect
    const k = traceLayer.classed('rangeplot') ? 'nodeRangePlot3' : 'node3';
    merged.each(function (cd) { cd[0][k] = select(this); });
    return merged;
}
