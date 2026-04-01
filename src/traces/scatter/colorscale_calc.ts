import type { FullTrace, GraphDiv } from '../../../types/core';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import calcColorscale from '../../components/colorscale/calc.js';
import subTypes from './subtypes.js';

export default function calcMarkerColorscale(gd: GraphDiv, trace: FullTrace): void {
    if(subTypes.hasLines(trace) && hasColorscale(trace, 'line')) {
        calcColorscale(gd, trace, {
            vals: trace.line.color,
            containerStr: 'line',
            cLetter: 'c'
        });
    }

    if(subTypes.hasMarkers(trace)) {
        if(hasColorscale(trace, 'marker')) {
            calcColorscale(gd, trace, {
                vals: trace.marker.color,
                containerStr: 'marker',
                cLetter: 'c'
            });
        }
        if(hasColorscale(trace, 'marker.line')) {
            calcColorscale(gd, trace, {
                vals: trace.marker.line.color,
                containerStr: 'marker.line',
                cLetter: 'c'
            });
        }
    }
}
