import Registry from '../registry.js';
import _constants from './cartesian/constants.js';
const { SUBPLOT_PATTERN } = _constants;

export var getSubplotCalcData = function(calcData, type, subplotId) {
    var basePlotModule = Registry.subplotsRegistry[type];
    if(!basePlotModule) return [];

    var attr = basePlotModule.attr;
    var subplotCalcData = [];

    for(var i = 0; i < calcData.length; i++) {
        var calcTrace = calcData[i];
        var trace = calcTrace[0].trace;

        if(trace[attr] === subplotId) subplotCalcData.push(calcTrace);
    }

    return subplotCalcData;
};

export var getModuleCalcData = function(calcdata, arg1, arg2) {
    var moduleCalcData = [];
    var remainingCalcData = [];

    var plotMethod;
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
    var zorder = arg2;

    for(var i = 0; i < calcdata.length; i++) {
        var cd = calcdata[i];
        var trace = cd[0].trace;
        var filterByZ = (trace.zorder !== undefined);
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
};

export var getSubplotData = function getSubplotData(data, type, subplotId) {
    if(!Registry.subplotsRegistry[type]) return [];

    var attr = Registry.subplotsRegistry[type].attr;
    var subplotData = [];
    var trace, subplotX, subplotY;

    for(var i = 0; i < data.length; i++) {
        trace = data[i];

        if(trace[attr] === subplotId) subplotData.push(trace);
    }

    return subplotData;
};

export default { getSubplotCalcData, getModuleCalcData, getSubplotData };
