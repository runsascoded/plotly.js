import colorscaleCalc from '../../components/colorscale/calc.js';
import type { FullTrace, GraphDiv } from '../../../types/core';

export default function calc(gd: GraphDiv, trace: FullTrace) {
    if(trace.intensity) {
        colorscaleCalc(gd, trace, {
            vals: trace.intensity,
            containerStr: '',
            cLetter: 'c'
        });
    }
}
