import Registry from '../registry.js';
import _constants from './cartesian/constants.js';
const { SUBPLOT_PATTERN } = _constants;

export function getSubplotCalcData(calcData?: any, type?: any, subplotId?: any): any {
    const basePlotModule = Registry.subplotsRegistry[type];
    if(!basePlotModule) return [];

    const attr = basePlotModule.attr;
    const subplotCalcData: any[] = [];

    for(let i = 0; i < calcData.length; i++) {
        const calcTrace = calcData[i];
        const trace = calcTrace[0].trace;

        if(trace[attr] === subplotId) subplotCalcData.push(calcTrace);
    }

    return subplotCalcData;
}

export function getModuleCalcData(calcdata?: any, arg1?: any, arg2?: any): any {
    const moduleCalcData: any[] = [];
    const remainingCalcData: any[] = [];

    let plotMethod;
    if(typeof arg1 === 'string') {
        plotMethod = Registry.getModule(arg1).plot;
    } else if(typeof arg1 === 'function') {
        plotMethod = arg1;
    } else {
        plotMethod = arg1.plot;
    }
    if(!plotMethod) {
        return [moduleCalcData, calcdata];
    }
    const zorder = arg2;

    for(let i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const trace = cd[0].trace;
        const filterByZ = (trace.zorder !== undefined);
        // N.B.
        // - 'legendonly' traces do not make it past here
        // - skip over 'visible' traces that got trimmed completely during calc transforms
        if(trace.visible !== true || trace._length === 0) continue;

        // group calcdata trace not by 'module' (as the name of this function
        // would suggest), but by 'module plot method' so that if some traces
        // share the same module plot method (e.g. bar and histogram), we
        // only call it one!
        if(trace._module && trace._module.plot === plotMethod && (!filterByZ || trace.zorder === zorder)) {
            moduleCalcData.push(cd);
        } else {
            remainingCalcData.push(cd);
        }
    }

    return [moduleCalcData, remainingCalcData];
}

export function getSubplotData(data?: any, type?: any, subplotId?: any): any {
    if(!Registry.subplotsRegistry[type]) return [];

    const attr = Registry.subplotsRegistry[type].attr;
    const subplotData: any[] = [];
    let trace, subplotX, subplotY;

    for(let i = 0; i < data.length; i++) {
        trace = data[i];

        if(trace[attr] === subplotId) subplotData.push(trace);
    }

    return subplotData;
}

export default { getSubplotCalcData, getModuleCalcData, getSubplotData };
