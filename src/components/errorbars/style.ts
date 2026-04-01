import { select } from 'd3-selection';
import Color from '../color/index.js';

export default function style(traces: any): void {
    traces.each(function(this: any, d: any) {
        var trace = d[0].trace;
        var yObj = trace.error_y || {};
        var xObj = trace.error_x || {};

        var s = select(this);

        s.selectAll('path.yerror')
            .style('stroke-width', yObj.thickness + 'px')
            .call(Color.stroke, yObj.color);

        if(xObj.copy_ystyle) xObj = yObj;

        s.selectAll('path.xerror')
            .style('stroke-width', xObj.thickness + 'px')
            .call(Color.stroke, xObj.color);
    });
}
