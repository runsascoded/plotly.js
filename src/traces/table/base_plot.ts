import type { FullLayout, FullTrace, GraphDiv } from '../../../types/core';
import { getModuleCalcData } from '../../plots/get_data.js';
import tablePlot from './plot.js';

var TABLE = 'table';

export var name = TABLE;

export var plot = function(gd: GraphDiv): void {
    var calcData = getModuleCalcData(gd.calcdata, TABLE)[0];
    if(calcData.length) tablePlot(gd, calcData);
};

export var clean = function(newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout) {
    var hadTable = (oldFullLayout._has && oldFullLayout._has(TABLE));
    var hasTable = (newFullLayout._has && newFullLayout._has(TABLE));

    if(hadTable && !hasTable) {
        oldFullLayout._paperdiv.selectAll('.table').remove();
    }
};

export default { name, plot, clean };
