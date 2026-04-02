import createScatter from 'regl-scatter2d';
import createLine from 'regl-line2d';
import createError from 'regl-error2d';
import Text from 'gl-text';
import Lib from '../../lib/index.js';
import { selectMode } from '../../components/dragelement/helpers.js';
import prepareRegl from '../../lib/prepare_regl.js';
import subTypes from '../scatter/subtypes.js';
import linkTraces from '../scatter/link_traces.js';
import type { GraphDiv } from '../../../types/core';
import _edit_style from './edit_style.js';
const { styleTextSelection } = _edit_style;

const reglPrecompiled: any = {};

function getViewport(fullLayout: any, xaxis: any, yaxis: any, plotGlPixelRatio: any) {
    const gs = fullLayout._size;
    const width = fullLayout.width * plotGlPixelRatio;
    const height = fullLayout.height * plotGlPixelRatio;

    const l = gs.l * plotGlPixelRatio;
    const b = gs.b * plotGlPixelRatio;
    const r = gs.r * plotGlPixelRatio;
    const t = gs.t * plotGlPixelRatio;
    const w = gs.w * plotGlPixelRatio;
    const h = gs.h * plotGlPixelRatio;
    return [
        l + xaxis.domain[0] * w,
        b + yaxis.domain[0] * h,
        (width - r) - (1 - xaxis.domain[1]) * w,
        (height - t) - (1 - yaxis.domain[1]) * h
    ];
}

