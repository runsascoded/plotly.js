import Fx from '../../components/fx/index.js';
import Lib from '../../lib/index.js';
import constants from './constants.js';
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;
export default function hoverPoints(pointData, xval, yval) {
    const cd0 = pointData.cd[0];
    const trace = cd0.trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    // Return early if not on image
    if (Fx.inbox(xval - cd0.x0, xval - (cd0.x0 + cd0.w * trace.dx), 0) > 0 ||
        Fx.inbox(yval - cd0.y0, yval - (cd0.y0 + cd0.h * trace.dy), 0) > 0) {
        return;
    }
    // Find nearest pixel's index
    const nx = Math.floor((xval - cd0.x0) / trace.dx);
    const ny = Math.floor(Math.abs(yval - cd0.y0) / trace.dy);
    let pixel;
    if (trace._hasZ) {
        pixel = cd0.z[ny][nx];
    }
    else if (trace._hasSource) {
        pixel = trace._canvas.el.getContext('2d', { willReadFrequently: true }).getImageData(nx, ny, 1, 1).data;
    }
    // return early if pixel is undefined
    if (!pixel)
        return;
    const hoverinfo = cd0.hi || trace.hoverinfo;
    let fmtColor;
    if (hoverinfo) {
        let parts = hoverinfo.split('+');
        if (parts.indexOf('all') !== -1)
            parts = ['color'];
        if (parts.indexOf('color') !== -1)
            fmtColor = true;
    }
    const cr = constants.colormodel[trace.colormodel];
    const colormodel = cr.colormodel || trace.colormodel;
    const dims = colormodel.length;
    const c = trace._scaler(pixel);
    const s = cr.suffix;
    let colorstring = [];
    if (trace.hovertemplate || fmtColor) {
        colorstring.push('[' + [c[0] + s[0], c[1] + s[1], c[2] + s[2]].join(', '));
        if (dims === 4)
            colorstring.push(', ' + c[3] + s[3]);
        colorstring.push(']');
        colorstring = colorstring.join('');
        pointData.extraText = colormodel.toUpperCase() + ': ' + colorstring;
    }
    let text;
    if (isArrayOrTypedArray(trace.hovertext) && isArrayOrTypedArray(trace.hovertext[ny])) {
        text = trace.hovertext[ny][nx];
    }
    else if (isArrayOrTypedArray(trace.text) && isArrayOrTypedArray(trace.text[ny])) {
        text = trace.text[ny][nx];
    }
    // TODO: for color model with 3 dims, display something useful for hovertemplate `%{color[3]}`
    const py = ya.c2p(cd0.y0 + (ny + 0.5) * trace.dy);
    const xVal = cd0.x0 + (nx + 0.5) * trace.dx;
    const yVal = cd0.y0 + (ny + 0.5) * trace.dy;
    const zLabel = '[' + pixel.slice(0, trace.colormodel.length).join(', ') + ']';
    return [Lib.extendFlat(pointData, {
            index: [ny, nx],
            x0: xa.c2p(cd0.x0 + nx * trace.dx),
            x1: xa.c2p(cd0.x0 + (nx + 1) * trace.dx),
            y0: py,
            y1: py,
            color: c,
            xVal: xVal,
            xLabelVal: xVal,
            yVal: yVal,
            yLabelVal: yVal,
            zLabelVal: zLabel,
            text: text,
            hovertemplateLabels: {
                zLabel: zLabel,
                colorLabel: colorstring,
                'color[0]Label': c[0] + s[0],
                'color[1]Label': c[1] + s[1],
                'color[2]Label': c[2] + s[2],
                'color[3]Label': c[3] + s[3]
            }
        })];
}
