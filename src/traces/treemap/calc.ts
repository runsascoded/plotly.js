import type { FullTrace, GraphDiv } from '../../../types/core';
import sunburstCalc from '../sunburst/calc.js';

export var calc = function(gd: GraphDiv, trace: FullTrace) {
    return sunburstCalc.calc(gd, trace);
};

export var crossTraceCalc = function(gd: GraphDiv) {
    return sunburstCalc._runCrossTraceCalc('treemap', gd);
};

export default { calc, crossTraceCalc };
