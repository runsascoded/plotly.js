import type { FullTrace } from '../../../types/core';
import { appendArrayMultiPointValues } from '../../components/fx/helpers.js';

export default function eventData(pt: any, trace: FullTrace): any {
    const out: any = {
        curveNumber: trace.index,
        pointNumbers: pt.pts,
        data: trace._input,
        fullData: trace,
        label: pt.label,
        color: pt.color,
        value: pt.v,
        percent: pt.percent,
        text: pt.text,
        bbox: pt.bbox,

        // pt.v (and pt.i below) for backward compatibility
        v: pt.v
    };

    // Only include pointNumber if it's unambiguous
    if(pt.pts.length === 1) out.pointNumber = out.i = pt.pts[0];

    // Add extra data arrays to the output
    // notice that this is the multi-point version ('s' on the end!)
    // so added data will be arrays matching the pointNumbers array.
    appendArrayMultiPointValues(out, trace, pt.pts);

    // don't include obsolete fields in new funnelarea traces
    if(trace.type === 'funnelarea') {
        delete out.v;
        delete out.i;
    }

    return out;
}
