import sunburstCalc from '../sunburst/calc.js';
export function calc(gd, trace) {
    return sunburstCalc.calc(gd, trace);
}
export function crossTraceCalc(gd) {
    return sunburstCalc._runCrossTraceCalc('icicle', gd);
}
export default { calc, crossTraceCalc };
