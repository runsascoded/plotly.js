import type { FullLayout, FullTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import handleGroupingDefaults from './grouping_defaults.js';
import attributes from './attributes.js';

export default function crossTraceDefaults(fullData: FullTrace[], fullLayout: FullLayout): void {
    let traceIn, traceOut, i;
    const scattermode = fullLayout.scattermode;

    function coerce(attr) {
        return Lib.coerce(traceOut._input, traceOut, attributes, attr);
    }

    if(fullLayout.scattermode === 'group') {
        for(i = 0; i < fullData.length; i++) {
            traceOut = fullData[i];
    
            if(traceOut.type === 'scatter') {
                traceIn = traceOut._input;
                handleGroupingDefaults(traceIn, traceOut, fullLayout, coerce, scattermode);
            }
        }
    }

    for(i = 0; i < fullData.length; i++) {
        const tracei = fullData[i];
        if(tracei.type !== 'scatter') continue;

        const filli = tracei.fill;
        if(filli === 'none' || filli === 'toself') continue;

        tracei.opacity = undefined;

        if(filli === 'tonexty' || filli === 'tonextx') {
            for(let j = i - 1; j >= 0; j--) {
                const tracej = fullData[j];

                if((tracej.type === 'scatter') &&
                        (tracej.xaxis === tracei.xaxis) &&
                        (tracej.yaxis === tracei.yaxis)) {
                    tracej.opacity = undefined;
                    break;
                }
            }
        }
    }
}
