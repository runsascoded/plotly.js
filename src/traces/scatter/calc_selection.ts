import type { CalcDatum, FullTrace } from '../../../types/core';
import { isArrayOrTypedArray, tagSelected } from '../../lib/index.js';

export default function calcSelection(cd: CalcDatum[], trace: FullTrace): void {
    if(isArrayOrTypedArray(trace.selectedpoints)) {
        tagSelected(cd, trace);
    }
}
