import Lib from '../../lib/index.js';
import attrs from './layout_attributes.js';

export default function(layoutIn: any, layoutOut: any, fullData: any) {
    const subplotsDone: any = {};
    let sp: any;

    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(layoutIn[sp] || {}, layoutOut[sp], attrs, attr, dflt);
    }

    for(let i = 0; i < fullData.length; i++) {
        const trace = fullData[i];
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
