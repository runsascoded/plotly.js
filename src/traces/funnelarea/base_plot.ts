import type { GraphDiv } from '../../../types/core';
import plots from '../../plots/plots.js';
export const name = 'funnelarea';

export function plot(gd: GraphDiv,  traces: any,  transitionOpts: any,  makeOnCompleteCallback: any) {
    plots.plotBasePlot(name, gd, traces, transitionOpts, makeOnCompleteCallback);
}

export function clean(newFullData: any,  newFullLayout: any,  oldFullData: any,  oldFullLayout: any) {
    plots.cleanBasePlot(name, newFullData, newFullLayout, oldFullData, oldFullLayout);
}

export default { name, plot, clean };
