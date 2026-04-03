import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
export default function mapArray(out, data, func) {
    let i;
    if (!isArrayOrTypedArray(out)) {
        // If not an array, make it an array:
        out = [];
    }
    else if (out.length > data.length) {
        // If too long, truncate. (If too short, it will grow
        // automatically so we don't care about that case)
        out = out.slice(0, data.length);
    }
    for (i = 0; i < data.length; i++) {
        out[i] = func(data[i]);
    }
    return out;
}
