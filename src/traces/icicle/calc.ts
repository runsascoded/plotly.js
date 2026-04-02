import type { FullTrace, GraphDiv } from '../../../types/core';
import sunburstCalc from '../sunburst/calc.js';

export function calc(gd: GraphDiv, trace: FullTrace) {
    return sunburstCalc.calc(gd, trace);
}

export function crossTraceCalc(gd: GraphDiv) {
    return sunburstCalc._runCrossTraceCalc('icicle', gd);
}

export default { calc, crossTraceCalc };
