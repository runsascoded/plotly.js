import { getModuleCalcData } from '../../plots/get_data.js';
import parcatsPlot from './plot.js';

const PARCATS = 'parcats';
export const name = PARCATS;

export const plot = function(gd, traces, transitionOpts, makeOnCompleteCallback) {
    const cdModuleAndOthers = getModuleCalcData(gd.calcdata, PARCATS);

    if(cdModuleAndOthers.length) {
        const calcData = cdModuleAndOthers[0];
        parcatsPlot(gd, calcData, transitionOpts, makeOnCompleteCallback);
    }
};

export const clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const hadTable = (oldFullLayout._has && oldFullLayout._has('parcats'));
    const hasTable = (newFullLayout._has && newFullLayout._has('parcats'));

    if(hadTable && !hasTable) {
        oldFullLayout._paperdiv.selectAll('.parcats').remove();
    }
};

export default { name, plot, clean };
