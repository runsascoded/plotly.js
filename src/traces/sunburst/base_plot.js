import plots from '../../plots/plots.js';
export const name = 'sunburst';
export function plot(gd, traces, transitionOpts, makeOnCompleteCallback) {
    plots.plotBasePlot(name, gd, traces, transitionOpts, makeOnCompleteCallback);
}
export function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    plots.cleanBasePlot(name, newFullData, newFullLayout, oldFullData, oldFullLayout);
}
export default { name, plot, clean };
