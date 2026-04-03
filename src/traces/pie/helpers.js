import { isArrayOrTypedArray, numSeparate } from '../../lib/index.js';
function format(vRounded) {
    return (vRounded.indexOf('e') !== -1 ? vRounded.replace(/[.]?0+e/, 'e') :
        vRounded.indexOf('.') !== -1 ? vRounded.replace(/[.]?0+$/, '') :
            vRounded);
}
export function formatPiePercent(v, separators) {
    const vRounded = format((v * 100).toPrecision(3));
    return numSeparate(vRounded, separators) + '%';
}
export function formatPieValue(v, separators) {
    const vRounded = format(v.toPrecision(10));
    return numSeparate(vRounded, separators);
}
export function getFirstFilled(array, indices) {
    if (!isArrayOrTypedArray(array))
        return;
    for (let i = 0; i < indices.length; i++) {
        const v = array[indices[i]];
        if (v || v === 0 || v === '')
            return v;
    }
}
export function castOption(item, indices) {
    if (isArrayOrTypedArray(item))
        return getFirstFilled(item, indices);
    else if (item)
        return item;
}
export function getRotationAngle(rotation) {
    return (rotation === 'auto' ? 0 : rotation) * Math.PI / 180;
}
export default { formatPiePercent, formatPieValue, getFirstFilled, castOption, getRotationAngle };
