import type { FullLayout, FullTrace, GraphDiv } from '../../../types/core';
import plots from '../../plots/plots.js';
export const name = 'treemap';

export function plot(gd: GraphDiv, traces: any[], transitionOpts: any, makeOnCompleteCallback: any) {
    plots.plotBasePlot(name, gd, traces, transitionOpts, makeOnCompleteCallback);
}

export function clean(newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout) {
    plots.cleanBasePlot(name, newFullData, newFullLayout, oldFullData, oldFullLayout);
}

export default { name, plot, clean };
