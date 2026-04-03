import { getModuleCalcData } from '../../plots/get_data.js';
import tablePlot from './plot.js';
const TABLE = 'table';
export const name = TABLE;
export function plot(gd) {
    const calcData = getModuleCalcData(gd.calcdata, TABLE)[0];
    if (calcData.length)
        tablePlot(gd, calcData);
}
export function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const hadTable = (oldFullLayout._has && oldFullLayout._has(TABLE));
    const hasTable = (newFullLayout._has && newFullLayout._has(TABLE));
    if (hadTable && !hasTable) {
        oldFullLayout._paperdiv.selectAll('.table').remove();
    }
}
export default { name, plot, clean };
