import Lib from '../../lib/index.js';
import attrs from './layout_attributes.js';

export default function(layoutIn, layoutOut, fullData) {
    var subplotsDone: any = {};
    var sp;

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn[sp] || {}, layoutOut[sp], attrs, attr, dflt);
    }

    for(var i = 0; i < fullData.length; i++) {
        var trace = fullData[i];
        if(trace.type === 'barpolar' && trace.visible === true) {
            sp = trace.subplot;
            if(!subplotsDone[sp]) {
                coerce('barmode');
                coerce('bargap');
                subplotsDone[sp] = 1;
            }
        }
    }
}
