import type { FullTrace, GraphDiv } from '../../../types/core';
import sunburstCalc from '../sunburst/calc.js';

export const calc = function(gd: GraphDiv, trace: FullTrace) {
    return sunburstCalc.calc(gd, trace);
};

export const crossTraceCalc = function(gd: GraphDiv) {
    return sunburstCalc._runCrossTraceCalc('icicle', gd);
};

export default { calc, crossTraceCalc };
