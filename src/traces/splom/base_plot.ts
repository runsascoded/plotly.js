import type { FullAxis, FullTrace, GraphDiv } from '../../../types/core';
import createLine from 'regl-line2d';
import Registry from '../../registry.js';
import prepareRegl from '../../lib/prepare_regl.js';
import { getModuleCalcData } from '../../plots/get_data.js';
import Cartesian from '../../plots/cartesian/index.js';
import { getFromId } from '../../plots/cartesian/axis_ids.js';
import _axes from '../../plots/cartesian/axes.js';
const { shouldShowZeroLine } = _axes;

const SPLOM = 'splom';

const reglPrecompiled: any = {};

function plot(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const _module = Registry.getModule(SPLOM);
    const splomCalcData = getModuleCalcData(gd.calcdata, _module)[0];

    const success = prepareRegl(gd, ['ANGLE_instanced_arrays', 'OES_element_index_uint'], reglPrecompiled);
    if(!success) return;

    if(fullLayout._hasOnlyLargeSploms) {
        updateGrid(gd);
    }

    _module.plot(gd, {}, splomCalcData);
}

function drag(gd: GraphDiv) {
    const cd = gd.calcdata;
    const fullLayout = gd._fullLayout;

    if(fullLayout._hasOnlyLargeSploms) {
        updateGrid(gd);
    }

    for(let i = 0; i < cd.length; i++) {
        const cd0 = cd[i][0];
        const trace = cd0.trace;
        const scene = fullLayout._splomScenes[trace.uid];

        if(trace.type === 'splom' && scene && scene.matrix) {
            dragOne(gd, trace, scene);
        }
    }
}

function dragOne(gd: GraphDiv, trace: FullTrace, scene) {
    const visibleLength = scene.matrixOptions.data.length;
    const visibleDims = trace._visibleDims;
    const ranges = scene.viewOpts.ranges = new Array(visibleLength);

    for(let k = 0; k < visibleDims.length; k++) {
        const i = visibleDims[k];
        const rng = ranges[k] = new Array(4);

        const xa = getFromId(gd, trace._diag[i][0]);
        if(xa) {
            rng[0] = xa.r2l(xa.range[0]);
            rng[2] = xa.r2l(xa.range[1]);
        }

        const ya = getFromId(gd, trace._diag[i][1]);
        if(ya) {
            rng[1] = ya.r2l(ya.range[0]);
            rng[3] = ya.r2l(ya.range[1]);
        }
    }

    if(scene.selectBatch.length || scene.unselectBatch.length) {
        scene.matrix.update({ranges: ranges}, {ranges: ranges});
    } else {
        scene.matrix.update({ranges: ranges});
    }
}

function updateGrid(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;
    const regl = fullLayout._glcanvas.data()[0].regl;
    let splomGrid = fullLayout._splomGrid;

    if(!splomGrid) {
        splomGrid = fullLayout._splomGrid = createLine(regl);
    }
    splomGrid.update(makeGridData(gd));
}

