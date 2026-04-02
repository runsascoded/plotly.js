import { select } from 'd3-selection';
import Registry from '../../registry.js';
import { ensureSingle, extendFlat, pushUnique, sorterAsc } from '../../lib/index.js';
import { style as plotsStyle } from '../plots.js';
import { setClipUrl } from '../../components/drawing/index.js';
import { getModuleCalcData } from '../get_data.js';
import axisIds from './axis_ids.js';
import constants from './constants.js';
import xmlnsNamespaces from '../../constants/xmlns_namespaces.js';
import _req0 from './attributes.js';
import _req1 from './layout_attributes.js';
import _req2 from './layout_defaults.js';
import _req3 from './transition_axes.js';
import { updateFx as _req4 } from './graph_interact.js';
import type { GraphDiv, FullLayout, FullTrace, PlotInfo } from '../../../types/core';


function ensureSingleAndAddDatum(parent?: any, nodeType?: any, className?: any): void {
    return ensureSingle(parent, nodeType, className, function(s: any) {
        s.datum(className);
    });
}

const zindexSeparator = constants.zindexSeparator;

export const name = 'cartesian';
export const attr = ['xaxis', 'yaxis'];
export const idRoot = ['x', 'y'];
export const idRegex = constants.idRegex;
export const attrRegex = constants.attrRegex;
export const attributes = _req0;
export const layoutAttributes = _req1;
export const supplyLayoutDefaults = _req2;
export const transitionAxes = _req3;

export const finalizeSubplots = function(layoutIn?: any, layoutOut?: any): void {
    const subplots = layoutOut._subplots;
    const xList = subplots.xaxis;
    const yList = subplots.yaxis;
    const spSVG = subplots.cartesian;
    const spAll = spSVG;
    const allX: any = {};
    const allY: any = {};
    let i, xi, yi;

    for(i = 0; i < spAll.length; i++) {
        const parts = spAll[i].split('y');
        allX[parts[0]] = 1;
        allY['y' + parts[1]] = 1;
    }

    // check for x axes with no subplot, and make one from the anchor of that x axis
    for(i = 0; i < xList.length; i++) {
        xi = xList[i];
        if(!allX[xi]) {
            yi = (layoutIn[axisIds.id2name(xi)] || {}).anchor;
            if(!constants.idRegex.y.test(yi)) yi = 'y';
            spSVG.push(xi + yi);
            spAll.push(xi + yi);

            if(!allY[yi]) {
                allY[yi] = 1;
                pushUnique(yList, yi);
            }
        }
    }

    // same for y axes with no subplot
    for(i = 0; i < yList.length; i++) {
        yi = yList[i];
        if(!allY[yi]) {
            xi = (layoutIn[axisIds.id2name(yi)] || {}).anchor;
            if(!constants.idRegex.x.test(xi)) xi = 'x';
            spSVG.push(xi + yi);
            spAll.push(xi + yi);

            if(!allX[xi]) {
                allX[xi] = 1;
                pushUnique(xList, xi);
            }
        }
    }

    // finally, if we've gotten here we're supposed to show cartesian...
    // so if there are NO subplots at all, make one from the first
    // x & y axes in the input layout
    if(!spAll.length) {
        xi = '';
        yi = '';
        for(const ki in layoutIn) {
            if(constants.attrRegex.test(ki)) {
                const axLetter = ki.charAt(0);
                if(axLetter === 'x') {
                    if(!xi || (+ki.slice(5) < +xi.slice(5))) {
                        xi = ki;
                    }
                } else if(!yi || (+ki.slice(5) < +yi.slice(5))) {
                    yi = ki;
                }
            }
        }
        xi = xi ? axisIds.name2id(xi) : 'x';
        yi = yi ? axisIds.name2id(yi) : 'y';
        xList.push(xi);
        yList.push(yi);
        spSVG.push(xi + yi);
    }
};

