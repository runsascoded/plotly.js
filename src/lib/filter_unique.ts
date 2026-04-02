export default function filterUnique(array: any[]): any[] {
    const seen: Record<string, number> = {};
    const out: any[] = [];
    let j = 0;

    for(let i = 0; i < array.length; i++) {
        const item = array[i];

        if(seen[item] !== 1) {
            seen[item] = 1;
            out[j++] = item;
        }
    }

    return out;
}
