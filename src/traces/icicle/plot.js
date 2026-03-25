import draw from '../treemap/draw.js';
import drawDescendants from './draw_descendants.js';

export default function _plot(gd, cdmodule, transitionOpts, makeOnCompleteCallback) {
    return draw(gd, cdmodule, transitionOpts, makeOnCompleteCallback, {
        type: 'icicle',
        drawDescendants: drawDescendants
    });
}
