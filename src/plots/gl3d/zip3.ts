export default function zip3(x: any, y: any, z: any, len?: number) {
    len = len || x.length;

    var result = new Array(len);
    for(var i = 0; i < len; i++) {
        result[i] = [x[i], y[i], z[i]];
    }
    return result;
}
