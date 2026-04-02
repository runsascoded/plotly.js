export default function pushUnique<T>(array: T[], item: T): T[] {
    if(item instanceof RegExp) {
        const itemStr = item.toString();
        for(let i = 0; i < array.length; i++) {
            if((array[i] as unknown) instanceof RegExp && (array[i] as unknown as RegExp).toString() === itemStr) {
                return array;
            }
        }
        array.push(item);
    } else if((item || item === 0) && array.indexOf(item) === -1) array.push(item);

    return array;
}
