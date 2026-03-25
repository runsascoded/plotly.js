import sunburstCalc from '../sunburst/calc.js';

export var calc = function(gd, trace) {
    return sunburstCalc.calc(gd, trace);
};

export var crossTraceCalc = function(gd) {
    return calc._runCrossTraceCalc('icicle', gd);
};

export default { calc, crossTraceCalc };