export const plot = function(gd: GraphDiv, traces?: any, transitionOpts?: any, makeOnCompleteCallback?: any): void {
    const fullLayout = gd._fullLayout;
    const subplots = fullLayout._subplots.cartesian;
    const calcdata = gd.calcdata;
    let i;

    // Traces is a list of trace indices to (re)plot. If it's not provided,
    // then it's a complete replot so we create a new list and add all trace indices
    // which are in calcdata.

    if(!Array.isArray(traces)) {
        // If traces is not provided, then it's a complete replot and missing
        // traces are removed
        traces = [];
        for(i = 0; i < calcdata.length; i++) traces.push(i);
    }

    const zindices = fullLayout._zindices;
    // Plot each zorder group in ascending order
    for(let z = 0; z < zindices.length; z++) {
        const zorder = zindices[z];

        // For each subplot
        for(i = 0; i < subplots.length; i++) {
            const subplot = subplots[i];
            let subplotInfo = fullLayout._plots[subplot];

            if(z > 0) {
                let idWithZ = subplotInfo.id;
                if(idWithZ.indexOf(zindexSeparator) !== -1) continue;
                idWithZ += zindexSeparator + (z + 1);
                subplotInfo = extendFlat({}, subplotInfo, {
                    id: idWithZ,
                    plot: fullLayout._cartesianlayer.selectAll('.subplot').select('.' + idWithZ)
                });
            }

            // Get all calcdata (traces) for this subplot:
            const cdSubplot: any[] = [];
            let pcd;

            // For each trace
            for(let j = 0; j < calcdata.length; j++) {
                const cd = calcdata[j];
                const trace = cd[0].trace;

                if(zorder !== (trace.zorder || 0)) continue;

                // Skip trace if whitelist provided and it's not whitelisted:
                // if (Array.isArray(traces) && traces.indexOf(i) === -1) continue;
                if(trace.xaxis + trace.yaxis === subplot) {
                    // XXX: Should trace carpet dependencies. Only replot all carpet plots if the carpet
                    // axis has actually changed:
                    //
                    // If this trace is specifically requested, add it to the list:
                    if(traces.indexOf(trace.index) !== -1 || trace.carpet) {
                        // Okay, so example: traces 0, 1, and 2 have fill = tonext. You animate
                        // traces 0 and 2. Trace 1 also needs to be updated, otherwise its fill
                        // is outdated. So this retroactively adds the previous trace if the
                        // traces are interdependent.
                        if(
                            pcd &&
                            pcd[0].trace.xaxis + pcd[0].trace.yaxis === subplot &&
                            ['tonextx', 'tonexty', 'tonext'].indexOf(trace.fill) !== -1 &&
                            cdSubplot.indexOf(pcd) === -1
                        ) {
                            cdSubplot.push(pcd);
                        }

                        cdSubplot.push(cd);
                    }

                    // Track the previous trace on this subplot for the retroactive-add step
                    // above:
                    pcd = cd;
                }
            }
            // Plot the traces for this subplot
            plotOne(gd, subplotInfo, cdSubplot, transitionOpts, makeOnCompleteCallback);
        }
    }
};

