import plots from '../../plots/plots.js';
export var name = 'treemap';

export var plot = function(gd, traces, transitionOpts, makeOnCompleteCallback) {
    plots.plotBasePlot(name, gd, traces, transitionOpts, makeOnCompleteCallback);
};

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    plots.cleanBasePlot(name, newFullData, newFullLayout, oldFullData, oldFullLayout);
};

export default { name, plot, clean };