function plot(gd: GraphDiv, subplot: any, cdata: any) {
    if(!cdata.length) return;

    const fullLayout = gd._fullLayout;
    const scene = subplot._scene;
    const xaxis = subplot.xaxis;
    const yaxis = subplot.yaxis;
    let i, j;

    if(!scene) return;

    const success = prepareRegl(gd, ['ANGLE_instanced_arrays', 'OES_element_index_uint'], reglPrecompiled);
    if(!success) {
        scene.init();
        return;
    }

    const count = scene.count;
    const regl = fullLayout._glcanvas.data()[0].regl;

    linkTraces(gd, subplot, cdata);

    if(scene.dirty) {
        if (
            (scene.line2d || scene.error2d) &&
            !(scene.scatter2d || scene.fill2d || scene.glText)
        ) {
            regl.clear({ color: true, depth: true });
        }

        if(scene.error2d === true) {
            scene.error2d = createError(regl);
        }
        if(scene.line2d === true) {
            scene.line2d = createLine(regl);
        }
        if(scene.scatter2d === true) {
            scene.scatter2d = createScatter(regl);
        }
        if(scene.fill2d === true) {
            scene.fill2d = createLine(regl);
        }
        if(scene.glText === true) {
            scene.glText = new Array(count);
            for(i = 0; i < count; i++) {
                scene.glText[i] = new Text(regl);
            }
        }

        if(scene.glText) {
            if(count > scene.glText.length) {
                const textsToAdd = count - scene.glText.length;
                for(i = 0; i < textsToAdd; i++) {
                    scene.glText.push(new Text(regl));
                }
            } else if(count < scene.glText.length) {
                const textsToRemove = scene.glText.length - count;
                const removedTexts = scene.glText.splice(count, textsToRemove);
                removedTexts.forEach(function(text: any) { text.destroy(); });
            }

            for(i = 0; i < count; i++) {
                scene.glText[i].update(scene.textOptions[i]);
            }
        }
        if(scene.line2d) {
            scene.line2d.update(scene.lineOptions);
            scene.lineOptions = scene.lineOptions.map(function(lineOptions: any) {
                if(lineOptions && lineOptions.positions) {
                    const srcPos = lineOptions.positions;

                    let firstptdef = 0;
                    while(firstptdef < srcPos.length && (isNaN(srcPos[firstptdef]) || isNaN(srcPos[firstptdef + 1]))) {
                        firstptdef += 2;
                    }
                    let lastptdef = srcPos.length - 2;
                    while(lastptdef > firstptdef && (isNaN(srcPos[lastptdef]) || isNaN(srcPos[lastptdef + 1]))) {
                        lastptdef -= 2;
                    }
                    lineOptions.positions = srcPos.slice(firstptdef, lastptdef + 2);
                }
                return lineOptions;
            });
            scene.line2d.update(scene.lineOptions);
        }
        if(scene.error2d) {
            const errorBatch = (scene.errorXOptions || []).concat(scene.errorYOptions || []);
            scene.error2d.update(errorBatch);
        }
        if(scene.scatter2d) {
            scene.scatter2d.update(scene.markerOptions);
        }

        scene.fillOrder = Lib.repeat(null, count);
        if(scene.fill2d) {
            scene.fillOptions = scene.fillOptions.map(function(fillOptions: any, i: any) {
                const cdscatter = cdata[i];
                if(!fillOptions || !cdscatter || !cdscatter[0] || !cdscatter[0].trace) return;
                const cd = cdscatter[0];
                const trace = cd.trace;
                const stash = cd.t;
                const lineOptions = scene.lineOptions[i];
                let last, j;

                const fillData: any[] = [];
                if(trace._ownfill) fillData.push(i);
                if(trace._nexttrace) fillData.push(i + 1);
                if(fillData.length) scene.fillOrder[i] = fillData;

                let pos: any[] = [];
                const srcPos = (lineOptions && lineOptions.positions) || stash.positions;
                let firstptdef, lastptdef;

                if(trace.fill === 'tozeroy') {
                    firstptdef = 0;
                    while(firstptdef < srcPos.length && isNaN(srcPos[firstptdef + 1])) {
                        firstptdef += 2;
                    }
                    lastptdef = srcPos.length - 2;
                    while(lastptdef > firstptdef && isNaN(srcPos[lastptdef + 1])) {
                        lastptdef -= 2;
                    }
                    if(srcPos[firstptdef + 1] !== 0) {
                        pos = [srcPos[firstptdef], 0];
                    }
                    pos = pos.concat(srcPos.slice(firstptdef, lastptdef + 2));
                    if(srcPos[lastptdef + 1] !== 0) {
                        pos = pos.concat([srcPos[lastptdef], 0]);
                    }
                } else if(trace.fill === 'tozerox') {
                    firstptdef = 0;
                    while(firstptdef < srcPos.length && isNaN(srcPos[firstptdef])) {
                        firstptdef += 2;
                    }
                    lastptdef = srcPos.length - 2;
                    while(lastptdef > firstptdef && isNaN(srcPos[lastptdef])) {
                        lastptdef -= 2;
                    }
                    if(srcPos[firstptdef] !== 0) {
                        pos = [0, srcPos[firstptdef + 1]];
                    }
                    pos = pos.concat(srcPos.slice(firstptdef, lastptdef + 2));
                    if(srcPos[lastptdef] !== 0) {
                        pos = pos.concat([ 0, srcPos[lastptdef + 1]]);
                    }
                } else if(trace.fill === 'toself' || trace.fill === 'tonext') {
                    pos = [];
                    last = 0;

                    fillOptions.splitNull = true;

                    for(j = 0; j < srcPos.length; j += 2) {
                        if(isNaN(srcPos[j]) || isNaN(srcPos[j + 1])) {
                            pos = pos.concat(srcPos.slice(last, j));
                            pos.push(srcPos[last], srcPos[last + 1]);
                            pos.push(null, null);
                            last = j + 2;
                        }
                    }
                    pos = pos.concat(srcPos.slice(last));
                    if(last) {
                        pos.push(srcPos[last], srcPos[last + 1]);
                    }
                } else {
                    const nextTrace = trace._nexttrace;

                    if(nextTrace) {
                        const nextOptions = scene.lineOptions[i + 1];

                        if(nextOptions) {
                            const nextPos = nextOptions.positions;
                            if(trace.fill === 'tonexty') {
                                pos = srcPos.slice();

                                for(i = Math.floor(nextPos.length / 2); i--;) {
                                    const xx = nextPos[i * 2];
                                    const yy = nextPos[i * 2 + 1];
                                    if(isNaN(xx) || isNaN(yy)) continue;
                                    pos.push(xx, yy);
                                }
                                fillOptions.fill = nextTrace.fillcolor;
                            }
                        }
                    }
                }

                if(trace._prevtrace && trace._prevtrace.fill === 'tonext') {
                    const prevLinePos = scene.lineOptions[i - 1].positions;

                    const offset = pos.length / 2;
                    last = offset;
                    const hole = [last];
                    for(j = 0; j < prevLinePos.length; j += 2) {
                        if(isNaN(prevLinePos[j]) || isNaN(prevLinePos[j + 1])) {
                            hole.push(j / 2 + offset + 1);
                            last = j + 2;
                        }
                    }

                    pos = pos.concat(prevLinePos);
                    fillOptions.hole = hole;
                }
                fillOptions.fillmode = trace.fill;
                fillOptions.opacity = trace.opacity;
                fillOptions.positions = pos;

                return fillOptions;
            });

            scene.fill2d.update(scene.fillOptions);
        }
    }

    const dragmode = fullLayout.dragmode;
    let isSelectMode = selectMode(dragmode);
    const clickSelectEnabled = fullLayout.clickmode.indexOf('select') > -1;

    for(i = 0; i < count; i++) {
        const cd0 = cdata[i][0];
        const trace = cd0.trace;
        const stash = cd0.t;
        const index = stash.index;
        const len = trace._length;
        const x = stash.x;
        const y = stash.y;

        if(trace.selectedpoints || isSelectMode || clickSelectEnabled) {
            if(!isSelectMode) isSelectMode = true;

            if(trace.selectedpoints) {
                const selPts = scene.selectBatch[index] = Lib.selIndices2selPoints(trace);

                const selDict: any = {};
                for(j = 0; j < selPts.length; j++) {
                    selDict[selPts[j]] = 1;
                }
                const unselPts = [];
                for(j = 0; j < len; j++) {
                    if(!selDict[j]) unselPts.push(j);
                }
                scene.unselectBatch[index] = unselPts;
            }

            const xpx = stash.xpx = new Array(len);
            const ypx = stash.ypx = new Array(len);
            for(j = 0; j < len; j++) {
                xpx[j] = xaxis.c2p(x[j]);
                ypx[j] = yaxis.c2p(y[j]);
            }
        } else {
            stash.xpx = stash.ypx = null;
        }
    }

    if(isSelectMode) {
        if(!scene.select2d) {
            scene.select2d = createScatter(fullLayout._glcanvas.data()[1].regl);
        }

        if(scene.scatter2d) {
            const unselOpts = new Array(count);
            for(i = 0; i < count; i++) {
                unselOpts[i] = scene.selectBatch[i].length || scene.unselectBatch[i].length ?
                    scene.markerUnselectedOptions[i] :
                    {};
            }
            scene.scatter2d.update(unselOpts);
        }

        if(scene.select2d) {
            scene.select2d.update(scene.markerOptions);
            scene.select2d.update(scene.markerSelectedOptions);
        }

        if(scene.glText) {
            cdata.forEach(function(cdscatter: any) {
                const trace = ((cdscatter || [])[0] || {}).trace || {};
                if(subTypes.hasText(trace)) {
                    styleTextSelection(cdscatter);
                }
            });
        }
    } else {
        if(scene.scatter2d) {
            scene.scatter2d.update(scene.markerOptions);
        }
    }

    const vpRange0 = {
        viewport: getViewport(fullLayout, xaxis, yaxis, gd._context.plotGlPixelRatio),
        range: [
            (xaxis._rl || xaxis.range)[0],
            (yaxis._rl || yaxis.range)[0],
            (xaxis._rl || xaxis.range)[1],
            (yaxis._rl || yaxis.range)[1]
        ]
    };
    const vpRange = Lib.repeat(vpRange0, scene.count);

    if(scene.fill2d) {
        scene.fill2d.update(vpRange);
    }
    if(scene.line2d) {
        scene.line2d.update(vpRange);
    }
    if(scene.error2d) {
        scene.error2d.update(vpRange.concat(vpRange));
    }
    if(scene.scatter2d) {
        scene.scatter2d.update(vpRange);
    }
    if(scene.select2d) {
        scene.select2d.update(vpRange);
    }
    if(scene.glText) {
        scene.glText.forEach(function(text: any) { text.update(vpRange0); });
    }
}

(plot as any).reglPrecompiled = reglPrecompiled;

export { reglPrecompiled };

export default plot;