function makeGridData(gd: GraphDiv) {
    const plotGlPixelRatio = gd._context.plotGlPixelRatio;
    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;
    const fullView = [
        0, 0,
        fullLayout.width! * plotGlPixelRatio,
        fullLayout.height! * plotGlPixelRatio
    ];
    const lookup: any = {};
    let k;

    function push(prefix, ax: FullAxis, x0, x1, y0, y1) {
        x0 *= plotGlPixelRatio;
        x1 *= plotGlPixelRatio;
        y0 *= plotGlPixelRatio;
        y1 *= plotGlPixelRatio;

        const lcolor = ax[prefix + 'color'];
        const lwidth = ax[prefix + 'width'];
        const key = String(lcolor + lwidth);

        if(key in lookup) {
            lookup[key].data.push(NaN, NaN, x0, x1, y0, y1);
        } else {
            lookup[key] = {
                data: [x0, x1, y0, y1],
                join: 'rect',
                thickness: lwidth * plotGlPixelRatio,
                color: lcolor,
                viewport: fullView,
                range: fullView,
                overlay: false
            };
        }
    }

    for(k in fullLayout._splomSubplots) {
        const sp = fullLayout._plots[k];
        const xa = sp.xaxis;
        const ya = sp.yaxis;
        const xVals = xa._gridVals;
        const yVals = ya._gridVals;
        const xOffset = xa._offset;
        const xLength = xa._length;
        const yLength = ya._length;

        // ya.l2p assumes top-to-bottom coordinate system (a la SVG),
        // we need to compute bottom-to-top offsets and slopes:
        const yOffset = gs.b + ya.domain[0] * gs.h;
        const ym = -ya._m;
        const yb = -ym * ya.r2l(ya.range[0], ya.calendar);
        let x, y;

        if(xa.showgrid) {
            for(k = 0; k < xVals.length; k++) {
                x = xOffset + xa.l2p(xVals[k].x);
                push('grid', xa, x, yOffset, x, yOffset + yLength);
            }
        }
        if(ya.showgrid) {
            for(k = 0; k < yVals.length; k++) {
                y = yOffset + yb + ym * yVals[k].x;
                push('grid', ya, xOffset, y, xOffset + xLength, y);
            }
        }
        if(shouldShowZeroLine(gd, xa, ya)) {
            x = xOffset + xa.l2p(0);
            push('zeroline', xa, x, yOffset, x, yOffset + yLength);
        }
        if(shouldShowZeroLine(gd, ya, xa)) {
            y = yOffset + yb + 0;
            push('zeroline', ya, xOffset, y, xOffset + xLength, y);
        }
    }

    const gridBatches: any[] = [];
    for(k in lookup) {
        gridBatches.push(lookup[k]);
    }

    return gridBatches;
}

function clean(newFullData, newFullLayout, oldFullData, oldFullLayout) {
    const lookup: any = {};
    let i;

    if(oldFullLayout._splomScenes) {
        for(i = 0; i < newFullData.length; i++) {
            const newTrace = newFullData[i];
            if(newTrace.type === 'splom') {
                lookup[newTrace.uid] = 1;
            }
        }
        for(i = 0; i < oldFullData.length; i++) {
            const oldTrace = oldFullData[i];
            if(!lookup[oldTrace.uid]) {
                const scene = oldFullLayout._splomScenes[oldTrace.uid];
                if(scene && scene.destroy) scene.destroy();
                // must first set scene to null in order to get garbage collected
                oldFullLayout._splomScenes[oldTrace.uid] = null;
                delete oldFullLayout._splomScenes[oldTrace.uid];
            }
        }
    }

    if(Object.keys(oldFullLayout._splomScenes || {}).length === 0) {
        delete oldFullLayout._splomScenes;
    }

    if(oldFullLayout._splomGrid &&
        (!newFullLayout._hasOnlyLargeSploms && oldFullLayout._hasOnlyLargeSploms)) {
        // must first set scene to null in order to get garbage collected
        oldFullLayout._splomGrid.destroy();
        oldFullLayout._splomGrid = null;
        delete oldFullLayout._splomGrid;
    }

    Cartesian.clean(newFullData, newFullLayout, oldFullData, oldFullLayout);
}

export default {
    name: SPLOM,
    attr: Cartesian.attr,
    attrRegex: Cartesian.attrRegex,
    layoutAttributes: Cartesian.layoutAttributes,
    supplyLayoutDefaults: Cartesian.supplyLayoutDefaults,
    drawFramework: Cartesian.drawFramework,
    plot: plot,
    drag: drag,
    updateGrid: updateGrid,
    clean: clean,
    updateFx: Cartesian.updateFx,
    toSVG: Cartesian.toSVG,
    reglPrecompiled: reglPrecompiled
};
