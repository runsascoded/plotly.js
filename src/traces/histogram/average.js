export default function doAvg(size, counts) {
    const nMax = size.length;
    let total = 0;
    for (let i = 0; i < nMax; i++) {
        if (counts[i]) {
            size[i] /= counts[i];
            total += size[i];
        }
        else
            size[i] = null;
    }
    return total;
}
