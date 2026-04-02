export default function doAvg(size: number[], counts: number[]): number {
    const nMax = size.length;
    let total = 0;
    for(let i = 0; i < nMax; i++) {
        if(counts[i]) {
            size[i] /= counts[i];
            total += size[i];
        } else size[i] = null as any;
    }
    return total;
}
