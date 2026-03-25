import { getModuleCalcData } from '../../plots/get_data.js';
import tablePlot from './plot.js';

var TABLE = 'table';

export var name = TABLE;

export var plot = function(gd) {
    var calcData = getModuleCalcData(gd.calcdata, TABLE)[0];
    if(calcData.length) tablePlot(gd, calcData);
};

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var hadTable = (oldFullLayout._has && oldFullLayout._has(TABLE));
    var hasTable = (newFullLayout._has && newFullLayout._has(TABLE));

    if(hadTable && !hasTable) {
        oldFullLayout._paperdiv.selectAll('.table').remove();
    }
};

export default { name, plot, clean };
