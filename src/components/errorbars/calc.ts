import type { GraphDiv, FullAxis, FullTrace } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import Registry from '../../registry.js';
import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import makeComputeError from './compute_error.js';

export default function calc(gd: GraphDiv): void {
    const calcdata = gd.calcdata;

    for(let i = 0; i < calcdata.length; i++) {
        const calcTrace = calcdata[i];
        const trace = calcTrace[0].trace;

        if(trace.visible === true && Registry.traceIs(trace, 'errorBarsOK')) {
            const xa = Axes.getFromId(gd, trace.xaxis);
            const ya = Axes.getFromId(gd, trace.yaxis);
            calcOneAxis(calcTrace, trace, xa, 'x');
            calcOneAxis(calcTrace, trace, ya, 'y');
        }
    }
}

function calcOneAxis(calcTrace: any[], trace: FullTrace, axis: FullAxis, coord: string): void {
    const opts = trace['error_' + coord] || {};
    const isVisible = (opts.visible && ['linear', 'log'].indexOf(axis.type) !== -1);
    const vals: number[] = [];

    if(!isVisible) return;

    const computeError = makeComputeError(opts);

    for(let i = 0; i < calcTrace.length; i++) {
        const calcPt = calcTrace[i];

        let iIn = calcPt.i;

        if(iIn === undefined) iIn = i;
        else if(iIn === null) continue;

        const calcCoord = calcPt[coord];

        if(!isNumeric(axis.c2l(calcCoord))) continue;

        const errors = computeError(calcCoord, iIn);
        if(isNumeric(errors[0]) && isNumeric(errors[1])) {
            const shoe = calcPt[coord + 's'] = calcCoord - errors[0];
            const hat = calcPt[coord + 'h'] = calcCoord + errors[1];
            vals.push(shoe, hat);
        }
    }

    const axId = axis._id;
    const baseExtremes = trace._extremes[axId];
    const extremes = Axes.findExtremes(
        axis,
        vals,
        Lib.extendFlat({tozero: baseExtremes.opts.tozero}, {padded: true})
    );
    baseExtremes.min = baseExtremes.min.concat(extremes.min);
    baseExtremes.max = baseExtremes.max.concat(extremes.max);
}
