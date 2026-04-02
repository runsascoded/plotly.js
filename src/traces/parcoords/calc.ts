import type { FullTrace, GraphDiv } from '../../../types/core';
import _index from '../../lib/index.js';
const { isArrayOrTypedArray } = _index;
import Colorscale from '../../components/colorscale/index.js';
import _gup from '../../lib/gup.js';
const { wrap } = _gup;

export default function calc(gd: GraphDiv, trace: FullTrace) {
    let lineColor;
    let cscale;

    if(Colorscale.hasColorscale(trace, 'line') && isArrayOrTypedArray(trace.line.color)) {
        lineColor = trace.line.color;
        cscale = Colorscale.extractOpts(trace.line).colorscale;

        Colorscale.calc(gd, trace, {
            vals: lineColor,
            containerStr: 'line',
            cLetter: 'c'
        });
    } else {
        lineColor = constHalf(trace._length);
        cscale = [[0, trace.line.color], [1, trace.line.color]];
    }

    return wrap({lineColor: lineColor, cscale: cscale});
}

function constHalf(len) {
    const out = new Array(len);
    for(let i = 0; i < len; i++) {
        out[i] = 0.5;
    }
    return out;
}
