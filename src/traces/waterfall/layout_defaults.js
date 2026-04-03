import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';
export default function (layoutIn, layoutOut, fullData) {
    let hasTraceType = false;
    function coerce(attr, dflt) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }
    for (let i = 0; i < fullData.length; i++) {
        const trace = fullData[i];
        if (trace.visible && trace.type === 'waterfall') {
            hasTraceType = true;
            break;
        }
    }
    if (hasTraceType) {
        coerce('waterfallmode');
        coerce('waterfallgap', 0.2);
        coerce('waterfallgroupgap');
    }
}
