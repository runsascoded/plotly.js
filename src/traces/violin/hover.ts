import type { FullAxis } from '../../../types/core';
import Color from '../../components/color/index.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import boxHoverPoints from '../box/hover.js';
import helpers from './helpers.js';

export default function hoverPoints(pointData: any, xval: number, yval: number, hovermode: any, opts?: any): any[] {
    if(!opts) opts = {};
    const hoverLayer = opts.hoverLayer;

    const cd = pointData.cd;
    const trace = cd[0].trace;
    const hoveron = trace.hoveron;
    const hasHoveronViolins = hoveron.indexOf('violins') !== -1;
    const hasHoveronKDE = hoveron.indexOf('kde') !== -1;
    let closeData: any[] = [];
    let closePtData;
    let violinLineAttrs;

    if(hasHoveronViolins || hasHoveronKDE) {
        const closeBoxData = boxHoverPoints.hoverOnBoxes(pointData, xval, yval, hovermode);

        if(hasHoveronKDE && closeBoxData.length > 0) {
            const xa = pointData.xa;
            const ya = pointData.ya;
            let pLetter, vLetter, pAxis, vAxis, vVal;

            if(trace.orientation === 'h') {
                vVal = xval;
                pLetter = 'y';
                pAxis = ya;
                vLetter = 'x';
                vAxis = xa;
            } else {
                vVal = yval;
                pLetter = 'x';
                pAxis = xa;
                vLetter = 'y';
                vAxis = ya;
            }

            const di = cd[pointData.index];

            if(vVal >= di.span[0] && vVal <= di.span[1]) {
                const kdePointData = Lib.extendFlat({}, pointData);
                const vValPx = vAxis.c2p(vVal, true);
                const kdeVal = helpers.getKdeValue(di, trace, vVal);
                const pOnPath = helpers.getPositionOnKdePath(di, trace, vValPx);
                const paOffset = pAxis._offset;
                const paLength = pAxis._length;

                kdePointData[pLetter + '0'] = pOnPath[0];
                kdePointData[pLetter + '1'] = pOnPath[1];
                kdePointData[vLetter + '0'] = kdePointData[vLetter + '1'] = vValPx;
                kdePointData[vLetter + 'Label'] = vLetter + ': ' + Axes.hoverLabelText(vAxis, vVal, trace[vLetter + 'hoverformat']) + ', ' + cd[0].t.labels.kde + ' ' + kdeVal.toFixed(3);

                // move the spike to the KDE point
                let medId = 0;
                for(let k = 0; k < closeBoxData.length; k++) {
                    if(closeBoxData[k].attr === 'med') {
                        medId = k;
                        break;
                    }
                }

                kdePointData.spikeDistance = closeBoxData[medId].spikeDistance;
                const spikePosAttr = pLetter + 'Spike';
                kdePointData[spikePosAttr] = closeBoxData[medId][spikePosAttr];
                closeBoxData[medId].spikeDistance = undefined;
                closeBoxData[medId][spikePosAttr] = undefined;

                // no hovertemplate support yet
                kdePointData.hovertemplate = false;

                closeData.push(kdePointData);

                violinLineAttrs = {};
                violinLineAttrs[pLetter + '1'] = Lib.constrain(paOffset + pOnPath[0], paOffset, paOffset + paLength);
                violinLineAttrs[pLetter + '2'] = Lib.constrain(paOffset + pOnPath[1], paOffset, paOffset + paLength);
                violinLineAttrs[vLetter + '1'] = violinLineAttrs[vLetter + '2'] = vAxis._offset + vValPx;
            }
        }

        if(hasHoveronViolins) {
            closeData = closeData.concat((closeBoxData as any));
        }
    }

    if(hoveron.indexOf('points') !== -1) {
        closePtData = boxHoverPoints.hoverOnPoints(pointData, xval, yval);
    }

    // update violin line (if any)
    const violinLine = hoverLayer.selectAll('.violinline-' + trace.uid)
        .data(violinLineAttrs ? [0] : []);
    violinLine.enter().append('line')
        .classed('violinline-' + trace.uid, true)
        .attr('stroke-width', 1.5);
    violinLine.exit().remove();
    violinLine.attr(violinLineAttrs).call(Color.stroke, pointData.color);

    // same combine logic as box hoverPoints
    if(hovermode === 'closest') {
        if(closePtData) return [closePtData];
        return closeData;
    }
    if(closePtData) {
        closeData.push(closePtData);
        return closeData;
    }
    return closeData;
}
