import Lib from '../../lib/index.js';
import constants from './constants.js';
import isNumeric from 'fast-isnumeric';
import Axes from '../../plots/cartesian/axes.js';
import _index from '../../lib/index.js';
const { maxRowLength } = _index;
import { getImageSize } from './helpers.js';
export default function calc(gd, trace) {
    let h;
    let w;
    if (trace._hasZ) {
        h = trace.z.length;
        w = maxRowLength(trace.z);
    }
    else if (trace._hasSource) {
        const size = getImageSize(trace.source);
        h = size.height;
        w = size.width;
    }
    const xa = Axes.getFromId(gd, trace.xaxis || 'x');
    const ya = Axes.getFromId(gd, trace.yaxis || 'y');
    const x0 = xa.d2c(trace.x0) - trace.dx / 2;
    const y0 = ya.d2c(trace.y0) - trace.dy / 2;
    // Set axis range
    let i;
    const xrange = [x0, x0 + w * trace.dx];
    const yrange = [y0, y0 + h * trace.dy];
    if (xa && xa.type === 'log')
        for (i = 0; i < w; i++)
            xrange.push(x0 + i * trace.dx);
    if (ya && ya.type === 'log')
        for (i = 0; i < h; i++)
            yrange.push(y0 + i * trace.dy);
    trace._extremes[xa._id] = Axes.findExtremes(xa, xrange);
    trace._extremes[ya._id] = Axes.findExtremes(ya, yrange);
    trace._scaler = makeScaler(trace);
    const cd0 = {
        x0: x0,
        y0: y0,
        z: trace.z,
        w: w,
        h: h
    };
    return [cd0];
}
function scale(zero, ratio, min, max) {
    return function (c) {
        return Lib.constrain((c - zero) * ratio, min, max);
    };
}
function constrain(min, max) {
    return function (c) { return Lib.constrain(c, min, max); };
}
// Generate a function to scale color components according to zmin/zmax and the colormodel
function makeScaler(trace) {
    const cr = constants.colormodel[trace.colormodel];
    const colormodel = (cr.colormodel || trace.colormodel);
    const n = colormodel.length;
    trace._sArray = [];
    // Loop over all color components
    for (let k = 0; k < n; k++) {
        if (cr.min[k] !== trace.zmin[k] || cr.max[k] !== trace.zmax[k]) {
            trace._sArray.push(scale(trace.zmin[k], (cr.max[k] - cr.min[k]) / (trace.zmax[k] - trace.zmin[k]), cr.min[k], cr.max[k]));
        }
        else {
            trace._sArray.push(constrain(cr.min[k], cr.max[k]));
        }
    }
    return function (pixel) {
        const c = pixel.slice(0, n);
        for (let k = 0; k < n; k++) {
            const ck = c[k];
            if (!isNumeric(ck))
                return false;
            c[k] = trace._sArray[k](ck);
        }
        return c;
    };
}
