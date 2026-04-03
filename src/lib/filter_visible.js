export default function filterVisible(container) {
    const filterFn = isCalcData(container) ? calcDataFilter : baseFilter;
    const out = [];
    for (let i = 0; i < container.length; i++) {
        const item = container[i];
        if (filterFn(item))
            out.push(item);
    }
    return out;
}
function baseFilter(item) {
    return item.visible === true;
}
function calcDataFilter(item) {
    const trace = item[0].trace;
    return trace.visible === true && trace._length !== 0;
}
function isCalcData(cont) {
    return (Array.isArray(cont) &&
        Array.isArray(cont[0]) &&
        cont[0][0] &&
        cont[0][0].trace);
}
