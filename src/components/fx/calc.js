import { fillArray, identity } from '../../lib/index.js';
import { coerceHoverinfo } from '../../lib/index.js';
import { traceIs } from '../../lib/trace_categories.js';
export default function calc(gd) {
    const calcdata = gd.calcdata;
    const fullLayout = gd._fullLayout;
    function makeCoerceHoverInfo(trace) {
        return function (val) {
            return coerceHoverinfo({ hoverinfo: val }, { _module: trace._module }, fullLayout);
        };
    }
    for (let i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const trace = cd[0].trace;
        // don't include hover calc fields for pie traces
        // as calcdata items might be sorted by value and
        // won't match the data array order.
        if (traceIs(trace, 'pie-like'))
            continue;
        const fillFn = traceIs(trace, '2dMap') ? paste : fillArray;
        fillFn(trace.hoverinfo, cd, 'hi', makeCoerceHoverInfo(trace));
        if (trace.hovertemplate)
            fillFn(trace.hovertemplate, cd, 'ht');
        if (!trace.hoverlabel)
            continue;
        fillFn(trace.hoverlabel.bgcolor, cd, 'hbg');
        fillFn(trace.hoverlabel.bordercolor, cd, 'hbc');
        fillFn(trace.hoverlabel.font.size, cd, 'hts');
        fillFn(trace.hoverlabel.font.color, cd, 'htc');
        fillFn(trace.hoverlabel.font.family, cd, 'htf');
        fillFn(trace.hoverlabel.font.weight, cd, 'htw');
        fillFn(trace.hoverlabel.font.style, cd, 'hty');
        fillFn(trace.hoverlabel.font.variant, cd, 'htv');
        fillFn(trace.hoverlabel.namelength, cd, 'hnl');
        fillFn(trace.hoverlabel.align, cd, 'hta');
        fillFn(trace.hoverlabel.showarrow, cd, 'htsa');
    }
}
function paste(traceAttr, cd, cdAttr, fn) {
    fn = fn || identity;
    if (Array.isArray(traceAttr)) {
        cd[0][cdAttr] = fn(traceAttr);
    }
}
