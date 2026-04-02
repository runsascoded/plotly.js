import Ternary from './ternary.js';
import { getSubplotCalcData } from '../../plots/get_data.js';
import _index from '../../lib/index.js';
const { counterRegex } = _index;
import _req0 from './layout_attributes.js';
import _req1 from './layout_defaults.js';
import type { GraphDiv } from '../../../types/core';
const TERNARY = 'ternary';

export const name = TERNARY;
export const attr = 'subplot';
export const idRoot = TERNARY;
export const idRegex = counterRegex(TERNARY);
export const attributes = {};
attributes[attr] = {
    valType: 'subplotid',
    dflt: 'ternary',
    editType: 'calc',
    description: [
        'Sets a reference between this trace\'s data coordinates and',
        'a ternary subplot.',
        'If *ternary* (the default value), the data refer to `layout.ternary`.',
        'If *ternary2*, the data refer to `layout.ternary2`, and so on.'
    ].join(' ')
};

export const layoutAttributes = _req0;
export const supplyLayoutDefaults = _req1;

export const plot = function plot(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const calcData = gd.calcdata;
    const ternaryIds = fullLayout._subplots[TERNARY];

    for(let i = 0; i < ternaryIds.length; i++) {
        const ternaryId = ternaryIds[i];
        const ternaryCalcData = getSubplotCalcData(calcData, TERNARY, ternaryId);
        let ternary = fullLayout[ternaryId]._subplot;

        // If ternary is not instantiated, create one!
        if(!ternary) {
            ternary = new Ternary({
                id: ternaryId,
                graphDiv: gd,
                container: fullLayout._ternarylayer.node()
            },
                fullLayout
            );

            fullLayout[ternaryId]._subplot = ternary;
        }

        ternary.plot(ternaryCalcData, fullLayout, gd._promises);
    }
};

export const clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const oldTernaryKeys = oldFullLayout._subplots[TERNARY] || [];

    for(let i = 0; i < oldTernaryKeys.length; i++) {
        const oldTernaryKey = oldTernaryKeys[i];
        const oldTernary = oldFullLayout[oldTernaryKey]._subplot;

        if(!newFullLayout[oldTernaryKey] && !!oldTernary) {
            oldTernary.plotContainer.remove();
            oldTernary.clipDef.remove();
            oldTernary.clipDefRelative.remove();
            oldTernary.layers['a-title'].remove();
            oldTernary.layers['b-title'].remove();
            oldTernary.layers['c-title'].remove();
        }
    }
};

export const updateFx = function(gd) {
    const fullLayout = gd._fullLayout;
    fullLayout._ternarylayer
        .selectAll('g.toplevel')
        .style('cursor', fullLayout.dragmode === 'pan' ? 'move' : 'crosshair');
};

export default { name, attr, idRoot, idRegex, attributes, layoutAttributes, supplyLayoutDefaults, plot, clean, updateFx };
