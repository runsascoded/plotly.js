import type { FullAxis } from '../../../types/core';
import Axes from '../../plots/cartesian/axes.js';
import Lib from '../../lib/index.js';
import Fx from '../../components/fx/index.js';
import Color from '../../components/color/index.js';
const fillText = Lib.fillText;

function hoverPoints(pointData: any, xval: number, yval: number, hovermode: any): any[] {
    const cd = pointData.cd;
    const trace = cd[0].trace;
    const hoveron = trace.hoveron;
    let closeBoxData: any[] = [];
    let closePtData;

    if(hoveron.indexOf('boxes') !== -1) {
        closeBoxData = closeBoxData.concat((hoverOnBoxes(pointData, xval, yval, hovermode) as any));
    }

    if(hoveron.indexOf('points') !== -1) {
        closePtData = hoverOnPoints(pointData, xval, yval);
    }

    // If there's a point in range and hoveron has points, show the best single point only.
    // If hoveron has boxes and there's no point in range (or hoveron doesn't have points), show the box stats.
    if(hovermode === 'closest') {
        if(closePtData) return [closePtData];
        return closeBoxData;
    }

    // Otherwise in compare mode, allow a point AND the box stats to be labeled
    // If there are multiple boxes in range (ie boxmode = 'overlay') we'll see stats for all of them.
    if(closePtData) {
        closeBoxData.push(closePtData);
        return closeBoxData;
    }
    return closeBoxData;
}

function hoverOnBoxes(pointData: any, xval: number, yval: number, hovermode: any): any[] {
    const cd = pointData.cd;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const trace = cd[0].trace;
    const t = cd[0].t;
    const isViolin = trace.type === 'violin';

    let pLetter, vLetter, pAxis: any, vAxis, vVal: any, pVal: any, dx: any, dy: any, dPos,
        hoverPseudoDistance: any, spikePseudoDistance;

    const boxDelta = t.bdPos;
    let boxDeltaPos, boxDeltaNeg;
    const posAcceptance = t.wHover;
    const shiftPos = function(di: any) { return pAxis.c2l(di.pos) + t.bPos - pAxis.c2l(pVal); };

    if(isViolin && trace.side !== 'both') {
        if(trace.side === 'positive') {
            dPos = function(di: any) {
                const pos = shiftPos(di);
                return Fx.inbox(pos, pos + posAcceptance, hoverPseudoDistance);
            };
            boxDeltaPos = boxDelta;
            boxDeltaNeg = 0;
        }
        if(trace.side === 'negative') {
            dPos = function(di: any) {
                const pos = shiftPos(di);
                return Fx.inbox(pos - posAcceptance, pos, hoverPseudoDistance);
            };
            boxDeltaPos = 0;
            boxDeltaNeg = boxDelta;
        }
    } else {
        dPos = function(di: any) {
            const pos = shiftPos(di);
            return Fx.inbox(pos - posAcceptance, pos + posAcceptance, hoverPseudoDistance);
        };
        boxDeltaPos = boxDeltaNeg = boxDelta;
    }

    let dVal;

    if(isViolin) {
        dVal = function(di: any) {
            return Fx.inbox(di.span[0] - vVal, di.span[1] - vVal, hoverPseudoDistance);
        };
    } else {
        dVal = function(di: any) {
            return Fx.inbox(di.min - vVal, di.max - vVal, hoverPseudoDistance);
        };
    }

    if(trace.orientation === 'h') {
        vVal = xval;
        pVal = yval;
        dx = dVal;
        dy = dPos;
        pLetter = 'y';
        pAxis = ya;
        vLetter = 'x';
        vAxis = xa;
    } else {
        vVal = yval;
        pVal = xval;
        dx = dPos;
        dy = dVal;
        pLetter = 'x';
        pAxis = xa;
        vLetter = 'y';
        vAxis = ya;
    }

    // if two boxes are overlaying, let the narrowest one win
    const pseudoDistance = Math.min(1, boxDelta / Math.abs(pAxis.r2c(pAxis.range[1]) - pAxis.r2c(pAxis.range[0])));
    hoverPseudoDistance = pointData.maxHoverDistance - pseudoDistance;
    spikePseudoDistance = pointData.maxSpikeDistance - pseudoDistance;

    function dxy(di: any) { return (dx(di) + dy(di)) / 2; }
    const distfn = Fx.getDistanceFunction(hovermode, dx, dy, dxy);
    Fx.getClosest(cd, distfn, pointData);

    // skip the rest (for this trace) if we didn't find a close point
    // and create the item(s) in closedata for this point
    if(pointData.index === false) return [];

    const di = cd[pointData.index];
    const lc = trace.line.color;
    const mc = (trace.marker || {}).color;

    if(Color.opacity(lc) && trace.line.width) pointData.color = lc;
    else if(Color.opacity(mc) && trace.boxpoints) pointData.color = mc;
    else pointData.color = trace.fillcolor;

    pointData[pLetter + '0'] = pAxis.c2p(di.pos + t.bPos - boxDeltaNeg, true);
    pointData[pLetter + '1'] = pAxis.c2p(di.pos + t.bPos + boxDeltaPos, true);

    pointData[pLetter + 'LabelVal'] = di.orig_p !== undefined ? di.orig_p : di.pos;

    const spikePosAttr = pLetter + 'Spike';
    pointData.spikeDistance = dxy(di) * spikePseudoDistance / hoverPseudoDistance;
    pointData[spikePosAttr] = pAxis.c2p(di.pos, true);

    const hasMean = trace.boxmean || (trace.sizemode === 'sd') || (trace.meanline || {}).visible;
    const hasFences = trace.boxpoints || trace.points;

    // labels with equal values (e.g. when min === q1) should still be presented in the order they have when they're unequal
    const attrs =
        (hasFences && hasMean) ? ['max', 'uf', 'q3', 'med', 'mean', 'q1', 'lf', 'min'] :
        (hasFences && !hasMean) ? ['max', 'uf', 'q3', 'med', 'q1', 'lf', 'min'] :
        (!hasFences && hasMean) ? ['max', 'q3', 'med', 'mean', 'q1', 'min'] :
        ['max', 'q3', 'med', 'q1', 'min'];

    const rev = vAxis.range[1] < vAxis.range[0];

    if(trace.orientation === (rev ? 'v' : 'h')) {
        attrs.reverse();
    }

    const spikeDistance = pointData.spikeDistance;
    const spikePosition = pointData[spikePosAttr];

    const closeBoxData: any[] = [];
    for(let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];

        if(!(attr in di)) continue;

        // copy out to a new object for each value to label
        const val = di[attr];
        const valPx = vAxis.c2p(val, true);
        const pointData2 = Lib.extendFlat({}, pointData);

        pointData2.attr = attr;
        pointData2[vLetter + '0'] = pointData2[vLetter + '1'] = valPx;
        pointData2[vLetter + 'LabelVal'] = val;
        pointData2[vLetter + 'Label'] = (t.labels ? t.labels[attr] + ' ' : '') + Axes.hoverLabelText(vAxis, val, trace[vLetter + 'hoverformat']);

        // Note: introduced to be able to distinguish a
        // clicked point from a box during click-to-select
        pointData2.hoverOnBox = true;

        if(attr === 'mean' && ('sd' in di) && ((trace.boxmean === 'sd') || (trace.sizemode === 'sd'))) {
            pointData2[vLetter + 'err'] = di.sd;
        }

        // no hovertemplate support yet
        pointData2.hovertemplate = false;

        closeBoxData.push(pointData2);
    }

    // only keep name and spikes on the median
    pointData.name = '';
    pointData.spikeDistance = undefined;
    pointData[spikePosAttr] = undefined;
    for(let k = 0; k < closeBoxData.length; k++) {
        if((closeBoxData[k] as any).attr !== 'med') {
            (closeBoxData[k] as any).name = '';
            (closeBoxData[k] as any).spikeDistance = undefined;
            closeBoxData[k][spikePosAttr] = undefined;
        } else {
            (closeBoxData[k] as any).spikeDistance = spikeDistance;
            closeBoxData[k][spikePosAttr] = spikePosition;
        }
    }

    return closeBoxData;
}