function plotOne(gd: GraphDiv, plotinfo: PlotInfo, cdSubplot?: any, transitionOpts?: any, makeOnCompleteCallback?: any): any {
    const traceLayerClasses = constants.traceLayerClasses;
    const fullLayout = gd._fullLayout;
    const zindices = fullLayout._zindices;

    const modules = fullLayout._modules;
    let _module, cdModuleAndOthers, cdModule;

    const layerData: any[] = [];
    const zoomScaleQueryParts: any[] = [];

    // Plot each zorder group in ascending order
    for(let z = 0; z < zindices.length; z++) {
        const zorder = zindices[z];
        // For each "module" (trace type)
        for(let i = 0; i < modules.length; i++) {
            _module = modules[i];
            const name = _module.name;
            const categories = Registry.modules[name].categories;

            if(categories.svg) {
                const classBaseName = (_module.layerName || name + 'layer');
                const className = classBaseName + (z ? Number(z) + 1 : '');
                const plotMethod = _module.plot;

                // plot all visible traces of this type on this subplot at once
                cdModuleAndOthers = getModuleCalcData(cdSubplot, plotMethod, zorder);
                cdModule = cdModuleAndOthers[0];
                // don't need to search the found traces again - in fact we need to NOT
                // so that if two modules share the same plotter we don't double-plot
                cdSubplot = cdModuleAndOthers[1];

                if(cdModule.length) {
                    layerData.push({
                        i: traceLayerClasses.indexOf(classBaseName),
                        zindex: z,
                        className: className,
                        plotMethod: plotMethod,
                        cdModule: cdModule
                    });
                }

                if(categories.zoomScale) {
                    zoomScaleQueryParts.push('.' + className);
                }
            }
        }
    }
    // Sort the layers primarily by zindex, then by i
    layerData.sort(function(a, b) {
        return (
            ((a as any).zindex || 0) - ((b as any).zindex || 0) ||
            ((a as any).i - (b as any).i)
        );
    });

    const layers = plotinfo.plot.selectAll('g.mlayer')
        .data(layerData, function(d: any) { return d.className; });

    layers.enter().append('g')
        .attr('class', function(d: any) { return d.className; })
        .classed('mlayer', true)
        .classed('rangeplot', plotinfo.isRangePlot);

    layers.exit().remove();

    layers.order();

    layers.each(function(this: any, d: any) {
        const sel = select(this);
        const className = d.className;

        d.plotMethod(
            gd, plotinfo, d.cdModule, sel,
            transitionOpts, makeOnCompleteCallback
        );

        // layers that allow `cliponaxis: false`
        if(constants.clipOnAxisFalseQuery.indexOf('.' + className) === -1) {
            setClipUrl(sel, (plotinfo.layerClipId as any), gd);
        }
    });

    // call Scattergl.plot separately
    if(fullLayout._has('scattergl')) {
        _module = Registry.getModule('scattergl');
        cdModule = getModuleCalcData(cdSubplot, _module)[0];
        _module.plot(gd, plotinfo, cdModule);
    }

    // stash "hot" selections for faster interaction on drag and scroll
    if(!gd._context.staticPlot) {
        if(plotinfo._hasClipOnAxisFalse) {
            plotinfo.clipOnAxisFalseTraces = plotinfo.plot
                .selectAll(constants.clipOnAxisFalseQuery.join(','))
                .selectAll('.trace');
        }

        if(zoomScaleQueryParts.length) {
            const traces = plotinfo.plot
                .selectAll(zoomScaleQueryParts.join(','))
                .selectAll('.trace');

            plotinfo.zoomScalePts = traces.selectAll('path.point');
            plotinfo.zoomScaleTxt = traces.selectAll('.textpoint');
        }
    }
}

export const clean = function(newFullData: FullTrace[], newFullLayout: FullLayout, oldFullData: FullTrace[], oldFullLayout: FullLayout): void {
    const oldPlots = oldFullLayout._plots || {};
    const newPlots = newFullLayout._plots || {};
    const oldSubplotList = oldFullLayout._subplots || {} as any;
    let plotinfo;
    let i, k;

    // when going from a large splom graph to something else,
    // we need to clear <g subplot> so that the new cartesian subplot
    // can have the correct layer ordering
    if(oldFullLayout._hasOnlyLargeSploms && !newFullLayout._hasOnlyLargeSploms) {
        for(k in oldPlots) {
            plotinfo = oldPlots[k];
            if(plotinfo.plotgroup) plotinfo.plotgroup.remove();
        }
    }

    const hadGl = (oldFullLayout._has && oldFullLayout._has('gl'));
    const hasGl = (newFullLayout._has && newFullLayout._has('gl'));

    if(hadGl && !hasGl) {
        for(k in oldPlots) {
            plotinfo = oldPlots[k];
            if(plotinfo._scene) plotinfo._scene.destroy();
        }
    }

    // delete any titles we don't need anymore
    // check if axis list has changed, and if so clear old titles
    if(oldSubplotList.xaxis && oldSubplotList.yaxis) {
        const oldAxIDs = axisIds.listIds({_fullLayout: oldFullLayout});
        for(i = 0; i < oldAxIDs.length; i++) {
            const oldAxId = oldAxIDs[i];
            if(!newFullLayout[axisIds.id2name(oldAxId)]) {
                oldFullLayout._infolayer.selectAll('.g-' + oldAxId + 'title').remove();
            }
        }
    }

    const hadCartesian = (oldFullLayout._has && oldFullLayout._has('cartesian'));
    const hasCartesian = (newFullLayout._has && newFullLayout._has('cartesian'));

    if(hadCartesian && !hasCartesian) {
        // if we've gotten rid of all cartesian traces, remove all the subplot svg items

        purgeSubplotLayers(oldFullLayout._cartesianlayer.selectAll('.subplot'), oldFullLayout);
        oldFullLayout._defs.selectAll('.axesclip').remove();
        delete oldFullLayout._axisConstraintGroups;
        delete oldFullLayout._axisMatchGroups;
    } else if(oldSubplotList.cartesian) {
        // otherwise look for subplots we need to remove

        for(i = 0; i < oldSubplotList.cartesian.length; i++) {
            const oldSubplotId = oldSubplotList.cartesian[i];

            // skip zindex layes in this process
            if(oldSubplotId.indexOf(zindexSeparator) !== -1) continue;

            if(!newPlots[oldSubplotId]) {
                const selector = '.' + oldSubplotId + ',.' + oldSubplotId + '-x,.' + oldSubplotId + '-y';
                oldFullLayout._cartesianlayer.selectAll(selector).remove();
                removeSubplotExtras(oldSubplotId, oldFullLayout);
            }
        }
    }
};

