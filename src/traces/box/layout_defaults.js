import { traceIs } from '../../lib/trace_categories.js';
import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
function _supply(layoutIn, layoutOut, fullData, coerce, traceType) {
    const category = traceType + 'Layout';
    let hasTraceType = false;
    for (let i = 0; i < fullData.length; i++) {
        const trace = fullData[i];
        if (traceIs(trace, category)) {
            hasTraceType = true;
            break;
        }
    }
    if (!hasTraceType)
        return;
    coerce(traceType + 'mode');
    coerce(traceType + 'gap');
    coerce(traceType + 'groupgap');
}
function supplyLayoutDefaults(layoutIn, layoutOut, fullData) {
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    _supply(layoutIn, layoutOut, fullData, coerce, 'box');
}
export default {
    supplyLayoutDefaults: supplyLayoutDefaults,
    _supply: _supply
};
