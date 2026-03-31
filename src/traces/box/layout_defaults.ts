import type { FullLayout, FullTrace, Layout } from '../../../types/core';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

function _supply(layoutIn: Layout, layoutOut: FullLayout, fullData: FullTrace[], coerce: Function, traceType: string): void {
    var category = traceType + 'Layout';
    var hasTraceType = false;

    for(var i = 0; i < fullData.length; i++) {
        var trace = fullData[i];

        if(Registry.traceIs(trace, category)) {
            hasTraceType = true;
            break;
        }
    }
    if(!hasTraceType) return;

    coerce(traceType + 'mode');
    coerce(traceType + 'gap');
    coerce(traceType + 'groupgap');
}

function supplyLayoutDefaults(layoutIn: Layout, layoutOut: FullLayout, fullData: FullTrace[]): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    _supply(layoutIn, layoutOut, fullData, coerce, 'box');
}

export default {
    supplyLayoutDefaults: supplyLayoutDefaults,
    _supply: _supply
};
