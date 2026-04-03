import draw from './draw.js';
import drawDescendants from './draw_descendants.js';
export default function _plot(gd, cdmodule, transitionOpts, makeOnCompleteCallback) {
    return draw(gd, cdmodule, transitionOpts, makeOnCompleteCallback, {
        type: 'treemap',
        drawDescendants: drawDescendants
    });
}
