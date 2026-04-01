export default function filterUnique(array: any[]): any[] {
    var seen: Record<string, number> = {};
    var out: any[] = [];
    var j = 0;

    for(var i = 0; i < array.length; i++) {
        var item = array[i];

        if(seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }

    return out;
}
