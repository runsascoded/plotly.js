import Lib from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function(layoutIn, layoutOut, fullData) {
    var hasTraceType = false;

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn, layoutOut, layoutAttributes, attr, dflt);
    }

    for(var i = 0; i < fullData.length; i++) {
        var trace = fullData[i];

        if(trace.visible && trace.type === 'waterfall') {
            hasTraceType = true;
            break;
        }
    }

    if(hasTraceType) {
        coerce('waterfallmode');
        coerce('waterfallgap', 0.2);
        coerce('waterfallgroupgap');
    }
}
