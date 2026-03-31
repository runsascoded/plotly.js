import type { FullTrace, GraphDiv } from '../../../types/core';

function calc(gd: GraphDiv, trace: FullTrace) {
    var cd = [];

    var lastReading = trace.value;
    if(!(typeof trace._lastValue === 'number')) trace._lastValue = trace.value;
    var secondLastReading = trace._lastValue;
    var deltaRef = secondLastReading;
    if(trace._hasDelta && typeof trace.delta.reference === 'number') {
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
