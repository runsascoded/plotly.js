export default function filterUnique(array) {
    var seen = {};
    var out = [];
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
