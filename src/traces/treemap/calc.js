import sunburstCalc from '../sunburst/calc.js';

export var calc = function(gd, trace) {
    return sunburstCalc.calc(gd, trace);
};

export var crossTraceCalc = function(gd) {
    return calc._runCrossTraceCalc('treemap', gd);
};

export default { calc, crossTraceCalc };
