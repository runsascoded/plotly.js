import subTypes from '../scatter/subtypes.js';
import _edit_style from './edit_style.js';
const { styleTextSelection } = _edit_style;

export default function select(searchInfo, selectionTester) {
    const cd = searchInfo.cd;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection = [];
    const trace = cd[0].trace;
    const stash = cd[0].t;
    const len = trace._length;
    const x = stash.x;
    const y = stash.y;
    const scene = stash._scene;
    const index = stash.index;

    if(!scene) return selection;

    const hasText = subTypes.hasText(trace);
    const hasMarkers = subTypes.hasMarkers(trace);
    const hasOnlyLines = !hasMarkers && !hasText;

    if(trace.visible !== true || hasOnlyLines) return selection;

    const els = [];
    const unels = [];

    // degenerate polygon does not enable selection
    // filter out points by visible scatter ones
    if(selectionTester !== false && !selectionTester.degenerate) {
        for(let i = 0; i < len; i++) {
            if(selectionTester.contains([stash.xpx[i], stash.ypx[i]], false, i, searchInfo)) {
                els.push(i);
                selection.push({
                    pointNumber: i,
                    x: xa.c2d(x[i]),
                    y: ya.c2d(y[i])
                });
            } else {
                unels.push(i);
            }
        }
    }

    if(hasMarkers) {
        const scatter2d = scene.scatter2d;

        if(!els.length && !unels.length) {
            // reset to base styles when clearing
            const baseOpts = new Array(scene.count);
            baseOpts[index] = scene.markerOptions[index];
            scatter2d.update.apply(scatter2d, baseOpts);
        } else if(!scene.selectBatch[index].length && !scene.unselectBatch[index].length) {
            // set unselected styles on 'context' canvas (if not done already)
            const unselOpts = new Array(scene.count);
            unselOpts[index] = scene.markerUnselectedOptions[index];
            scatter2d.update.apply(scatter2d, unselOpts);
        }
    }

    scene.selectBatch[index] = els;
    scene.unselectBatch[index] = unels;

    if(hasText) {
        styleTextSelection(cd);
    }

    return selection;
}
