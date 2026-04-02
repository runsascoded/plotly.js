import _index from '../../lib/index.js';
const { isTypedArray } = _index;

export const convertTypedArray = function(a) {
    return isTypedArray(a) ? Array.prototype.slice.call(a) : a;
};

export const isOrdinal = function(dimension) {
    return !!dimension.tickvals;
};

export const isVisible = function(dimension) {
    return dimension.visible || !('visible' in dimension);
};

export default { convertTypedArray, isOrdinal, isVisible };
