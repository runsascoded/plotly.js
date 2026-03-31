import isNumeric from 'fast-isnumeric';
import Registry from '../../registry.js';
import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import makeComputeError from './compute_error.js';

export default function calc(gd: any): void {
    var calcdata = gd.calcdata;

    for(var i = 0; i < calcdata.length; i++) {
        var calcTrace = calcdata[i];
        var trace = calcTrace[0].trace;

        if(trace.visible === true && Registry.traceIs(trace, 'errorBarsOK')) {
            var xa = Axes.getFromId(gd, trace.xaxis);
            var ya = Axes.getFromId(gd, trace.yaxis);
            calcOneAxis(calcTrace, trace, xa, 'x');
            calcOneAxis(calcTrace, trace, ya, 'y');
        }
    }
}

function calcOneAxis(calcTrace: any[], trace: any, axis: any, coord: string): void {
    var opts = trace['error_' + coord] || {};
    var isVisible = (opts.visible && ['linear', 'log'].indexOf(axis.type) !== -1);
    var vals: number[] = [];

    if(!isVisible) return;

    var computeError = makeComputeError(opts);

    for(var i = 0; i < calcTrace.length; i++) {
        var calcPt = calcTrace[i];

        var iIn = calcPt.i;

        if(iIn === undefined) iIn = i;
        else if(iIn === null) continue;

        var calcCoord = calcPt[coord];

        if(!isNumeric(axis.c2l(calcCoord))) continue;

        var errors = computeError(calcCoord, iIn);
        if(isNumeric(errors[0]) && isNumeric(errors[1])) {
            var shoe = calcPt[coord + 's'] = calcCoord - errors[0];
            var hat = calcPt[coord + 'h'] = calcCoord + errors[1];
            vals.push(shoe, hat);
        }
    }

    var axId = axis._id;
    var baseExtremes = trace._extremes[axId];
    var extremes = Axes.findExtremes(
        axis,
        vals,
        Lib.extendFlat({tozero: baseExtremes.opts.tozero}, {padded: true})
    );
    baseExtremes.min = baseExtremes.min.concat(extremes.min);
    baseExtremes.max = baseExtremes.max.concat(extremes.max);
}
