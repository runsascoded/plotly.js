import { getModuleCalcData } from '../../plots/get_data.js';
import parcatsPlot from './plot.js';

var PARCATS = 'parcats';
export var name = PARCATS;

export var plot = function(gd, traces, transitionOpts, makeOnCompleteCallback) {
    var cdModuleAndOthers = getModuleCalcData(gd.calcdata, PARCATS);

    if(cdModuleAndOthers.length) {
        var calcData = cdModuleAndOthers[0];
        parcatsPlot(gd, calcData, transitionOpts, makeOnCompleteCallback);
    }
};

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var hadTable = (oldFullLayout._has && oldFullLayout._has('parcats'));
    var hasTable = (newFullLayout._has && newFullLayout._has('parcats'));

    if(hadTable && !hasTable) {
        oldFullLayout._paperdiv.selectAll('.parcats').remove();
    }
};

export default { name, plot, clean };
