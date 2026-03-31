import { isArrayOrTypedArray, tagSelected } from '../../lib/index.js';

export default function calcSelection(cd: any[], trace: any): void {
    if(isArrayOrTypedArray(trace.selectedpoints)) {
        tagSelected(cd, trace);
    }
}
