export default function zip3(x, y, z, len) {
    len = len || x.length;
    const result = new Array(len);
    for (let i = 0; i < len; i++) {
        result[i] = [x[i], y[i], z[i]];
    }
    return result;
}
