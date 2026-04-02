import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import Fx from '../../components/fx/index.js';
import Color from '../../components/color/index.js';
import _index from '../../lib/index.js';
const { fillText } = _index;
import delta from '../../constants/delta.js';

const DIRSYMBOL: any = {
    increasing: delta.INCREASING.SYMBOL,
    decreasing: delta.DECREASING.SYMBOL
};

function hoverPoints(pointData: any,  xval: any,  yval: any,  hovermode: any) {
    const cd = pointData.cd;
    const trace = cd[0].trace;

    if(trace.hoverlabel.split) {
        return hoverSplit(pointData, xval, yval, hovermode);
    }

    return hoverOnPoints(pointData, xval, yval, hovermode);
}

function _getClosestPoint(pointData: any,  xval: any,  yval: any,  hovermode: any) {
    const cd = pointData.cd;
    const xa = pointData.xa;
    const trace = cd[0].trace;
    const t = cd[0].t;

    const type = trace.type;
    const minAttr = type === 'ohlc' ? 'l' : 'min';
    const maxAttr = type === 'ohlc' ? 'h' : 'max';

    let hoverPseudoDistance: any, spikePseudoDistance;

    // potentially shift xval for grouped candlesticks
    const centerShift = t.bPos || 0;
    const shiftPos = function(di: any) { return di.pos + centerShift - xval; };

    // ohlc and candlestick call displayHalfWidth different things...
    const displayHalfWidth = t.bdPos || t.tickLen;
    const hoverHalfWidth = t.wHover;

    // if two figures are overlaying, let the narrowest one win
    const pseudoDistance = Math.min(1, displayHalfWidth / Math.abs(xa.r2c(xa.range[1]) - xa.r2c(xa.range[0])));
    hoverPseudoDistance = pointData.maxHoverDistance - pseudoDistance;
    spikePseudoDistance = pointData.maxSpikeDistance - pseudoDistance;

    function dx(di: any) {
        const pos = shiftPos(di);
        return Fx.inbox(pos - hoverHalfWidth, pos + hoverHalfWidth, hoverPseudoDistance);
    }

    function dy(di: any) {
        const min = di[minAttr];
        const max = di[maxAttr];
        return (min === max || Fx.inbox(min - yval, max - yval, hoverPseudoDistance)) as any;
    }

    function dxy(di: any) { return (dx(di) + dy(di)) / 2; }

    const distfn = Fx.getDistanceFunction(hovermode, dx, dy, dxy);
    Fx.getClosest(cd, distfn, pointData);

    if(pointData.index === false) return null;

    const di = cd[pointData.index];

    if(di.empty) return null;

    const dir = di.dir;
    const container = trace[dir];
    const lc = container.line.color;

    if(Color.opacity(lc) && container.line.width) pointData.color = lc;
    else pointData.color = container.fillcolor;

    pointData.x0 = xa.c2p(di.pos + centerShift - displayHalfWidth, true);
    pointData.x1 = xa.c2p(di.pos + centerShift + displayHalfWidth, true);

    pointData.xLabelVal = di.orig_p !== undefined ? di.orig_p : di.pos;

    pointData.spikeDistance = dxy(di) * spikePseudoDistance / hoverPseudoDistance;
    pointData.xSpike = xa.c2p(di.pos, true);

    return pointData;
}

function hoverSplit(pointData: any,  xval: any,  yval: any,  hovermode: any) {
    const cd = pointData.cd;
    const ya = pointData.ya;
    const trace = cd[0].trace;
    const t = cd[0].t;
    const closeBoxData: any[] = [];

    const closestPoint = _getClosestPoint(pointData, xval, yval, hovermode);
    // skip the rest (for this trace) if we didn't find a close point
    if(!closestPoint) return [];

    const di = cd[closestPoint.index];
    const hoverinfo = di.hi || trace.hoverinfo || '';

    // If hoverinfo is 'none' or 'skip', we don't show any hover labels
    if (hoverinfo === 'none' || hoverinfo === 'skip') return [];

    const attrs = ['high', 'open', 'close', 'low'];

    // several attributes can have the same y-coordinate. We will
    // bunch them together in a single text block. For this, we keep
    // a dictionary mapping y-coord -> point data.
    const usedVals: any = {};

    for(let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];

        const val = trace[attr][closestPoint.index];
        const valPx = ya.c2p(val, true);
        let pointData2;
        if(val in usedVals) {
            pointData2 = usedVals[val];
            pointData2.yLabel += '<br>' + t.labels[attr] + Axes.hoverLabelText(ya, val, trace.yhoverformat);
        } else {
            // copy out to a new object for each new y-value to label
            pointData2 = Lib.extendFlat({}, closestPoint);

            pointData2.y0 = pointData2.y1 = valPx;
            pointData2.yLabelVal = val;
            pointData2.yLabel = t.labels[attr] + Axes.hoverLabelText(ya, val, trace.yhoverformat);

            pointData2.name = '';

            closeBoxData.push(pointData2);
            usedVals[val] = pointData2;
        }
    }

    return closeBoxData;
}

function hoverOnPoints(pointData: any,  xval: any,  yval: any,  hovermode: any) {
    const cd = pointData.cd;
    const ya = pointData.ya;
    const trace = cd[0].trace;
    const t = cd[0].t;

    const closestPoint = _getClosestPoint(pointData, xval, yval, hovermode);
    // skip the rest (for this trace) if we didn't find a close point
    if(!closestPoint) return [];

    // we don't make a calcdata point if we're missing any piece (x/o/h/l/c)
    // so we need to fix the index here to point to the data arrays
    const cdIndex = closestPoint.index;
    const di = cd[cdIndex];
    const i = closestPoint.index = di.i;
    const dir = di.dir;

    function getLabelLine(attr: any) {
        return t.labels[attr] + Axes.hoverLabelText(ya, trace[attr][i], trace.yhoverformat);
    }

    const hoverinfo = di.hi || trace.hoverinfo || '';
    const hoverParts = hoverinfo.split('+');
    const isAll = hoverinfo === 'all';
    const hasY = isAll || hoverParts.indexOf('y') !== -1;
    const hasText = isAll || hoverParts.indexOf('text') !== -1;

    const textParts = hasY ? [
        getLabelLine('open'),
        getLabelLine('high'),
        getLabelLine('low'),
        getLabelLine('close') + '  ' + DIRSYMBOL[dir]
    ] : [];
    if(hasText) fillText(di, trace, textParts);

    // don't make .yLabelVal or .text, since we're managing hoverinfo
    // put it all in .extraText
    closestPoint.extraText = textParts.join('<br>');

    // this puts the label *and the spike* at the midpoint of the box, ie
    // halfway between open and close, not between high and low.
    closestPoint.y0 = closestPoint.y1 = ya.c2p(di.yc, true);

    return [closestPoint];
}

export default {
    hoverPoints: hoverPoints,
    hoverSplit: hoverSplit,
    hoverOnPoints: hoverOnPoints
};
