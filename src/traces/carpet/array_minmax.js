import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
export default function (a) {
    return minMax(a, 0);
}
function minMax(a, depth) {
    // Limit to ten dimensional datasets. This seems *exceedingly* unlikely to
    // ever cause problems or even be a concern. It's include strictly so that
    // circular arrays could never cause this to loop.
    if (!isArrayOrTypedArray(a) || depth >= 10) {
        return null;
    }
    let min = Infinity;
    let max = -Infinity;
    const n = a.length;
    for (let i = 0; i < n; i++) {
        const datum = a[i];
        if (isArrayOrTypedArray(datum)) {
            const result = minMax(datum, depth + 1);
            if (result) {
                min = Math.min(result[0], min);
                max = Math.max(result[1], max);
            }
        }
        else {
            min = Math.min(datum, min);
            max = Math.max(datum, max);
        }
    }
    return [min, max];
}
