import { isArrayOrTypedArray, tagSelected } from '../../lib/index.js';

export default function calcSelection(cd, trace) {
    if(isArrayOrTypedArray(trace.selectedpoints)) {
        tagSelected(cd, trace);
    }
}
