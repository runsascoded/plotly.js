export default function incrementNumeric(x: number, delta: number): number {
    if(!delta) return x;

    // Note 1:
    // 0.3 != 0.1 + 0.2 == 0.30000000000000004
    // but 0.3 == (10 * 0.1 + 10 * 0.2) / 10
    // Attempt to use integer steps to increment
    const scale = 1 / Math.abs(delta);
    let newX = (scale > 1) ? (
        scale * x +
        scale * delta
    ) / scale : x + delta;

    // Note 2:
    // now we may also consider rounding to cover few more edge cases
    // e.g. 0.3 * 3 = 0.8999999999999999
    const lenX1 = String(newX).length;
    if(lenX1 > 16) {
        const lenDt = String(delta).length;
        const lenX0 = String(x).length;

        if(lenX1 >= lenX0 + lenDt) { // likely a rounding error!
            const s = parseFloat(newX as any).toPrecision(12);
            if(s.indexOf('e+') === -1) newX = +s;
        }
    }

    return newX;
}