function hoverOnPoints(pointData: any, xval: number, yval: number): any {
    const cd = pointData.cd;
    const xa = pointData.xa;
    const ya = pointData.ya;
    const trace = cd[0].trace;
    const xPx = xa.c2p(xval);
    const yPx = ya.c2p(yval);
    let closePtData;

    const dx = function(di: any) {
        const rad = Math.max(3, di.mrc || 0);
        return Math.max(Math.abs(xa.c2p(di.x) - xPx) - rad, 1 - 3 / rad);
    };
    const dy = function(di: any) {
        const rad = Math.max(3, di.mrc || 0);
        return Math.max(Math.abs(ya.c2p(di.y) - yPx) - rad, 1 - 3 / rad);
    };
    const distfn = Fx.quadrature(dx, dy);

    // show one point per trace
    let ijClosest: false | [number, number] = false;
    let di, pt;

    for(let i = 0; i < cd.length; i++) {
        di = cd[i];

        for(let j = 0; j < (di.pts || []).length; j++) {
            pt = di.pts[j];

            const newDistance = distfn(pt);
            if(newDistance <= pointData.distance) {
                pointData.distance = newDistance;
                ijClosest = [i, j];
            }
        }
    }

    if(!ijClosest) return false;

    di = cd[ijClosest[0]];
    pt = di.pts[ijClosest[1]];

    const xc = xa.c2p(pt.x, true);
    const yc = ya.c2p(pt.y, true);
    const rad = pt.mrc || 1;

    closePtData = Lib.extendFlat({}, pointData, {
        // corresponds to index in x/y input data array
        index: pt.i,
        color: (trace.marker || {}).color,
        name: trace.name,
        x0: xc - rad,
        x1: xc + rad,
        y0: yc - rad,
        y1: yc + rad,
        spikeDistance: pointData.distance,
        hovertemplate: trace.hovertemplate
    });

    const origPos = di.orig_p;
    const pos = origPos !== undefined ? origPos : di.pos;
    let pa;
    if(trace.orientation === 'h') {
        pa = ya;
        closePtData.xLabelVal = pt.x;
        closePtData.yLabelVal = pos;
    } else {
        pa = xa;
        closePtData.xLabelVal = pos;
        closePtData.yLabelVal = pt.y;
    }

    const pLetter = pa._id.charAt(0);
    closePtData[pLetter + 'Spike'] = pa.c2p(di.pos, true);

    fillText(pt, trace, closePtData);

    return closePtData;
}

export default {
    hoverPoints: hoverPoints,
    hoverOnBoxes: hoverOnBoxes,
    hoverOnPoints: hoverOnPoints
};
