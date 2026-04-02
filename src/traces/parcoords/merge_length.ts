export default function(traceOut: any, dimensions: any, dataAttr: any, len?: any) {
    if(!len) len = Infinity;
    let i, dimi;
    for(i = 0; i < dimensions.length; i++) {
        dimi = dimensions[i];
        if(dimi.visible) len = Math.min(len, dimi[dataAttr].length);
    }
    if(len === Infinity) len = 0;

    traceOut._length = len;
    for(i = 0; i < dimensions.length; i++) {
        dimi = dimensions[i];
        if(dimi.visible) dimi._length = len;
    }

    return len;
}
