import _index from '../../lib/index.js';
const { isTypedArray } = _index;
export function convertTypedArray(a) {
    return isTypedArray(a) ? Array.prototype.slice.call(a) : a;
}
export function isOrdinal(dimension) {
    return !!dimension.tickvals;
}
export function isVisible(dimension) {
    return dimension.visible || !('visible' in dimension);
}
export default { convertTypedArray, isOrdinal, isVisible };
