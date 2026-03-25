import colorscaleCalc from '../../components/colorscale/calc.js';
import { processGrid } from '../streamtube/calc.js';
import { filter } from '../streamtube/calc.js';

export default function calc(gd, trace) {
    trace._len = Math.min(
        trace.x.length,
        trace.y.length,
        trace.z.length,
        trace.value.length
    );

    trace._x = filter(trace.x, trace._len);
    trace._y = filter(trace.y, trace._len);
    trace._z = filter(trace.z, trace._len);
    trace._value = filter(trace.value, trace._len);

    var grid = processGrid(trace);
    trace._gridFill = grid.fill;
    trace._Xs = grid.Xs;
    trace._Ys = grid.Ys;
    trace._Zs = grid.Zs;
    trace._len = grid.len;

    var min = Infinity;
    var max = -Infinity;
    for(var i = 0; i < trace._len; i++) {
        var v = trace._value[i];
        min = Math.min(min, v);
        max = Math.max(max, v);
    }

    trace._minValues = min;
    trace._maxValues = max;
    trace._vMin = (trace.isomin === undefined || trace.isomin === null) ? min : trace.isomin;
    trace._vMax = (trace.isomax === undefined || trace.isomax === null) ? max : trace.isomax;

    colorscaleCalc(gd, trace, {
        vals: [trace._vMin, trace._vMax],
        containerStr: '',
        cLetter: 'c'
    });
}
