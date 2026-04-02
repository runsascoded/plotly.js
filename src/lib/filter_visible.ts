export default function filterVisible(container: any[]): any[] {
    const filterFn = isCalcData(container) ? calcDataFilter : baseFilter;
    const out: any[] = [];

    for(let i = 0; i < container.length; i++) {
        const item = container[i];
        if(filterFn(item)) out.push(item);
    }

    return out;
}

function baseFilter(item: any): boolean {
    return item.visible === true;
}

function calcDataFilter(item: any): boolean {
    const trace = item[0].trace;
    return trace.visible === true && trace._length !== 0;
}

function isCalcData(cont: any[]): boolean {
    return (
        Array.isArray(cont) &&
        Array.isArray(cont[0]) &&
        cont[0][0] &&
        cont[0][0].trace
    );
}
