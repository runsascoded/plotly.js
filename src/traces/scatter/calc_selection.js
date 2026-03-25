import Lib from '../../lib/index.js';

export default function calcSelection(cd, trace) {
    if(Lib.isArrayOrTypedArray(trace.selectedpoints)) {
        Lib.tagSelected(cd, trace);
    }
}
