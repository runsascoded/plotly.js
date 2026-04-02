import Lib from '../../lib/index.js';
import subTypes from '../scatter/subtypes.js';
import helpers from './helpers.js';
const pushUnique = Lib.pushUnique;

export default function select(searchInfo: any, selectionTester: any) {
    const cd = searchInfo.cd;
    const trace = cd[0].trace;
    const stash = cd[0].t;
    const scene = searchInfo.scene;
    const cdata = scene.matrixOptions.cdata;
    const xa = searchInfo.xaxis;
    const ya = searchInfo.yaxis;
    const selection: any[] = [];

    if(!scene) return selection;

    const hasOnlyLines = (!subTypes.hasMarkers(trace) && !subTypes.hasText(trace));
    if(trace.visible !== true || hasOnlyLines) return selection;

    const xi = helpers.getDimIndex(trace, xa);
    const yi = helpers.getDimIndex(trace, ya);
    if(xi === false || yi === false) return selection;

    const xpx = stash.xpx[xi];
    const ypx = stash.ypx[yi];
    const x = cdata[xi];
    const y = cdata[yi];
    const els = (searchInfo.scene.selectBatch || []).slice();
    const unels: any[] = [];

    // degenerate polygon does not enable selection
    // filter out points by visible scatter ones
    if(selectionTester !== false && !selectionTester.degenerate) {
        for(let i = 0; i < x.length; i++) {
            if(selectionTester.contains([xpx[i], ypx[i]], null, i, searchInfo)) {
                selection.push({
                    pointNumber: i,
                    x: x[i],
                    y: y[i]
                });

                pushUnique(els, i);
            } else if(els.indexOf(i) !== -1) {
                pushUnique(els, i);
            } else {
                unels.push(i);
            }
        }
    }

    const matrixOpts = scene.matrixOptions;

    if(!els.length && !unels.length) {
        scene.matrix.update(matrixOpts, null);
    } else if(!scene.selectBatch.length && !scene.unselectBatch.length) {
        scene.matrix.update(
            scene.unselectedOptions,
            Lib.extendFlat({}, matrixOpts, scene.selectedOptions, scene.viewOpts)
        );
    }

    scene.selectBatch = els;
    scene.unselectBatch = unels;

    return selection;
}
