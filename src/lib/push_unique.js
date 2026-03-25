export default function pushUnique(array, item) {
    if(item instanceof RegExp) {
        var itemStr = item.toString();
        for(var i = 0; i < array.length; i++) {
            if(array[i] instanceof RegExp && array[i].toString() === itemStr) {
                return array;
            }
        }
        array.push(item);
    } else if((item || item === 0) && array.indexOf(item) === -1) array.push(item);

    return array;
}
