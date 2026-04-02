import { select } from 'd3-selection';

export default function makeTraceGroups(traceLayer: any, cdModule: any[], cls: string): any {
    const traces = traceLayer.selectAll('g.' + cls.replace(/\s/g, '.'))
        .data(cdModule, function(cd: any) { return cd[0].trace.uid; });

    traces.exit().remove();

    traces.enter().append('g')
        .attr('class', cls);

    traces.order();

    // stash ref node to trace group in calcdata,
    // useful for (fast) styleOnSelect
    const k = traceLayer.classed('rangeplot') ? 'nodeRangePlot3' : 'node3';
    traces.each(function(this: Element, cd: any) { cd[0][k] = select(this); });

    return traces;
}
