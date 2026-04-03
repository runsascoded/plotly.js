function calc(gd, trace) {
    const cd = [];
    const lastReading = trace.value;
    if (!(typeof trace._lastValue === 'number'))
        trace._lastValue = trace.value;
    const secondLastReading = trace._lastValue;
    let deltaRef = secondLastReading;
    if (trace._hasDelta && typeof trace.delta.reference === 'number') {
        deltaRef = trace.delta.reference;
    }
    cd[0] = {
        y: lastReading,
        lastY: secondLastReading,
        delta: lastReading - deltaRef,
        relativeDelta: (lastReading - deltaRef) / deltaRef,
    };
    return cd;
}
export default {
    calc: calc
};
