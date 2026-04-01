import Ternary from './ternary.js';
import { getSubplotCalcData } from '../../plots/get_data.js';
import _index from '../../lib/index.js';
const { counterRegex } = _index;
import _req0 from './layout_attributes.js';
import _req1 from './layout_defaults.js';
import type { GraphDiv } from '../../../types/core';
var TERNARY = 'ternary';

export var name = TERNARY;
export var attr = 'subplot';
export var idRoot = TERNARY;
export var idRegex = counterRegex(TERNARY);
export var attributes = {};
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

export var layoutAttributes = _req0;
export var supplyLayoutDefaults = _req1;

export var plot = function plot(gd: GraphDiv) {
    var fullLayout = gd._fullLayout;
    var calcData = gd.calcdata;
    var ternaryIds = fullLayout._subplots[TERNARY];

    for(var i = 0; i < ternaryIds.length; i++) {
        var ternaryId = ternaryIds[i];
        var ternaryCalcData = getSubplotCalcData(calcData, TERNARY, ternaryId);
        var ternary = fullLayout[ternaryId]._subplot;

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

export var clean = function(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    var oldTernaryKeys = oldFullLayout._subplots[TERNARY] || [];

    for(var i = 0; i < oldTernaryKeys.length; i++) {
        var oldTernaryKey = oldTernaryKeys[i];
        var oldTernary = oldFullLayout[oldTernaryKey]._subplot;

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

export var updateFx = function(gd) {
    var fullLayout = gd._fullLayout;
    fullLayout._ternarylayer
        .selectAll('g.toplevel')
        .style('cursor', fullLayout.dragmode === 'pan' ? 'move' : 'crosshair');
};

export default { name, attr, idRoot, idRegex, attributes, layoutAttributes, supplyLayoutDefaults, plot, clean, updateFx };
