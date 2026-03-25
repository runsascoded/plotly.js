import { isTypedArray } from '../../lib/index.js';

export var convertTypedArray = function(a) {
    return isTypedArray(a) ? Array.prototype.slice.call(a) : a;
};

export var isOrdinal = function(dimension) {
    return !!dimension.tickvals;
};

export var isVisible = function(dimension) {
    return dimension.visible || !('visible' in dimension);
};

export default { convertTypedArray, isOrdinal, isVisible };