export const drawFramework = function(gd: GraphDiv): any {
    const fullLayout = gd._fullLayout;
    const calcdata = gd.calcdata;
    let i;

    // Separate traces by zorder and plot each zorder group separately
    const traceZorderGroups: any = {};
    for(i = 0; i < calcdata.length; i++) {
        const cdi = calcdata[i][0];
        const trace = cdi.trace;

        const zi = trace.zorder || 0;
        if(!traceZorderGroups[zi]) traceZorderGroups[zi] = [];
        traceZorderGroups[zi].push(cdi);
    }

    // Group by zorder group in ascending order
    let zindices = Object.keys(traceZorderGroups)
        .map(Number)
        .sort(sorterAsc);

    if(!zindices.length) zindices = [0];

    fullLayout._zindices = zindices;

    const initialSubplotData = makeSubplotData(gd);

    const len = initialSubplotData.length;
    let subplotData: any[] = [];
    for(i = 0; i < len; i++) {
        subplotData[i] = (initialSubplotData[i].slice() as any);
    }

    for(let z = 1; z < zindices.length; z++) {
        const newSubplotData: any[] = [];
        for(i = 0; i < len; i++) {
            newSubplotData[i] = (initialSubplotData[i].slice() as any);
            newSubplotData[i][0] += (zindexSeparator + (z + 1) as any);
        }
        subplotData = subplotData.concat(newSubplotData);
    }

    const subplotLayers = fullLayout._cartesianlayer.selectAll('.subplot')
        .data(subplotData, String);

    subplotLayers.enter().append('g')
        .attr('class', function(d: any) { return 'subplot ' + d[0]; });

    subplotLayers.order();

    subplotLayers.exit()
        .call(purgeSubplotLayers, fullLayout);

    subplotLayers.each(function(this: any, d: any) {
        const id = d[0];
        const posZ = id.indexOf(zindexSeparator);
        const hasZ = posZ !== -1;
        const idWithoutZ = hasZ ?
            id.slice(0, posZ) :
            id;

        let plotinfo = fullLayout._plots[id];
        if(!plotinfo) {
            plotinfo = extendFlat({}, fullLayout._plots[idWithoutZ]);

            if(plotinfo) {
                plotinfo.id = id;
                fullLayout._plots[id] = plotinfo;
                fullLayout._subplots.cartesian.push(id);
            }
        }

        if(plotinfo) {
            plotinfo.plotgroup = select(this);
            makeSubplotLayer(gd, plotinfo);

            if(!hasZ) {
                // make separate drag layers for each subplot,
                // but append them to paper rather than the plot groups,
                // so they end up on top of the rest
                plotinfo.draglayer = ensureSingle(fullLayout._draggers, 'g', id);
            }
        }
    });
};

