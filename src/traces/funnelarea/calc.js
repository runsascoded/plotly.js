import pieCalc from '../pie/calc.js';
function calc(gd, trace) {
    return pieCalc.calc(gd, trace);
}
function crossTraceCalc(gd) {
    pieCalc.crossTraceCalc(gd, { type: 'funnelarea' });
}
export default {
    calc: calc,
    crossTraceCalc: crossTraceCalc
};
