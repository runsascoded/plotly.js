import { select } from 'd3-selection';
import Color from '../color/index.js';
export default function style(traces) {
    traces.each(function (d) {
        const trace = d[0].trace;
        const yObj = trace.error_y || {};
        let xObj = trace.error_x || {};
        const s = select(this);
        s.selectAll('path.yerror')
            .style('stroke-width', yObj.thickness + 'px')
            .call(Color.stroke, yObj.color);
        if (xObj.copy_ystyle)
            xObj = yObj;
        s.selectAll('path.xerror')
            .style('stroke-width', xObj.thickness + 'px')
            .call(Color.stroke, xObj.color);
    });
}