export const rangePlot = function(gd?: any, plotinfo?: any, cdSubplot?: any): void {
    makeSubplotLayer(gd, plotinfo);
    plotOne(gd, plotinfo, cdSubplot);
    plotsStyle(gd);
};

function makeSubplotData(gd?: any): any {
    const fullLayout = gd._fullLayout;
    const numZ = fullLayout._zindices.length;

    const ids = fullLayout._subplots.cartesian;
    const len = ids.length;
    let i, j, id, plotinfo, xa, ya;

    // split 'regular' and 'overlaying' subplots
    const regulars: any[] = [];
    const overlays: any[] = [];

    for(i = 0; i < len; i++) {
        id = ids[i];
        plotinfo = fullLayout._plots[id];
        xa = plotinfo.xaxis;
        ya = plotinfo.yaxis;

        const xa2 = xa._mainAxis;
        const ya2 = ya._mainAxis;
        const mainplot = xa2._id + ya2._id;
        const mainplotinfo = fullLayout._plots[mainplot];
        plotinfo.overlays = [];

        if(mainplot !== id && mainplotinfo) {
            plotinfo.mainplot = mainplot;
            plotinfo.mainplotinfo = mainplotinfo;
            overlays.push(id);
        } else {
            plotinfo.mainplot = undefined;
            plotinfo.mainplotinfo = undefined;
            regulars.push(id);
        }
    }

    // fill in list of overlaying subplots in 'main plot'
    for(i = 0; i < overlays.length; i++) {
        id = overlays[i];
        plotinfo = fullLayout._plots[id];
        plotinfo.mainplotinfo.overlays.push(plotinfo);
    }

    // put 'regular' subplot data before 'overlaying'
    const subplotIds = regulars.concat(overlays);
    const subplotData: any[] = [];

    for(i = 0; i < len; i++) {
        id = subplotIds[i];
        plotinfo = fullLayout._plots[id];
        xa = plotinfo.xaxis;
        ya = plotinfo.yaxis;

        let d: any[] = [];

        for(let z = 1; z <= numZ; z++) {
            let zStr = '';
            if(z > 1) zStr += zindexSeparator + z;

            // use info about axis layer and overlaying pattern
            // to clean what need to be cleaned up in exit selection
            d.push(id + zStr);
            for(j = 0; j < plotinfo.overlays.length; j++) {
                d.push(plotinfo.overlays[j].id + zStr);
            }
        }

        d = d.concat([
            xa.layer,
            ya.layer,
            xa.overlaying || '',
            ya.overlaying || ''
        ] as any);

        subplotData.push(d);
    }
    return subplotData;
}

