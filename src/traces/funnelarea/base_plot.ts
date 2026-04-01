import type { GraphDiv } from '../../../types/core';
import plots from '../../plots/plots.js';
export var name = 'funnelarea';

export var plot = function(gd: GraphDiv,  traces,  transitionOpts,  makeOnCompleteCallback) {
    plots.plotBasePlot(name, gd, traces, transitionOpts, makeOnCompleteCallback);
};

export var clean = function(newFullData,  newFullLayout,  oldFullData,  oldFullLayout) {
    plots.cleanBasePlot(name, newFullData, newFullLayout, oldFullData, oldFullLayout);
};

export default { name, plot, clean };
