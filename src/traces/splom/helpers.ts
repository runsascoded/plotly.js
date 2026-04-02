import type { FullAxis, FullTrace } from '../../../types/core';
export const getDimIndex = function getDimIndex(trace: FullTrace, ax: FullAxis) {
    const axId = ax._id;
    const axLetter = axId.charAt(0);
    const ind = {x: 0, y: 1}[axLetter];
    const visibleDims = trace._visibleDims;

    for(let k = 0; k < visibleDims.length; k++) {
        const i = visibleDims[k];
        if(trace._diag[i][ind!] === axId) return k;
    }
    return false;
};

export default { getDimIndex };
