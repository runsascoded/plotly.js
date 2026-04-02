import _index from '../../lib/index.js';
const { isTypedArray } = _index;

export const convertTypedArray = function(a: any) {
    return isTypedArray(a) ? Array.prototype.slice.call(a) : a;
};

export const isOrdinal = function(dimension: any) {
    return !!dimension.tickvals;
};

export const isVisible = function(dimension: any) {
    return dimension.visible || !('visible' in dimension);
};

export default { convertTypedArray, isOrdinal, isVisible };
