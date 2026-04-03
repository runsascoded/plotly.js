import createMatrix from 'regl-splom';
import Lib from '../../lib/index.js';
import AxisIDs from '../../plots/cartesian/axis_ids.js';
import { selectMode } from '../../components/dragelement/helpers.js';
export default function plot(gd, _, splomCalcData) {
    if (!splomCalcData.length)
        return;
    for (let i = 0; i < splomCalcData.length; i++) {
        plotOne(gd, splomCalcData[i][0]);
    }
}
function plotOne(gd, cd0) {
    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;
    const trace = cd0.trace;
    const stash = cd0.t;
    const scene = fullLayout._splomScenes[trace.uid];
    const matrixOpts = scene.matrixOptions;
    const cdata = matrixOpts.cdata;
    const regl = fullLayout._glcanvas.data()[0].regl;
    const dragmode = fullLayout.dragmode;
    let xa, ya;
    let i, j, k;
    if (cdata.length === 0)
        return;
    // augment options with proper upper/lower halves
    // regl-splom's default grid starts from bottom-left
    matrixOpts.lower = trace.showupperhalf;
    matrixOpts.upper = trace.showlowerhalf;
    matrixOpts.diagonal = trace.diagonal.visible;
    const visibleDims = trace._visibleDims;
    const visibleLength = cdata.length;
    const viewOpts = scene.viewOpts = {};
    viewOpts.ranges = new Array(visibleLength);
    viewOpts.domains = new Array(visibleLength);
    for (k = 0; k < visibleDims.length; k++) {
        i = visibleDims[k];
        const rng = viewOpts.ranges[k] = new Array(4);
        const dmn = viewOpts.domains[k] = new Array(4);
        xa = AxisIDs.getFromId(gd, trace._diag[i][0]);
        if (xa) {
            rng[0] = xa._rl[0];
            rng[2] = xa._rl[1];
            dmn[0] = xa.domain[0];
            dmn[2] = xa.domain[1];
        }
        ya = AxisIDs.getFromId(gd, trace._diag[i][1]);
        if (ya) {
            rng[1] = ya._rl[0];
            rng[3] = ya._rl[1];
            dmn[1] = ya.domain[0];
            dmn[3] = ya.domain[1];
        }
    }
    const plotGlPixelRatio = gd._context.plotGlPixelRatio;
    const l = gs.l * plotGlPixelRatio;
    const b = gs.b * plotGlPixelRatio;
    const w = gs.w * plotGlPixelRatio;
    const h = gs.h * plotGlPixelRatio;
    viewOpts.viewport = [l, b, w + l, h + b];
    if (scene.matrix === true) {
        scene.matrix = createMatrix(regl);
    }
    const clickSelectEnabled = fullLayout.clickmode.indexOf('select') > -1;
    const isSelectMode = selectMode(dragmode) ||
        !!trace.selectedpoints || clickSelectEnabled;
    let needsBaseUpdate = true;
    if (isSelectMode) {
        const commonLength = trace._length;
        // regenerate scene batch, if traces number changed during selection
        if (trace.selectedpoints) {
            scene.selectBatch = trace.selectedpoints;
            const selPts = trace.selectedpoints;
            const selDict = {};
            for (i = 0; i < selPts.length; i++) {
                selDict[selPts[i]] = true;
            }
            const unselPts = [];
            for (i = 0; i < commonLength; i++) {
                if (!selDict[i])
                    unselPts.push(i);
            }
            scene.unselectBatch = unselPts;
        }
        // precalculate px coords since we are not going to pan during select
        const xpx = stash.xpx = new Array(visibleLength);
        const ypx = stash.ypx = new Array(visibleLength);
        for (k = 0; k < visibleDims.length; k++) {
            i = visibleDims[k];
            xa = AxisIDs.getFromId(gd, trace._diag[i][0]);
            if (xa) {
                xpx[k] = new Array(commonLength);
                for (j = 0; j < commonLength; j++) {
                    xpx[k][j] = xa.c2p(cdata[k][j]);
                }
            }
            ya = AxisIDs.getFromId(gd, trace._diag[i][1]);
            if (ya) {
                ypx[k] = new Array(commonLength);
                for (j = 0; j < commonLength; j++) {
                    ypx[k][j] = ya.c2p(cdata[k][j]);
                }
            }
        }
        if (scene.selectBatch.length || scene.unselectBatch.length) {
            const unselOpts = Lib.extendFlat({}, matrixOpts, scene.unselectedOptions, viewOpts);
            const selOpts = Lib.extendFlat({}, matrixOpts, scene.selectedOptions, viewOpts);
            scene.matrix.update(unselOpts, selOpts);
            needsBaseUpdate = false;
        }
    }
    else {
        stash.xpx = stash.ypx = null;
    }
    if (needsBaseUpdate) {
        const opts = Lib.extendFlat({}, matrixOpts, viewOpts);
        scene.matrix.update(opts, null);
    }
}