function makeSubplotLayer(gd?: any, plotinfo?: any): void {
    const fullLayout = gd._fullLayout;
    const plotgroup = plotinfo.plotgroup;
    const id = plotinfo.id;

    const posZ = id.indexOf(zindexSeparator);
    const hasZ = posZ !== -1;

    const xLayer = (constants.layerValue2layerClass as any)[plotinfo.xaxis.layer];
    const yLayer = (constants.layerValue2layerClass as any)[plotinfo.yaxis.layer];
    const hasOnlyLargeSploms = fullLayout._hasOnlyLargeSploms;

    const hasMultipleZ = fullLayout._zindices.length > 1;
    const mainplotinfo = plotinfo.mainplotinfo;

    if(!plotinfo.mainplot || hasMultipleZ) {
        if(hasOnlyLargeSploms) {
            // TODO could do even better
            // - we don't need plot (but we would have to mock it in lsInner
            //   and other places
            // - we don't (x|y)lines and (x|y)axislayer for most subplots
            //   usually just the bottom x and left y axes.
            plotinfo.xlines = ensureSingle(plotgroup, 'path', 'xlines-above');
            plotinfo.ylines = ensureSingle(plotgroup, 'path', 'ylines-above');
            plotinfo.xaxislayer = ensureSingle(plotgroup, 'g', 'xaxislayer-above');
            plotinfo.yaxislayer = ensureSingle(plotgroup, 'g', 'yaxislayer-above');
        } else {
            if(!hasZ) {
                const backLayer = ensureSingle(plotgroup, 'g', 'layer-subplot');
                plotinfo.shapelayer = ensureSingle(backLayer, 'g', 'shapelayer');
                plotinfo.imagelayer = ensureSingle(backLayer, 'g', 'imagelayer');

                if(mainplotinfo && hasMultipleZ) {
                    plotinfo.minorGridlayer = mainplotinfo.minorGridlayer;
                    plotinfo.gridlayer = mainplotinfo.gridlayer;
                    plotinfo.zerolinelayer = mainplotinfo.zerolinelayer;
                } else {
                    plotinfo.minorGridlayer = ensureSingle(plotgroup, 'g', 'minor-gridlayer');
                    plotinfo.gridlayer = ensureSingle(plotgroup, 'g', 'gridlayer');
                    plotinfo.zerolinelayer = ensureSingle(plotgroup, 'g', 'zerolinelayer');
                }

                const betweenLayer = ensureSingle(plotgroup, 'g', 'layer-between');
                plotinfo.shapelayerBetween = ensureSingle(betweenLayer, 'g', 'shapelayer');
                plotinfo.imagelayerBetween = ensureSingle(betweenLayer, 'g', 'imagelayer');

                ensureSingle(plotgroup, 'path', 'xlines-below');
                ensureSingle(plotgroup, 'path', 'ylines-below');
                plotinfo.overlinesBelow = ensureSingle(plotgroup, 'g', 'overlines-below');

                ensureSingle(plotgroup, 'g', 'xaxislayer-below');
                ensureSingle(plotgroup, 'g', 'yaxislayer-below');
                plotinfo.overaxesBelow = ensureSingle(plotgroup, 'g', 'overaxes-below');
            }

            plotinfo.overplot = ensureSingle(plotgroup, 'g', 'overplot');
            plotinfo.plot = ensureSingle(plotinfo.overplot, 'g', id);

            if(mainplotinfo && hasMultipleZ) {
                plotinfo.zerolinelayerAbove = mainplotinfo.zerolinelayerAbove;
            } else {
                plotinfo.zerolinelayerAbove = ensureSingle(plotgroup, 'g', 'zerolinelayer-above');
            }

            if(!hasZ) {
                plotinfo.xlines = ensureSingle(plotgroup, 'path', 'xlines-above');
                plotinfo.ylines = ensureSingle(plotgroup, 'path', 'ylines-above');
                plotinfo.overlinesAbove = ensureSingle(plotgroup, 'g', 'overlines-above');

                ensureSingle(plotgroup, 'g', 'xaxislayer-above');
                ensureSingle(plotgroup, 'g', 'yaxislayer-above');
                plotinfo.overaxesAbove = ensureSingle(plotgroup, 'g', 'overaxes-above');

                // set refs to correct layers as determined by 'axis.layer'
                plotinfo.xlines = plotgroup.select('.xlines-' + xLayer);
                plotinfo.ylines = plotgroup.select('.ylines-' + yLayer);
                plotinfo.xaxislayer = plotgroup.select('.xaxislayer-' + xLayer);
                plotinfo.yaxislayer = plotgroup.select('.yaxislayer-' + yLayer);
            }
        }
    } else {
        const mainplotgroup = mainplotinfo.plotgroup;
        const xId = id + '-x';
        const yId = id + '-y';

        // now make the components of overlaid subplots
        // overlays don't have backgrounds, and append all
        // their other components to the corresponding
        // extra groups of their main plots.

        plotinfo.minorGridlayer = mainplotinfo.minorGridlayer;
        plotinfo.gridlayer = mainplotinfo.gridlayer;
        plotinfo.zerolinelayer = mainplotinfo.zerolinelayer;
        plotinfo.zerolinelayerAbove = mainplotinfo.zerolinelayerAbove;

        ensureSingle(mainplotinfo.overlinesBelow, 'path', xId);
        ensureSingle(mainplotinfo.overlinesBelow, 'path', yId);
        ensureSingle(mainplotinfo.overaxesBelow, 'g', xId);
        ensureSingle(mainplotinfo.overaxesBelow, 'g', yId);

        plotinfo.plot = ensureSingle(mainplotinfo.overplot, 'g', id);

        ensureSingle(mainplotinfo.overlinesAbove, 'path', xId);
        ensureSingle(mainplotinfo.overlinesAbove, 'path', yId);
        ensureSingle(mainplotinfo.overaxesAbove, 'g', xId);
        ensureSingle(mainplotinfo.overaxesAbove, 'g', yId);

        // set refs to correct layers as determined by 'abovetraces'
        plotinfo.xlines = mainplotgroup.select('.overlines-' + xLayer).select('.' + xId);
        plotinfo.ylines = mainplotgroup.select('.overlines-' + yLayer).select('.' + yId);
        plotinfo.xaxislayer = mainplotgroup.select('.overaxes-' + xLayer).select('.' + xId);
        plotinfo.yaxislayer = mainplotgroup.select('.overaxes-' + yLayer).select('.' + yId);
    }

    if(!hasZ) {
        // common attributes for all subplots, overlays or not

        if(!hasOnlyLargeSploms) {
            ensureSingleAndAddDatum(plotinfo.minorGridlayer, 'g', plotinfo.xaxis._id);
            ensureSingleAndAddDatum(plotinfo.minorGridlayer, 'g', plotinfo.yaxis._id);
            const minorGridNode = plotinfo.minorGridlayer.node();
            if(minorGridNode) {
                select(minorGridNode).selectChildren('g')
                    .sort(axisIds.idSort);
            }

            ensureSingleAndAddDatum(plotinfo.gridlayer, 'g', plotinfo.xaxis._id);
            ensureSingleAndAddDatum(plotinfo.gridlayer, 'g', plotinfo.yaxis._id);
            const gridNode = plotinfo.gridlayer.node();
            if(gridNode) {
                select(gridNode).selectChildren('g')
                    .sort(axisIds.idSort);
            }
        }

        plotinfo.xlines
            .style('fill', 'none')
            .classed('crisp', true);

        plotinfo.ylines
            .style('fill', 'none')
            .classed('crisp', true);
    }
}

