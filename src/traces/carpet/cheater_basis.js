import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
export default function (a, b, cheaterslope) {
    let i, j, ascal, bscal, aval, bval;
    const data = [];
    const na = isArrayOrTypedArray(a) ? a.length : a;
    const nb = isArrayOrTypedArray(b) ? b.length : b;
    const adata = isArrayOrTypedArray(a) ? a : null;
    const bdata = isArrayOrTypedArray(b) ? b : null;
    // If we're using data, scale it so that for data that's just barely
    // not evenly spaced, the switch to value-based indexing is continuous.
    // This means evenly spaced data should look the same whether value
    // or index cheatertype.
    if (adata) {
        ascal = (adata.length - 1) / (adata[adata.length - 1] - adata[0]) / (na - 1);
    }
    if (bdata) {
        bscal = (bdata.length - 1) / (bdata[bdata.length - 1] - bdata[0]) / (nb - 1);
    }
    let xval;
    let xmin = Infinity;
    let xmax = -Infinity;
    for (j = 0; j < nb; j++) {
        data[j] = [];
        bval = bdata ? (bdata[j] - bdata[0]) * bscal : j / (nb - 1);
        for (i = 0; i < na; i++) {
            aval = adata ? (adata[i] - adata[0]) * ascal : i / (na - 1);
            xval = aval - bval * cheaterslope;
            xmin = Math.min(xval, xmin);
            xmax = Math.max(xval, xmax);
            data[j][i] = xval;
        }
    }
    // Normalize cheater values to the 0-1 range. This comes into play when you have
    // multiple cheater plots. After careful consideration, it seems better if cheater
    // values are normalized to a consistent range. Otherwise one cheater affects the
    // layout of other cheaters on the same axis.
    const slope = 1.0 / (xmax - xmin);
    const offset = -xmin * slope;
    for (j = 0; j < nb; j++) {
        for (i = 0; i < na; i++) {
            data[j][i] = slope * data[j][i] + offset;
        }
    }
    return data;
}
