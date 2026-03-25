export default function doAvg(size, counts) {
    var nMax = size.length;
    var total = 0;
    for(var i = 0; i < nMax; i++) {
        if(counts[i]) {
            size[i] /= counts[i];
            total += size[i];
        } else size[i] = null;
    }
    return total;
}