function purgeSubplotLayers(layers?: any, fullLayout?: any): void {
    if(!layers) return;

    const overlayIdsToRemove: any = {};

    layers.each(function(this: any, d: any) {
        const id = d[0];
        const plotgroup = select(this);

        plotgroup.remove();
        removeSubplotExtras(id, fullLayout);
        overlayIdsToRemove[id] = true;

        // do not remove individual axis <clipPath>s here
        // as other subplots may need them
    });

    // must remove overlaid subplot trace layers 'manually'

    for(const k in fullLayout._plots) {
        const subplotInfo = fullLayout._plots[k];
        const overlays = subplotInfo.overlays || [];

        for(let j = 0; j < overlays.length; j++) {
            const overlayInfo = overlays[j];

            if(overlayIdsToRemove[overlayInfo.id]) {
                overlayInfo.plot.selectAll('.trace').remove();
            }
        }
    }
}

function removeSubplotExtras(subplotId?: any, fullLayout?: any): void {
    fullLayout._draggers.selectAll('g.' + subplotId).remove();
    fullLayout._defs.select('#clip' + fullLayout._uid + subplotId + 'plot').remove();
}

export const toSVG = function(gd?: any): any {
    const imageRoot = gd._fullLayout._glimages;
    const root = select(gd).selectAll('.svg-container');
    const canvases = root.filter(function(d: any, i: any) {return i === root.size() - 1;})
        .selectAll('.gl-canvas-context, .gl-canvas-focus');

    function canvasToImage(this: any) {
        const canvas = this;
        const imageData = canvas.toDataURL('image/png');
        const image = imageRoot.append('svg:image');

        image.attr({
            xmlns: xmlnsNamespaces.svg,
            'xlink:href': imageData,
            preserveAspectRatio: 'none',
            x: 0,
            y: 0,
            width: canvas.style.width,
            height: canvas.style.height
        });
    }

    canvases.each(canvasToImage);
};

export const updateFx = _req4;

export default { name, attr, idRoot, idRegex, attrRegex, attributes, layoutAttributes, supplyLayoutDefaults, transitionAxes, finalizeSubplots, plot, clean, drawFramework, rangePlot, toSVG, updateFx };
