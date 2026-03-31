import type { GraphDiv } from '../../../types/core';
import draw from './draw.js';
import drawDescendants from './draw_descendants.js';

export default function _plot(gd: GraphDiv, cdmodule: any[], transitionOpts: any, makeOnCompleteCallback: any) {
    return draw(gd, cdmodule, transitionOpts, makeOnCompleteCallback, {
        type: 'treemap',
        drawDescendants: drawDescendants
    });
}
