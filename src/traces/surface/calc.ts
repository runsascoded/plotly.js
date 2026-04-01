import colorscaleCalc from '../../components/colorscale/calc.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    if(trace.surfacecolor) {
        colorscaleCalc(gd, trace, {
            vals: trace.surfacecolor,
            containerStr: '',
            cLetter: 'c'
        });
    } else {
        colorscaleCalc(gd, trace, {
            vals: trace.z,
            containerStr: '',
            cLetter: 'c'
        });
    }
}
