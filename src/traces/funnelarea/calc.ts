import type { FullTrace, GraphDiv } from '../../../types/core';
import pieCalc from '../pie/calc.js';

function calc(gd: GraphDiv,  trace: FullTrace) {
    return pieCalc.calc(gd, trace);
}

function crossTraceCalc(gd: GraphDiv) {
    pieCalc.crossTraceCalc(gd, { type: 'funnelarea' });
}

export default {
    calc: calc,
    crossTraceCalc: crossTraceCalc
};
