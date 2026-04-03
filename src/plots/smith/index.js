import { getSubplotCalcData } from '../get_data.js';
import _index from '../../lib/index.js';
const { counterRegex } = _index;
import createPolar from '../polar/polar.js';
import constants from './constants.js';
import _req0 from './layout_attributes.js';
import _req1 from './layout_defaults.js';
import { toSVG as _req2 } from '../cartesian/index.js';
const attr = constants.attr;
const name = constants.name;
const counter = counterRegex(name);
const attributes = {};
attributes[attr] = {
    valType: 'subplotid',
    dflt: name,
    editType: 'calc',
    description: [
        'Sets a reference between this trace\'s data coordinates and',
        'a smith subplot.',
        'If *smith* (the default value), the data refer to `layout.smith`.',
        'If *smith2*, the data refer to `layout.smith2`, and so on.'
    ].join(' ')
};
function plot(gd) {
    const fullLayout = gd._fullLayout;
    const calcData = gd.calcdata;
    const subplotIds = fullLayout._subplots[name];
    for (let i = 0; i < subplotIds.length; i++) {
        const id = subplotIds[i];
        const subplotCalcData = getSubplotCalcData(calcData, name, id);
        let subplot = fullLayout[id]._subplot;
        if (!subplot) {
            subplot = createPolar(gd, id, true);
            fullLayout[id]._subplot = subplot;
        }
        subplot.plot(subplotCalcData, fullLayout, gd._promises);
    }
}
function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const oldIds = oldFullLayout._subplots[name] || [];
    for (let i = 0; i < oldIds.length; i++) {
        const id = oldIds[i];
        const oldSubplot = oldFullLayout[id]._subplot;
        if (!newFullLayout[id] && !!oldSubplot) {
            oldSubplot.framework.remove();
            for (const k in oldSubplot.clipPaths) {
                oldSubplot.clipPaths[k].remove();
            }
        }
    }
}
export default {
    attr: attr,
    name: name,
    idRoot: name,
    idRegex: counter,
    attrRegex: counter,
    attributes: attributes,
    layoutAttributes: _req0,
    supplyLayoutDefaults: _req1,
    plot: plot,
    clean: clean,
    toSVG: _req2
};
