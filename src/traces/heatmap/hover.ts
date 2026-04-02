import Fx from '../../components/fx/index.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import _index from '../../components/colorscale/index.js';
const { extractOpts } = _index;
const isArrayOrTypedArray = Lib.isArrayOrTypedArray;

export default function hoverPoints(pointData: any,  xval: any,  yval: any,  hovermode: any,  opts: any) {
    if(!opts) opts = {};
    const isContour = opts.isContour;

    const cd0 = pointData.cd[0];
    const trace = cd0.trace;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const x = cd0.x;
    const y = cd0.y;
    const z = cd0.z;
    const xc = cd0.xCenter;
    const yc = cd0.yCenter;
    const zmask = cd0.zmask;
    const zhoverformat = trace.zhoverformat;
    let x2 = x;
    let y2 = y;

    let xl, yl, nx, ny;

    if(pointData.index !== false) {
        try {
            nx = Math.round(pointData.index[1]);
            ny = Math.round(pointData.index[0]);
        } catch(e) {
            Lib.error('Error hovering on heatmap, ' +
                'pointNumber must be [row,col], found:', pointData.index);
            return;
        }
        if(nx < 0 || nx >= z[0].length || ny < 0 || ny > z.length) {
            return;
        }
    } else if(Fx.inbox(xval - x[0], xval - x[x.length - 1], 0) > 0 ||
            Fx.inbox(yval - y[0], yval - y[y.length - 1], 0) > 0) {
        return;
    } else {
        if(isContour) {
            let i2;
            x2 = [2 * x[0] - x[1]];

            for(i2 = 1; i2 < x.length; i2++) {
                x2.push((x[i2] + x[i2 - 1]) / 2);
            }
            x2.push([2 * x[x.length - 1] - x[x.length - 2]]);

            y2 = [2 * y[0] - y[1]];
            for(i2 = 1; i2 < y.length; i2++) {
                y2.push((y[i2] + y[i2 - 1]) / 2);
            }
            y2.push([2 * y[y.length - 1] - y[y.length - 2]]);
        }
        nx = Math.max(0, Math.min(x2.length - 2, Lib.findBin(xval, x2)));
        ny = Math.max(0, Math.min(y2.length - 2, Lib.findBin(yval, y2)));
    }

    let x0 = xa.c2p(x[nx]);
    let x1 = xa.c2p(x[nx + 1]);
    let y0 = ya.c2p(y[ny]);
    let y1 = ya.c2p(y[ny + 1]);

    let _x, _y;
    if(isContour) {
        _x = cd0.orig_x || x;
        _y = cd0.orig_y || y;

        x1 = x0;
        xl = _x[nx];
        y1 = y0;
        yl = _y[ny];
    } else {
        _x = cd0.orig_x || xc || x;
        _y = cd0.orig_y || yc || y;

        xl = xc ? _x[nx] : ((_x[nx] + _x[nx + 1]) / 2);
        yl = yc ? _y[ny] : ((_y[ny] + _y[ny + 1]) / 2);

        if(xa && xa.type === 'category') xl = x[nx];
        if(ya && ya.type === 'category') yl = y[ny];

        if(trace.zsmooth) {
            x0 = x1 = xa.c2p(xl);
            y0 = y1 = ya.c2p(yl);
        }
    }

    let zVal = z[ny][nx];
    if(zmask && !zmask[ny][nx]) zVal = undefined;

    if(zVal === undefined && !trace.hoverongaps) return;

    let text;
    if(isArrayOrTypedArray(cd0.hovertext) && isArrayOrTypedArray(cd0.hovertext[ny])) {
        text = cd0.hovertext[ny][nx];
    } else if(isArrayOrTypedArray(cd0.text) && isArrayOrTypedArray(cd0.text[ny])) {
        text = cd0.text[ny][nx];
    }

    // dummy axis for formatting the z value
    const cOpts = extractOpts(trace);
    const dummyAx = {
        type: 'linear',
        range: [cOpts.min, cOpts.max],
        hoverformat: zhoverformat,
        _separators: xa._separators,
        _numFormat: xa._numFormat
    };
    const zLabel = Axes.tickText(dummyAx, zVal, 'hover').text;

    return [Lib.extendFlat(pointData, {
        index: trace._after2before ? trace._after2before[ny][nx] : [ny, nx],
        // never let a 2D override 1D type as closest point
        distance: pointData.maxHoverDistance,
        spikeDistance: pointData.maxSpikeDistance,
        x0: x0,
        x1: x1,
        y0: y0,
        y1: y1,
        xLabelVal: xl,
        yLabelVal: yl,
        zLabelVal: zVal,
        zLabel: zLabel,
        text: text
    })];
}
