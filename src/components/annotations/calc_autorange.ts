import type { GraphDiv, FullAxis } from '../../../types/core';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import _draw from './draw.js';
const { draw } = _draw;

export default function calcAutorange(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const annotationList = Lib.filterVisible(fullLayout.annotations);

    if(annotationList.length && gd._fullData.length) {
        return Lib.syncOrAsync([draw, annAutorange], gd);
    }
}

function annAutorange(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;

    // find the bounding boxes for each of these annotations'
    // relative to their anchor points
    // use the arrow and the text bg rectangle,
    // as the whole anno may include hidden text in its bbox
    Lib.filterVisible(fullLayout.annotations).forEach(function(ann: any) {
        const xa = Axes.getFromId(gd, ann.xref);
        const ya = Axes.getFromId(gd, ann.yref);
        const xRefType = Axes.getRefType(ann.xref);
        const yRefType = Axes.getRefType(ann.yref);

        ann._extremes = {};
        if(xRefType === 'range') calcAxisExpansion(ann, xa);
        if(yRefType === 'range') calcAxisExpansion(ann, ya);
    });
}

function calcAxisExpansion(ann: any, ax: FullAxis) {
    const axId = ax._id;
    const letter = axId.charAt(0);
    const pos = ann[letter];
    const apos = ann['a' + letter];
    const ref = ann[letter + 'ref'];
    const aref = ann['a' + letter + 'ref'];
    const padplus = ann['_' + letter + 'padplus'];
    const padminus = ann['_' + letter + 'padminus'];
    const shift = {x: 1, y: -1}[letter]! * ann[letter + 'shift'];
    const headSize = 3 * ann.arrowsize * ann.arrowwidth || 0;
    const headPlus = headSize + shift;
    const headMinus = headSize - shift;
    const startHeadSize = 3 * ann.startarrowsize * ann.arrowwidth || 0;
    let startHeadPlus = startHeadSize + shift;
    let startHeadMinus = startHeadSize - shift;
    let extremes;

    if(aref === ref) {
        // expand for the arrowhead (padded by arrowhead)
        const extremeArrowHead = Axes.findExtremes(ax, [ax.r2c(pos)], {
            ppadplus: headPlus,
            ppadminus: headMinus
        });
        // again for the textbox (padded by textbox)
        const extremeText = Axes.findExtremes(ax, [ax.r2c(apos)], {
            ppadplus: Math.max(padplus, startHeadPlus),
            ppadminus: Math.max(padminus, startHeadMinus)
        });
        extremes = {
            min: [extremeArrowHead.min[0], extremeText.min[0]],
            max: [extremeArrowHead.max[0], extremeText.max[0]]
        };
    } else {
        startHeadPlus = apos ? startHeadPlus + apos : startHeadPlus;
        startHeadMinus = apos ? startHeadMinus - apos : startHeadMinus;
        extremes = Axes.findExtremes(ax, [ax.r2c(pos)], {
            ppadplus: Math.max(padplus, headPlus, startHeadPlus),
            ppadminus: Math.max(padminus, headMinus, startHeadMinus)
        });
    }

    ann._extremes[axId] = extremes;
}
