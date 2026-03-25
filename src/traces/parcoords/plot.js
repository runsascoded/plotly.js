import parcoords from './parcoords.js';
import prepareRegl from '../../lib/prepare_regl.js';
import { isVisible } from './helpers.js';
var reglPrecompiled = {};

function newIndex(visibleIndices, orig, dim) {
    var origIndex = orig.indexOf(dim);
    var currentIndex = visibleIndices.indexOf(origIndex);
    if(currentIndex === -1) {
        // invisible dimensions initially go to the end
        currentIndex += orig.length;
    }
    return currentIndex;
}

function sorter(visibleIndices, orig) {
    return function sorter(d1, d2) {
        return (
            newIndex(visibleIndices, orig, d1) -
            newIndex(visibleIndices, orig, d2)
        );
    };
}

var exports = {};

export { reglPrecompiled };

export default { reglPrecompiled };
