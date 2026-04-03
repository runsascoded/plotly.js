import { isTypedArraySpec } from '../../lib/array.js';
function findCategories(ax, opts) {
    const dataAttr = opts.dataAttr || ax._id.charAt(0);
    const lookup = {};
    let axData;
    let i, j;
    if (opts.axData) {
        // non-x/y case
        axData = opts.axData;
    }
    else {
        // x/y case
        axData = [];
        for (i = 0; i < opts.data.length; i++) {
            const trace = opts.data[i];
            if (trace[dataAttr + 'axis'] === ax._id) {
                axData.push(trace);
            }
        }
    }
    for (i = 0; i < axData.length; i++) {
        const vals = axData[i][dataAttr];
        for (j = 0; j < vals.length; j++) {
            const v = vals[j];
            if (v !== null && v !== undefined) {
                lookup[v] = 1;
            }
        }
    }
    return Object.keys(lookup);
}
export default function handleCategoryOrderDefaults(containerIn, containerOut, coerce, opts) {
    if (containerOut.type !== 'category')
        return;
    const arrayIn = containerIn.categoryarray;
    const isValidArray = (Array.isArray(arrayIn) && arrayIn.length > 0) ||
        isTypedArraySpec(arrayIn);
    // override default 'categoryorder' value when non-empty array is supplied
    let orderDefault;
    if (isValidArray)
        orderDefault = 'array';
    let order = coerce('categoryorder', orderDefault);
    let array;
    // coerce 'categoryarray' only in array order case
    if (order === 'array') {
        array = coerce('categoryarray');
    }
    // cannot set 'categoryorder' to 'array' with an invalid 'categoryarray'
    if (!isValidArray && order === 'array') {
        order = containerOut.categoryorder = 'trace';
    }
    // set up things for makeCalcdata
    if (order === 'trace') {
        containerOut._initialCategories = [];
    }
    else if (order === 'array') {
        containerOut._initialCategories = array.slice();
    }
    else {
        array = findCategories(containerOut, opts).sort();
        if (order === 'category ascending') {
            containerOut._initialCategories = array;
        }
        else if (order === 'category descending') {
            containerOut._initialCategories = array.reverse();
        }
    }
}
