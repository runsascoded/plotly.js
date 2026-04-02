import { select, selectAll } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
const hasHover = typeof matchMedia === 'function' ? !matchMedia('(hover: none)').matches : typeof window !== 'undefined';
import Lib, { clearResponsive, equalDomRects, error, extendDeep, extendDeepAll, extendDeepNoArrays, extendFlat, getFullTransformMatrix, getGraphDiv, inverseTransformMatrix, isArrayOrTypedArray, isHidden, isPlainObject, isPlotDiv, isTypedArray, log, nestedProperty, noop, pushUnique, randstr, relativeAttr, sorterDes, syncOrAsync, warn } from '../lib/index.js';
import Events from '../lib/events.js';
import Queue from '../lib/queue.js';
import { getComponentMethod } from '../registry.js';
import { traceIs } from '../lib/trace_categories.js';
import PlotSchema from './plot_schema.js';
import { addLinks, allowAutoMargin, cleanPlot, clearAutoMarginIds, computeFrame, createTransitionData, dataArrayContainers, didMarginChange, doAutoMargin, doCalcdata, modifyFrames, plotAutoSize, previousPromises, purge as plotsPurge, redrag, rehover, reselect, resize, supplyAnimationDefaults, supplyDefaults, supplyDefaultsUpdateCalc, supplyFrameDefaults, transition as plotsTransition, transitionFromReact } from '../plots/plots.js';
import Axes from '../plots/cartesian/axes.js';
import handleRangeDefaults from '../plots/cartesian/range_defaults.js';
import cartesianLayoutAttributes from '../plots/cartesian/layout_attributes.js';
import { initGradients, initPatterns, makeTester } from '../components/drawing/index.js';
import Color from '../components/color/index.js';
import { initInteractions } from '../plots/cartesian/graph_interact.js';
import xmlnsNamespaces from '../constants/xmlns_namespaces.js';
import _plot_config from './plot_config.js';
const { dfltConfig } = _plot_config;
import manageArrays from './manage_arrays.js';
import helpers from './helpers.js';
import subroutines from './subroutines.js';
import editTypes from './edit_types.js';
import _constants from '../plots/cartesian/constants.js';
const { AX_NAME_PATTERN } = _constants;
import type { GraphDiv, FullLayout, FullTrace, Layout, PlotConfig } from '../../types/core';

// Lazy-resolve to avoid pulling in ~70KB selections module in lite bundle
function clearOutline(gd: GraphDiv): void { return getComponentMethod('selections', 'clearOutline')(gd); }

let numericNameWarningCount = 0;
const numericNameWarningCountLimit = 5;

/**
 * Internal plot-creation function
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 * @param {array of objects} data
 *      array of traces, containing the data and display information for each trace
 * @param {object} layout
 *      object describing the overall display of the plot,
 *      all the stuff that doesn't pertain to any individual trace
 * @param {object} config
 *      configuration options (see ./plot_config.js for more info)
 *
 * OR
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 * @param {object} figure
 *      object containing `data`, `layout`, `config`, and `frames` members
 *
 */
function _doPlot(gd?: any, data?: any, layout?: any, config?: any): any {
    let frames: any;

    gd = getGraphDiv(gd);

    // Events.init is idempotent and bails early if gd has already been init'd
    Events.init(gd);

    if (isPlainObject(data)) {
        const obj = data;
        data = obj.data;
        layout = obj.layout;
        config = obj.config;
        frames = obj.frames;
    }

    performance.mark('plotly-total-start');

    const okToPlot = Events.triggerHandler(gd, 'plotly_beforeplot', [data, layout, config]);
    if (okToPlot === false) return Promise.reject();

    // if there's no data or layout, and this isn't yet a plotly plot
    // container, log a warning to help plotly.js users debug
    if (!data && !layout && !isPlotDiv(gd)) {
        warn('Calling _doPlot as if redrawing ' + "but this container doesn't yet have a plot.", gd);
    }

    function addFrames(..._args: any[]): void {
        if (frames) {
            return addFrames(gd, frames);
        }
    }

    // transfer configuration options to gd until we move over to
    // a more OO like model
    setPlotContext(gd, config);

    if (!layout) layout = {};

    // hook class for plots main container (in case of plotly.js
    // this won't be #embedded-graph or .js-tab-contents)
    select(gd).classed('js-plotly-plot', true);

    // off-screen getBoundingClientRect testing space,
    // in #js-plotly-tester (and stored as tester)
    // so we can share cached text across tabs
    makeTester();

    // collect promises for any async actions during plotting
    // any part of the plotting code can push to gd._promises, then
    // before we move to the next step, we check that they're all
    // complete, and empty out the promise list again.
    if (!Array.isArray(gd._promises)) gd._promises = [];

    const graphWasEmpty = (gd.data || []).length === 0 && Array.isArray(data);

    // if there is already data on the graph, append the new data
    // if you only want to redraw, pass a non-array for data
    if (Array.isArray(data)) {
        helpers.cleanData(data);

        if (graphWasEmpty) gd.data = data;
        else gd.data.push.apply(gd.data, data);

        // for routines outside graph_obj that want a clean tab
        // (rather than appending to an existing one) gd.empty
        // is used to determine whether to make a new tab
        gd.empty = false;
    }

    if (!gd.layout || graphWasEmpty) {
        gd.layout = helpers.cleanLayout(layout);
    }

    performance.mark('plotly-supplyDefaults-start');
    supplyDefaults(gd);
    performance.mark('plotly-supplyDefaults-end');
    performance.measure('plotly-supplyDefaults', 'plotly-supplyDefaults-start', 'plotly-supplyDefaults-end');

    let fullLayout = gd._fullLayout;
    const hasCartesian = fullLayout._has('cartesian');

    // so we don't try to re-call _doPlot from inside
    // legend and colorbar, if margins changed
    fullLayout._replotting = true;

    // make or remake the framework if we need to
    if (graphWasEmpty || fullLayout._shouldCreateBgLayer) {
        makePlotFramework(gd);

        if (fullLayout._shouldCreateBgLayer) {
            delete fullLayout._shouldCreateBgLayer;
        }
    }

    // clear gradient and pattern defs on each .plot call, because we know we'll loop through all traces
    initGradients(gd);
    initPatterns(gd);

    // save initial show spikes once per graph
    if (graphWasEmpty) Axes.saveShowSpikeInitial(gd);

    // prepare the data and find the autorange

    // generate calcdata, if we need to
    // to force redoing calcdata, just delete it before calling _doPlot
    const recalc = !gd.calcdata || gd.calcdata.length !== (gd._fullData || []).length;
    if (recalc) {
        performance.mark('plotly-calcdata-start');
        doCalcdata(gd);
        performance.mark('plotly-calcdata-end');
        performance.measure('plotly-calcdata', 'plotly-calcdata-start', 'plotly-calcdata-end');
    }

    // in case it has changed, attach fullData traces to calcdata
    for (let i = 0; i < gd.calcdata.length; i++) {
        gd.calcdata[i][0].trace = gd._fullData[i];
    }

    // make the figure responsive
    if (gd._context.responsive) {
        if (!gd._responsiveChartHandler) {
            // Keep a reference to the resize handler to purge it down the road
            gd._responsiveChartHandler = function () {
                if (!isHidden(gd)) resize(gd);
            };

            // Listen to window resize
            window.addEventListener('resize', gd._responsiveChartHandler);
        }
    } else {
        clearResponsive(gd);
    }

    /*
     * start async-friendly code - now we're actually drawing things
     */

    const oldMargins = extendFlat({}, fullLayout._size);

    // draw framework first so that margin-pushing
    // components can position themselves correctly
    let drawFrameworkCalls = 0;
    function drawFramework() {
        const basePlotModules = fullLayout._basePlotModules;

        for (let i = 0; i < basePlotModules.length; i++) {
            if (basePlotModules[i].drawFramework) {
                basePlotModules[i].drawFramework(gd);
            }
        }

        if (!fullLayout._glcanvas && fullLayout._has('gl')) {
            fullLayout._glcanvas = fullLayout._glcontainer.selectAll('.gl-canvas').data(
                [
                    {
                        key: 'contextLayer',
                        context: true,
                        pick: false
                    },
                    {
                        key: 'focusLayer',
                        context: false,
                        pick: false
                    },
                    {
                        key: 'pickLayer',
                        context: false,
                        pick: true
                    }
                ],
                function (d?: any) {
                    return d.key;
                }
            );

            fullLayout._glcanvas = fullLayout._glcanvas
                .enter()
                .append('canvas')
                .attr('class', function (d?: any) {
                    return 'gl-canvas gl-canvas-' + d.key.replace('Layer', '');
                })
                .style('position', 'absolute')
                .style('top', 0)
                .style('left', 0)
                .style('overflow', 'visible')
                .style('pointer-events', 'none')
                .merge(fullLayout._glcanvas);
        }

        const plotGlPixelRatio = gd._context.plotGlPixelRatio;
        if (fullLayout._glcanvas) {
            fullLayout._glcanvas
                .attr('width', fullLayout.width * plotGlPixelRatio)
                .attr('height', fullLayout.height * plotGlPixelRatio)
                .style('width', fullLayout.width + 'px')
                .style('height', fullLayout.height + 'px');

            const regl = fullLayout._glcanvas.data()[0].regl;
            if (regl) {
                // Unfortunately, this can happen when relayouting to large
                // width/height on some browsers.
                if (
                    Math.floor(fullLayout.width * plotGlPixelRatio) !== regl._gl.drawingBufferWidth ||
                    Math.floor(fullLayout.height * plotGlPixelRatio) !== regl._gl.drawingBufferHeight
                ) {
                    const msg = 'WebGL context buffer and canvas dimensions do not match due to browser/WebGL bug.';
                    if (drawFrameworkCalls) {
                        error(msg);
                    } else {
                        log(msg + ' Clearing graph and plotting again.');
                        cleanPlot([], {}, gd._fullData, fullLayout);
                        supplyDefaults(gd);
                        fullLayout = gd._fullLayout;
                        doCalcdata(gd);
                        drawFrameworkCalls++;
                        return drawFramework();
                    }
                }
            }
        }

        if (fullLayout.modebar) {
            if (fullLayout.modebar.orientation === 'h') {
                fullLayout._modebardiv.style('height', null).style('width', '100%');
            } else {
                fullLayout._modebardiv.style('width', null).style('height', fullLayout.height + 'px');
            }
        }

        return previousPromises(gd);
    }

    function marginPushers() {
        // First reset the list of things that are allowed to change the margins
        // So any deleted traces or components will be wiped out of the
        // automargin calculation.
        // This means *every* margin pusher must be listed here, even if it
        // doesn't actually try to push the margins until later.
        clearAutoMarginIds(gd);

        subroutines.drawMarginPushers(gd);
        Axes.allowAutoMargin(gd);
        if (gd._fullLayout.title.text && gd._fullLayout.title.automargin) allowAutoMargin(gd, 'title.automargin');

        // TODO can this be moved elsewhere?
        if (fullLayout._has('pie')) {
            const fullData = gd._fullData;
            for (let i = 0; i < fullData.length; i++) {
                const trace = fullData[i];
                if (trace.type === 'pie' && trace.automargin) {
                    allowAutoMargin(gd, 'pie.' + trace.uid + '.automargin');
                }
            }
        }

        doAutoMargin(gd);
        return previousPromises(gd);
    }

    // in case the margins changed, draw margin pushers again
    function marginPushersAgain() {
        if (!didMarginChange(oldMargins, fullLayout._size)) return;

        return syncOrAsync([marginPushers, subroutines.layoutStyles], gd);
    }

    function positionAndAutorange() {
        if (!recalc) {
            doAutoRangeAndConstraints();
            return;
        }

        // TODO: autosize extra for text markers and images
        // see https://github.com/plotly/plotly.js/issues/1111
        return syncOrAsync(
            [
                getComponentMethod('shapes', 'calcAutorange'),
                getComponentMethod('annotations', 'calcAutorange'),
                doAutoRangeAndConstraints
            ],
            gd
        );
    }

    function doAutoRangeAndConstraints() {
        if (gd._transitioning) return;

        subroutines.doAutoRangeAndConstraints(gd);

        // store initial ranges *after* enforcing constraints, otherwise
        // we will never look like we're at the initial ranges
        if (graphWasEmpty) Axes.saveRangeInitial(gd);

        // this one is different from shapes/annotations calcAutorange
        // the others incorporate those components into ax._extremes,
        // this one actually sets the ranges in rangesliders.
        getComponentMethod('rangeslider', 'calcAutorange')(gd);
    }

    // draw ticks, titles, and calculate axis scaling (._b, ._m)
    function drawAxes() {
        return Axes.draw(gd, graphWasEmpty ? '' : 'redraw');
    }

    function timedMarginPushers() {
        performance.mark('plotly-marginPushers-start');
        const result = marginPushers();
        performance.mark('plotly-marginPushers-end');
        performance.measure('plotly-marginPushers', 'plotly-marginPushers-start', 'plotly-marginPushers-end');
        return result;
    }

    function timedDrawData() {
        performance.mark('plotly-drawData-start');
        const result = subroutines.drawData(gd);
        performance.mark('plotly-drawData-end');
        performance.measure('plotly-drawData', 'plotly-drawData-start', 'plotly-drawData-end');
        return result;
    }

    const deferAutoMargin = gd._context.deferAutoMargin;

    const seq = [previousPromises, addFrames, drawFramework];

    if (!deferAutoMargin) {
        seq.push(timedMarginPushers, marginPushersAgain);
    }

    if (hasCartesian) seq.push(positionAndAutorange);

    seq.push(subroutines.layoutStyles);
    if (hasCartesian) {
        seq.push(drawAxes, function insideTickLabelsAutorange(gd?: any) {
            const insideTickLabelsUpdaterange = gd._fullLayout._insideTickLabelsUpdaterange;
            if (insideTickLabelsUpdaterange) {
                gd._fullLayout._insideTickLabelsUpdaterange = undefined;

                return relayout(gd, insideTickLabelsUpdaterange).then(() => {
                    Axes.saveRangeInitial(gd, true);
                });
            }
        });
    }

    seq.push(
        timedDrawData,
        subroutines.finalDraw,
        initInteractions,
        addLinks,
        rehover,
        redrag,
        reselect
    );

    if (!deferAutoMargin) {
        seq.push(
            // TODO: doAutoMargin is only needed here for axis automargin, which
            // happens outside of marginPushers where all the other automargins are
            // calculated. Would be much better to separate margin calculations from
            // component drawing - see https://github.com/plotly/plotly.js/issues/2704
            doAutoMargin
        );
    }

    seq.push(previousPromises);

    // even if everything we did was synchronous, return a promise
    // so that the caller doesn't care which route we took
    let plotDone = syncOrAsync(seq, gd);
    if (!plotDone || !plotDone.then) plotDone = Promise.resolve();

    return plotDone.then(() => {
        performance.mark('plotly-total-end');
        performance.measure('plotly-total', 'plotly-total-start', 'plotly-total-end');
        emitAfterPlot(gd);

        // Deferred margin correction: schedule precise margin calculation
        // in the next animation frame so traces are visible immediately
        if (deferAutoMargin) {
            requestAnimationFrame(function () {
                performance.mark('plotly-deferredMargin-start');

                const deferredSeq: any[] = [timedMarginPushers, marginPushersAgain];
                if (hasCartesian) deferredSeq.push(positionAndAutorange);
                deferredSeq.push(subroutines.layoutStyles);
                if (hasCartesian) deferredSeq.push(drawAxes);
                deferredSeq.push(
                    timedDrawData,
                    subroutines.finalDraw,
                    doAutoMargin
                );

                let deferredDone = syncOrAsync(deferredSeq, gd);
                if (!deferredDone || !deferredDone.then) deferredDone = Promise.resolve();
                deferredDone.then(() => {
                    performance.mark('plotly-deferredMargin-end');
                    performance.measure('plotly-deferredMargin', 'plotly-deferredMargin-start', 'plotly-deferredMargin-end');
                });
            });
        }

        return gd;
    });
}

function emitAfterPlot(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    if (fullLayout._redrawFromAutoMarginCount) {
        fullLayout._redrawFromAutoMarginCount--;
    } else {
        gd.emit('plotly_afterplot');
    }
}

function setPlotConfig(obj?: any): any {
    return extendFlat(dfltConfig, obj);
}

function setBackground(gd: GraphDiv, bgColor?: any): void {
    try {
        gd._fullLayout._paper.style('background', bgColor);
    } catch (e) {
        error(e);
    }
}

function opaqueSetBackground(gd: GraphDiv, bgColor?: any): void {
    const blend = Color.combine(bgColor, 'white');
    setBackground(gd, blend);
}

function setPlotContext(gd?: any, config?: any): void {
    if (!gd._context) {
        gd._context = extendDeep({}, dfltConfig);

        // stash <base> href, used to make robust clipPath URLs
        const base = select('base');
        gd._context._baseUrl = base.size() && base.attr('href') ? window.location.href.split('#')[0] : '';
    }

    const context = gd._context;

    let i, keys, key;

    if (config) {
        keys = Object.keys(config);
        for (i = 0; i < keys.length; i++) {
            key = keys[i];
            if (key === 'editable' || key === 'edits') continue;
            if (key in context) {
                if (key === 'setBackground' && config[key] === 'opaque') {
                    context[key] = opaqueSetBackground;
                } else {
                    context[key] = config[key];
                }
            }
        }

        // now deal with editable and edits - first editable overrides
        // everything, then edits refines
        const editable = config.editable;
        if (editable !== undefined) {
            // we're not going to *use* context.editable, we're only going to
            // use context.edits... but keep it for the record
            context.editable = editable;

            keys = Object.keys(context.edits);
            for (i = 0; i < keys.length; i++) {
                context.edits[keys[i]] = editable;
            }
        }
        if (config.edits) {
            keys = Object.keys(config.edits);
            for (i = 0; i < keys.length; i++) {
                key = keys[i];
                if (key in context.edits) {
                    context.edits[key] = config.edits[key];
                }
            }
        }

        // not part of the user-facing config options
        context._exportedPlot = config._exportedPlot;
    }

    // staticPlot forces a bunch of others:
    if (context.staticPlot) {
        context.editable = false;
        context.edits = {};
        context.autosizable = false;
        context.scrollZoom = false;
        context.doubleClick = false;
        context.showTips = false;
        context.showLink = false;
        context.displayModeBar = false;
    }

    // make sure hover-only devices have mode bar visible
    if (context.displayModeBar === 'hover' && !hasHover) {
        context.displayModeBar = true;
    }

    // default and fallback for setBackground
    if (context.setBackground === 'transparent' || typeof context.setBackground !== 'function') {
        context.setBackground = setBackground;
    }

    // Check if gd has a specified widht/height to begin with
    context._hasZeroHeight = context._hasZeroHeight || gd.clientHeight === 0;
    context._hasZeroWidth = context._hasZeroWidth || gd.clientWidth === 0;

    // fill context._scrollZoom helper to help manage scrollZoom flaglist
    const szIn = context.scrollZoom;
    const szOut: any = (context._scrollZoom = {});
    if (szIn === true) {
        szOut.cartesian = 1;
        szOut.gl3d = 1;
        szOut.geo = 1;
        szOut.mapbox = 1;
        szOut.map = 1;
    } else if (typeof szIn === 'string') {
        const parts = szIn.split('+');
        for (i = 0; i < parts.length; i++) {
            szOut[parts[i]] = 1;
        }
    } else if (szIn !== false) {
        szOut.gl3d = 1;
        szOut.geo = 1;
        szOut.mapbox = 1;
        szOut.map = 1;
    }
}

// convenience function to force a full redraw, mostly for use by plotly.js
function redraw(gd?: any): any {
    gd = getGraphDiv(gd);

    if (!isPlotDiv(gd)) {
        throw new Error('This element is not a Plotly plot: ' + gd);
    }

    helpers.cleanData(gd.data);
    helpers.cleanLayout(gd.layout);

    gd.calcdata = undefined;
    return _doPlot(gd).then(() => {
        gd.emit('plotly_redraw');
        return gd;
    });
}

/**
 * Convenience function to make idempotent plot option obvious to users.
 *
 * @param gd
 * @param {Object[]} data
 * @param {Object} layout
 * @param {Object} config
 */
function newPlot(gd?: any, data?: any, layout?: any, config?: any): any {
    gd = getGraphDiv(gd);

    // remove gl contexts
    cleanPlot([], {}, gd._fullData || [], gd._fullLayout || {});

    plotsPurge(gd);
    return _doPlot(gd, data, layout, config);
}

/**
 * Wrap negative indicies to their positive counterparts.
 *
 * @param {Number[]} indices An array of indices
 * @param {Number} maxIndex The maximum index allowable (arr.length - 1)
 */
function positivifyIndices(indices?: any, maxIndex?: any): any {
    const parentLength = maxIndex + 1;
    const positiveIndices: any[] = [];
    let i;
    let index;

    for (i = 0; i < indices.length; i++) {
        index = indices[i];
        if (index < 0) {
            positiveIndices.push(parentLength + index);
        } else {
            positiveIndices.push(index);
        }
    }
    return positiveIndices;
}

/**
 * Ensures that an index array for manipulating gd.data is valid.
 *
 * Intended for use with addTraces, deleteTraces, and moveTraces.
 *
 * @param gd
 * @param indices
 * @param arrayName
 */
function assertIndexArray(gd?: any, indices?: any, arrayName?: any): void {
    let i, index;

    for (i = 0; i < indices.length; i++) {
        index = indices[i];

        // validate that indices are indeed integers
        if (index !== parseInt(index, 10)) {
            throw new Error('all values in ' + arrayName + ' must be integers');
        }

        // check that all indices are in bounds for given gd.data array length
        if (index >= gd.data.length || index < -gd.data.length) {
            throw new Error(arrayName + ' must be valid indices for gd.data.');
        }

        // check that indices aren't repeated
        if (
            indices.indexOf(index, i + 1) > -1 ||
            (index >= 0 && indices.indexOf(-gd.data.length + index) > -1) ||
            (index < 0 && indices.indexOf(gd.data.length + index) > -1)
        ) {
            throw new Error('each index in ' + arrayName + ' must be unique.');
        }
    }
}

/**
 * Private function used by Plotly.moveTraces to check input args
 *
 * @param gd
 * @param currentIndices
 * @param newIndices
 */
function checkMoveTracesArgs(gd?: any, currentIndices?: any, newIndices?: any): void {
    // check that gd has attribute 'data' and 'data' is array
    if (!Array.isArray(gd.data)) {
        throw new Error('gd.data must be an array.');
    }

    // validate currentIndices array
    if (typeof currentIndices === 'undefined') {
        throw new Error('currentIndices is a required argument.');
    } else if (!Array.isArray(currentIndices)) {
        currentIndices = [currentIndices];
    }
    assertIndexArray(gd, currentIndices, 'currentIndices');

    // validate newIndices array if it exists
    if (typeof newIndices !== 'undefined' && !Array.isArray(newIndices)) {
        newIndices = [newIndices];
    }
    if (typeof newIndices !== 'undefined') {
        assertIndexArray(gd, newIndices, 'newIndices');
    }

    // check currentIndices and newIndices are the same length if newIdices exists
    if (typeof newIndices !== 'undefined' && currentIndices.length !== newIndices.length) {
        throw new Error('current and new indices must be of equal length.');
    }
}
/**
 * A private function to reduce the type checking clutter in addTraces.
 *
 * @param gd
 * @param traces
 * @param newIndices
 */
function checkAddTracesArgs(gd?: any, traces?: any, newIndices?: any): void {
    let i, value;

    // check that gd has attribute 'data' and 'data' is array
    if (!Array.isArray(gd.data)) {
        throw new Error('gd.data must be an array.');
    }

    // make sure traces exists
    if (typeof traces === 'undefined') {
        throw new Error('traces must be defined.');
    }

    // make sure traces is an array
    if (!Array.isArray(traces)) {
        traces = [traces];
    }

    // make sure each value in traces is an object
    for (i = 0; i < traces.length; i++) {
        value = traces[i];
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
            throw new Error('all values in traces array must be non-array objects');
        }
    }

    // make sure we have an index for each trace
    if (typeof newIndices !== 'undefined' && !Array.isArray(newIndices)) {
        newIndices = [newIndices];
    }
    if (typeof newIndices !== 'undefined' && newIndices.length !== traces.length) {
        throw new Error('if indices is specified, traces.length must equal indices.length');
    }
}

/**
 * A private function to reduce the type checking clutter in spliceTraces.
 * Get all update Properties from gd.data. Validate inputs and outputs.
 * Used by prependTrace and extendTraces
 *
 * @param gd
 * @param update
 * @param indices
 * @param maxPoints
 */
function assertExtendTracesArgs(gd?: any, update?: any, indices?: any, maxPoints?: any): void {
    const maxPointsIsObject = isPlainObject(maxPoints);

    if (!Array.isArray(gd.data)) {
        throw new Error('gd.data must be an array');
    }
    if (!isPlainObject(update)) {
        throw new Error('update must be a key:value object');
    }

    if (typeof indices === 'undefined') {
        throw new Error('indices must be an integer or array of integers');
    }

    assertIndexArray(gd, indices, 'indices');

    for (const key in update) {
        /*
         * Verify that the attribute to be updated contains as many trace updates
         * as indices. Failure must result in throw and no-op
         */
        if (!Array.isArray(update[key]) || update[key].length !== indices.length) {
            throw new Error('attribute ' + key + ' must be an array of length equal to indices array length');
        }

        /*
         * if maxPoints is an object it must match keys and array lengths of 'update' 1:1
         */
        if (
            maxPointsIsObject &&
            (!(key in maxPoints) || !Array.isArray(maxPoints[key]) || maxPoints[key].length !== update[key].length)
        ) {
            throw new Error(
                'when maxPoints is set as a key:value object it must contain a 1:1 ' +
                    'correspondence with the keys and number of traces in the update object'
            );
        }
    }
}

/**
 * A private function to reduce the type checking clutter in spliceTraces.
 *
 * @param {Object|HTMLDivElement} gd
 * @param {Object} update
 * @param {Number[]} indices
 * @param {Number||Object} maxPoints
 * @return {Object[]}
 */
function getExtendProperties(gd?: any, update?: any, indices?: any, maxPoints?: any): any {
    const maxPointsIsObject = isPlainObject(maxPoints);
    const updateProps: any[] = [];
    let trace, target, prop, insert, maxp;

    // allow scalar index to represent a single trace position
    if (!Array.isArray(indices)) indices = [indices];

    // negative indices are wrapped around to their positive value. Equivalent to python indexing.
    indices = positivifyIndices(indices, gd.data.length - 1);

    // loop through all update keys and traces and harvest validated data.
    for (const key in update) {
        for (let j = 0; j < indices.length; j++) {
            /*
             * Choose the trace indexed by the indices map argument and get the prop setter-getter
             * instance that references the key and value for this particular trace.
             */
            trace = gd.data[indices[j]];
            prop = nestedProperty(trace, key);

            /*
             * Target is the existing gd.data.trace.dataArray value like "x" or "marker.size"
             * Target must exist as an Array to allow the extend operation to be performed.
             */
            target = prop.get();
            insert = update[key][j];

            if (!isArrayOrTypedArray(insert)) {
                throw new Error('attribute: ' + key + ' index: ' + j + ' must be an array');
            }
            if (!isArrayOrTypedArray(target)) {
                throw new Error('cannot extend missing or non-array attribute: ' + key);
            }
            if (target.constructor !== insert.constructor) {
                throw new Error('cannot extend array with an array of a different type: ' + key);
            }

            /*
             * maxPoints may be an object map or a scalar. If object select the key:value, else
             * Use the scalar maxPoints for all key and trace combinations.
             */
            maxp = maxPointsIsObject ? maxPoints[key][j] : maxPoints;

            // could have chosen null here, -1 just tells us to not take a window
            if (!isNumeric(maxp)) maxp = -1;

            /*
             * Wrap the nestedProperty in an object containing required data
             * for lengthening and windowing this particular trace - key combination.
             * Flooring maxp mirrors the behaviour of floats in the Array.slice JSnative function.
             */
            updateProps.push({
                prop: prop,
                target: target,
                insert: insert,
                maxp: Math.floor(maxp)
            });
        }
    }

    // all target and insertion data now validated
    return updateProps;
}

/**
 * A private function to key Extend and Prepend traces DRY
 *
 * @param {Object|HTMLDivElement} gd
 * @param {Object} update
 * @param {Number[]} indices
 * @param {Number||Object} maxPoints
 * @param {Function} updateArray
 * @return {Object}
 */
function spliceTraces(gd?: any, update?: any, indices?: any, maxPoints?: any, updateArray?: any): any {
    assertExtendTracesArgs(gd, update, indices, maxPoints);

    const updateProps = getExtendProperties(gd, update, indices, maxPoints);
    const undoUpdate: any = {};
    const undoPoints: any = {};

    for (let i = 0; i < updateProps.length; i++) {
        const prop = updateProps[i].prop;
        const maxp = updateProps[i].maxp;

        // return new array and remainder
        const out: any = updateArray(updateProps[i].target, updateProps[i].insert, maxp);
        prop.set(out[0]);

        // build the inverse update object for the undo operation
        if (!Array.isArray(undoUpdate[prop.astr])) undoUpdate[prop.astr] = [];
        undoUpdate[prop.astr].push(out[1]);

        // build the matching maxPoints undo object containing original trace lengths
        if (!Array.isArray(undoPoints[prop.astr])) undoPoints[prop.astr] = [];
        undoPoints[prop.astr].push(updateProps[i].target.length);
    }

    return { update: undoUpdate, maxPoints: undoPoints };
}

function concatTypedArray(arr0?: any, arr1?: any): any {
    const arr2 = new arr0.constructor(arr0.length + arr1.length);
    arr2.set(arr0);
    arr2.set(arr1, arr0.length);
    return arr2;
}

/**
 * extend && prepend traces at indices with update arrays, window trace lengths to maxPoints
 *
 * Extend and Prepend have identical APIs. Prepend inserts an array at the head while Extend
 * inserts an array off the tail. Prepend truncates the tail of the array - counting maxPoints
 * from the head, whereas Extend truncates the head of the array, counting backward maxPoints
 * from the tail.
 *
 * If maxPoints is undefined, nonNumeric, negative or greater than extended trace length no
 * truncation / windowing will be performed. If its zero, well the whole trace is truncated.
 *
 * @param {Object|HTMLDivElement} gd The graph div
 * @param {Object} update The key:array map of target attributes to extend
 * @param {Number|Number[]} indices The locations of traces to be extended
 * @param {Number|Object} [maxPoints] Number of points for trace window after lengthening.
 *
 */
function extendTraces(gd?: any, update?: any, indices?: any, maxPoints?: any, ...rest: any[]): any {
    gd = getGraphDiv(gd);

    function updateArray(target?: any, insert?: any, maxp?: any) {
        let newArray, remainder;

        if (isTypedArray(target)) {
            if (maxp < 0) {
                const none = new target.constructor(0);
                const both = concatTypedArray(target, insert);

                if (maxp < 0) {
                    newArray = both;
                    remainder = none;
                } else {
                    newArray = none;
                    remainder = both;
                }
            } else {
                newArray = new target.constructor(maxp);
                remainder = new target.constructor(target.length + insert.length - maxp);

                if (maxp === insert.length) {
                    newArray.set(insert);
                    remainder.set(target);
                } else if (maxp < insert.length) {
                    const numberOfItemsFromInsert = insert.length - maxp;

                    newArray.set(insert.subarray(numberOfItemsFromInsert));
                    remainder.set(target);
                    remainder.set(insert.subarray(0, numberOfItemsFromInsert), target.length);
                } else {
                    const numberOfItemsFromTarget = maxp - insert.length;
                    const targetBegin = target.length - numberOfItemsFromTarget;

                    newArray.set(target.subarray(targetBegin));
                    newArray.set(insert, numberOfItemsFromTarget);
                    remainder.set(target.subarray(0, targetBegin));
                }
            }
        } else {
            newArray = target.concat(insert);
            remainder = maxp >= 0 && maxp < newArray.length ? newArray.splice(0, newArray.length - maxp) : [];
        }

        return [newArray, remainder];
    }

    const undo = spliceTraces(gd, update, indices, maxPoints, updateArray);
    const promise = redraw(gd);
    const undoArgs = [gd, undo.update, indices, undo.maxPoints];
    Queue.add(gd, prependTraces, undoArgs, extendTraces, [gd, update, indices, maxPoints, ...rest]);

    return promise;
}

function prependTraces(gd?: any, update?: any, indices?: any, maxPoints?: any, ...rest: any[]): any {
    gd = getGraphDiv(gd);

    function updateArray(target?: any, insert?: any, maxp?: any) {
        let newArray, remainder;

        if (isTypedArray(target)) {
            if (maxp <= 0) {
                const none = new target.constructor(0);
                const both = concatTypedArray(insert, target);

                if (maxp < 0) {
                    newArray = both;
                    remainder = none;
                } else {
                    newArray = none;
                    remainder = both;
                }
            } else {
                newArray = new target.constructor(maxp);
                remainder = new target.constructor(target.length + insert.length - maxp);

                if (maxp === insert.length) {
                    newArray.set(insert);
                    remainder.set(target);
                } else if (maxp < insert.length) {
                    const numberOfItemsFromInsert = insert.length - maxp;

                    newArray.set(insert.subarray(0, numberOfItemsFromInsert));
                    remainder.set(insert.subarray(numberOfItemsFromInsert));
                    remainder.set(target, numberOfItemsFromInsert);
                } else {
                    const numberOfItemsFromTarget = maxp - insert.length;

                    newArray.set(insert);
                    newArray.set(target.subarray(0, numberOfItemsFromTarget), insert.length);
                    remainder.set(target.subarray(numberOfItemsFromTarget));
                }
            }
        } else {
            newArray = insert.concat(target);
            remainder = maxp >= 0 && maxp < newArray.length ? newArray.splice(maxp, newArray.length) : [];
        }

        return [newArray, remainder];
    }

    const undo = spliceTraces(gd, update, indices, maxPoints, updateArray);
    const promise = redraw(gd);
    const undoArgs = [gd, undo.update, indices, undo.maxPoints];
    Queue.add(gd, extendTraces, undoArgs, prependTraces, [gd, update, indices, maxPoints, ...rest]);

    return promise;
}

/**
 * Add data traces to an existing graph div.
 *
 * @param {Object|HTMLDivElement} gd The graph div
 * @param {Object[]} gd.data The array of traces we're adding to
 * @param {Object[]|Object} traces The object or array of objects to add
 * @param {Number[]|Number} [newIndices=[gd.data.length]] Locations to add traces
 *
 */
function addTraces(gd?: any, traces?: any, newIndices?: any): any {
    gd = getGraphDiv(gd);

    const currentIndices: any[] = [];
    const undoFunc = deleteTraces;
    const redoFunc = addTraces;
    const undoArgs = [gd, currentIndices];
    const redoArgs = [gd, traces]; // no newIndices here
    let i;
    let promise;

    // all validation is done elsewhere to remove clutter here
    checkAddTracesArgs(gd, traces, newIndices);

    // make sure traces is an array
    if (!Array.isArray(traces)) {
        traces = [traces];
    }

    // make sure traces do not repeat existing ones
    traces = traces.map((trace?: any) => extendFlat({}, trace));

    helpers.cleanData(traces);

    // add the traces to gd.data (no redrawing yet!)
    for (i = 0; i < traces.length; i++) {
        gd.data.push(traces[i]);
    }

    // to continue, we need to call moveTraces which requires currentIndices
    for (i = 0; i < traces.length; i++) {
        currentIndices.push(-traces.length + i);
    }

    // if the user didn't define newIndices, they just want the traces appended
    // i.e., we can simply redraw and be done
    if (typeof newIndices === 'undefined') {
        promise = redraw(gd);
        Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
        return promise;
    }

    // make sure indices is property defined
    if (!Array.isArray(newIndices)) {
        newIndices = [newIndices];
    }

    try {
        // this is redundant, but necessary to not catch later possible errors!
        checkMoveTracesArgs(gd, currentIndices, newIndices);
    } catch (error) {
        // something went wrong, reset gd to be safe and rethrow error
        gd.data.splice(gd.data.length - traces.length, traces.length);
        throw error;
    }

    // if we're here, the user has defined specific places to place the new traces
    // this requires some extra work that moveTraces will do
    Queue.startSequence(gd);
    Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);
    promise = moveTraces(gd, currentIndices, newIndices);
    Queue.stopSequence(gd);
    return promise;
}

/**
 * Delete traces at `indices` from gd.data array.
 *
 * @param {Object|HTMLDivElement} gd The graph div
 * @param {Object[]} gd.data The array of traces we're removing from
 * @param {Number|Number[]} indices The indices
 */
function deleteTraces(gd?: any, indices?: any): any {
    gd = getGraphDiv(gd);

    const traces: any[] = [];
    const undoFunc = addTraces;
    const redoFunc = deleteTraces;
    const undoArgs = [gd, traces, indices];
    const redoArgs = [gd, indices];
    let i;
    let deletedTrace;

    // make sure indices are defined
    if (typeof indices === 'undefined') {
        throw new Error('indices must be an integer or array of integers.');
    } else if (!Array.isArray(indices)) {
        indices = [indices];
    }
    assertIndexArray(gd, indices, 'indices');

    // convert negative indices to positive indices
    indices = positivifyIndices(indices, gd.data.length - 1);

    // we want descending here so that splicing later doesn't affect indexing
    indices.sort(sorterDes);
    for (i = 0; i < indices.length; i += 1) {
        deletedTrace = gd.data.splice(indices[i], 1)[0];
        traces.push(deletedTrace);
    }

    const promise = redraw(gd);
    Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);

    return promise;
}

/**
 * Move traces at currentIndices array to locations in newIndices array.
 *
 * If newIndices is omitted, currentIndices will be moved to the end. E.g.,
 * these are equivalent:
 *
 * Plotly.moveTraces(gd, [1, 2, 3], [-3, -2, -1])
 * Plotly.moveTraces(gd, [1, 2, 3])
 *
 * @param {Object|HTMLDivElement} gd The graph div
 * @param {Object[]} gd.data The array of traces we're removing from
 * @param {Number|Number[]} currentIndices The locations of traces to be moved
 * @param {Number|Number[]} [newIndices] The locations to move traces to
 *
 * Example calls:
 *
 *      // move trace i to location x
 *      Plotly.moveTraces(gd, i, x)
 *
 *      // move trace i to end of array
 *      Plotly.moveTraces(gd, i)
 *
 *      // move traces i, j, k to end of array (i != j != k)
 *      Plotly.moveTraces(gd, [i, j, k])
 *
 *      // move traces [i, j, k] to [x, y, z] (i != j != k) (x != y != z)
 *      Plotly.moveTraces(gd, [i, j, k], [x, y, z])
 *
 *      // reorder all traces (assume there are 5--a, b, c, d, e)
 *      Plotly.moveTraces(gd, [b, d, e, a, c])  // same as 'move to end'
 */
function moveTraces(gd?: any, currentIndices?: any, newIndices?: any): any {
    gd = getGraphDiv(gd);

    const newData: any[] = [];
    const movingTraceMap: any[] = [];
    const undoFunc = moveTraces;
    const redoFunc = moveTraces;
    const undoArgs = [gd, newIndices, currentIndices];
    const redoArgs = [gd, currentIndices, newIndices];
    let i;

    // to reduce complexity here, check args elsewhere
    // this throws errors where appropriate
    checkMoveTracesArgs(gd, currentIndices, newIndices);

    // make sure currentIndices is an array
    currentIndices = Array.isArray(currentIndices) ? currentIndices : [currentIndices];

    // if undefined, define newIndices to point to the end of gd.data array
    if (typeof newIndices === 'undefined') {
        newIndices = [];
        for (i = 0; i < currentIndices.length; i++) {
            newIndices.push(-currentIndices.length + i);
        }
    }

    // make sure newIndices is an array if it's user-defined
    newIndices = Array.isArray(newIndices) ? newIndices : [newIndices];

    // convert negative indices to positive indices (they're the same length)
    currentIndices = positivifyIndices(currentIndices, gd.data.length - 1);
    newIndices = positivifyIndices(newIndices, gd.data.length - 1);

    // at this point, we've coerced the index arrays into predictable forms

    // get the traces that aren't being moved around
    for (i = 0; i < gd.data.length; i++) {
        // if index isn't in currentIndices, include it in ignored!
        if (currentIndices.indexOf(i) === -1) {
            newData.push(gd.data[i]);
        }
    }

    // get a mapping of indices to moving traces
    for (i = 0; i < currentIndices.length; i++) {
        movingTraceMap.push({ newIndex: newIndices[i], trace: gd.data[currentIndices[i]] });
    }

    // reorder this mapping by newIndex, ascending
    movingTraceMap.sort((a?: any, b?: any) => a.newIndex - b.newIndex);

    // now, add the moving traces back in, in order!
    for (i = 0; i < movingTraceMap.length; i += 1) {
        newData.splice((movingTraceMap[i] as any).newIndex, 0, (movingTraceMap[i] as any).trace);
    }

    gd.data = newData;

    const promise = redraw(gd);
    Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);

    return promise;
}

/**
 * restyle: update trace attributes of an existing plot
 *
 * Can be called two ways.
 *
 * Signature 1:
 * @param {String | HTMLDivElement} gd
 *  the id or DOM element of the graph container div
 * @param {String} astr
 *  attribute string (like `'marker.symbol'`) to update
 * @param {*} val
 *  value to give this attribute
 * @param {Number[] | Number} [traces]
 *  integer or array of integers for the traces to alter (all if omitted)
 *
 * Signature 2:
 * @param {String | HTMLDivElement} gd
 *  (as in signature 1)
 * @param {Object} aobj
 *  attribute object `{astr1: val1, astr2: val2 ...}`
 *  allows setting multiple attributes simultaneously
 * @param {Number[] | Number} [traces]
 *  (as in signature 1)
 *
 * `val` (or `val1`, `val2` ... in the object form) can be an array,
 * to apply different values to each trace.
 *
 * If the array is too short, it will wrap around (useful for
 * style files that want to specify cyclical default values).
 */
function restyle(gd?: any, astr?: any, val?: any, _traces?: any): any {
    gd = getGraphDiv(gd);
    helpers.clearPromiseQueue(gd);

    let aobj = {};
    if (typeof astr === 'string') (aobj as any)[astr] = val;
    else if (isPlainObject(astr)) {
        // the 3-arg form
        aobj = extendFlat({}, astr);
        if (_traces === undefined) _traces = val;
    } else {
        warn('Restyle fail.', astr, val, _traces);
        return Promise.reject();
    }

    if (Object.keys(aobj).length) gd.changed = true;

    const traces = helpers.coerceTraceIndices(gd, _traces);

    const specs = _restyle(gd, aobj, traces);
    const flags: any = specs.flags;

    // clear calcdata and/or axis types if required so they get regenerated
    if (flags.calc) gd.calcdata = undefined;
    if (flags.clearAxisTypes) helpers.clearAxisTypes(gd, traces, {});

    // fill in redraw sequence
    const seq: any[] = [];

    if (flags.fullReplot) {
        seq.push(_doPlot);
    } else {
        seq.push(previousPromises);

        // maybe only call Plots.supplyDataDefaults in the splom case,
        // to skip over long and slow axes defaults
        supplyDefaults(gd);

        if (flags.markerSize) {
            doCalcdata(gd);
            addAxRangeSequence(seq);

            // TODO
            // if all axes have autorange:false, then
            // proceed to subroutines.doTraceStyle(),
            // otherwise we must go through addAxRangeSequence,
            // which in general must redraws 'all' axes
        }

        if (flags.style) seq.push(subroutines.doTraceStyle);
        if (flags.colorbars) seq.push(subroutines.doColorBars);

        seq.push(emitAfterPlot);
    }

    seq.push(rehover, redrag, reselect);

    Queue.add(gd, restyle, [gd, specs.undoit, specs.traces], restyle, [gd, specs.redoit, specs.traces]);

    let plotDone = syncOrAsync(seq, gd);
    if (!plotDone || !plotDone.then) plotDone = Promise.resolve();

    return plotDone.then(() => {
        gd.emit('plotly_restyle', specs.eventData);
        return gd;
    });
}

// for undo: undefined initial vals must be turned into nulls
// so that we unset rather than ignore them
function undefinedToNull(val?: any): any {
    if (val === undefined) return null;
    return val;
}

/**
 * Factory function to wrap nestedProperty with GUI edits if necessary
 * with GUI edits we add an optional prefix to the nestedProperty constructor
 * to prepend to the attribute string in the preGUI store.
 */
function makeNP(preGUI?: any, guiEditFlag?: any): any {
    if (!guiEditFlag) return nestedProperty;

    return function (container?: any, attr?: any, prefix?: any) {
        const np: any = nestedProperty(container, attr);
        const npSet = np.set;
        np.set = function (val?: any) {
            const fullAttr = (prefix || '') + attr;
            storeCurrent(fullAttr, np.get(), val, preGUI);
            npSet(val);
        };
        return np;
    };
}

function storeCurrent(attr?: any, val?: any, newVal?: any, preGUI?: any): void {
    if (Array.isArray(val) || Array.isArray(newVal)) {
        const arrayVal = Array.isArray(val) ? val : [];
        const arrayNew = Array.isArray(newVal) ? newVal : [];
        const maxLen = Math.max(arrayVal.length, arrayNew.length);
        for (let i = 0; i < maxLen; i++) {
            storeCurrent(attr + '[' + i + ']', arrayVal[i], arrayNew[i], preGUI);
        }
    } else if (isPlainObject(val) || isPlainObject(newVal)) {
        const objVal = isPlainObject(val) ? val : {};
        const objNew = isPlainObject(newVal) ? newVal : {};
        const objBoth = extendFlat({}, objVal, objNew);
        for (const key in objBoth) {
            storeCurrent(attr + '.' + key, objVal[key], objNew[key], preGUI);
        }
    } else if (preGUI[attr] === undefined) {
        preGUI[attr] = undefinedToNull(val);
    }
}

/**
 * storeDirectGUIEdit: for routines that skip restyle/relayout and mock it
 * by emitting a plotly_restyle or plotly_relayout event, this routine
 * keeps track of the initial state in _preGUI for use by uirevision
 * Does *not* apply these changes to data/layout - that's the responsibility
 * of the calling routine.
 *
 * @param {object} container: the input attributes container (eg `layout` or a `trace`)
 * @param {object} preGUI: where original values should be stored, either
 *     `layout._preGUI` or `layout._tracePreGUI[uid]`
 * @param {object} edits: the {attr: val} object as normally passed to `relayout` etc
 */
function _storeDirectGUIEdit(container?: any, preGUI?: any, edits?: any): void {
    for (const attr in edits) {
        const np: any = nestedProperty(container, attr);
        storeCurrent(attr, np.get(), edits[attr], preGUI);
    }
}

function _restyle(gd?: any, aobj?: any, traces?: any): any {
    const fullLayout = gd._fullLayout;
    const fullData = gd._fullData;
    const data = gd.data;
    const guiEditFlag = fullLayout._guiEditing;
    const layoutNP = makeNP(fullLayout._preGUI, guiEditFlag);
    const eventData = extendDeepAll({}, aobj);
    let i;

    // initialize flags
    const flags: any = editTypes.traceFlags();

    // copies of the change (and previous values of anything affected)
    // for the undo / redo queue
    const redoit = {};
    const undoit = {};
    let axlist: any;

    // make a new empty vals array for undoit
    function a0() {
        return traces.map(() => undefined);
    }

    // for autoranging multiple axes
    function addToAxlist(axid?: any) {
        const axName = Axes.id2name(axid);
        if (axlist.indexOf(axName) === -1) axlist.push(axName);
    }

    function autorangeAttr(axName?: any) {
        return 'LAYOUT' + axName + '.autorange';
    }

    function rangeAttr(axName?: any) {
        return 'LAYOUT' + axName + '.range';
    }

    function getFullTrace(traceIndex?: any) {
        // usually fullData maps 1:1 onto data, but with groupby transforms
        // the fullData index can be greater. Take the *first* matching trace.
        for (let j = traceIndex; j < fullData.length; j++) {
            if (fullData[j]._input === data[traceIndex]) return fullData[j];
        }
        // should never get here - and if we *do* it should cause an error
        // later on undefined fullTrace is passed to nestedProperty.
    }

    // for attrs that interact (like scales & autoscales), save the
    // old vals before making the change
    // val=undefined will not set a value, just record what the value was.
    // val=null will delete the attribute
    // attr can be an array to set several at once (all to the same val)
    function doextra(attr?: any, val?: any, i?: any) {
        if (Array.isArray(attr)) {
            attr.forEach((a?: any) => {
                doextra(a, val, i);
            });
            return;
        }
        // quit if explicitly setting this elsewhere
        if (attr in aobj || helpers.hasParent(aobj, attr)) return;

        let extraparam;
        if (attr.slice(0, 6) === 'LAYOUT') {
            extraparam = layoutNP(gd.layout, attr.replace('LAYOUT', ''));
        } else {
            const tracei = traces[i];
            const preGUI = fullLayout._tracePreGUI[getFullTrace(tracei)._fullInput.uid];
            extraparam = makeNP(preGUI, guiEditFlag)(data[tracei], attr);
        }

        if (!(attr in undoit)) {
            (undoit as any)[attr] = a0();
        }
        if ((undoit as any)[attr][i] === undefined) {
            (undoit as any)[attr][i] = undefinedToNull(extraparam.get());
        }
        if (val !== undefined) {
            extraparam.set(val);
        }
    }

    function allBins(binAttr?: any) {
        return function (j?: any) {
            return fullData[j][binAttr];
        };
    }

    function arrayBins(binAttr?: any) {
        return function (vij?: any, j?: any) {
            return vij === false ? fullData[traces[j]][binAttr] : null;
        };
    }

    // now make the changes to gd.data (and occasionally gd.layout)
    // and figure out what kind of graphics update we need to do
    for (let ai in aobj) {
        if (helpers.hasParent(aobj, ai)) {
            throw new Error('cannot set ' + ai + ' and a parent attribute simultaneously');
        }

        let vi = aobj[ai];
        let cont;
        let contFull;
        let param;
        let oldVal;
        let newVal;
        let valObject;

        // Backward compatibility shim for turning histogram autobin on,
        // or freezing previous autobinned values.
        // Replace obsolete `autobin(x|y): true` with `(x|y)bins: null`
        // and `autobin(x|y): false` with the `(x|y)bins` in `fullData`
        if (ai === 'autobinx' || ai === 'autobiny') {
            ai = ai.charAt(ai.length - 1) + 'bins';
            if (Array.isArray(vi)) vi = vi.map(arrayBins(ai));
            else if (vi === false) vi = traces.map(allBins(ai));
            else vi = null;
        }

        (redoit as any)[ai] = vi;

        if (ai.slice(0, 6) === 'LAYOUT') {
            param = layoutNP(gd.layout, ai.replace('LAYOUT', ''));
            (undoit as any)[ai] = [undefinedToNull(param.get())];
            // since we're allowing val to be an array, allow it here too,
            // even though that's meaningless
            param.set(Array.isArray(vi) ? vi[0] : vi);
            // ironically, the layout attrs in restyle only require replot,
            // not relayout
            flags.calc = true;
            continue;
        }

        // set attribute in gd.data
        (undoit as any)[ai] = a0();
        for (i = 0; i < traces.length; i++) {
            cont = data[traces[i]];
            contFull = getFullTrace(traces[i]);
            const preGUI = fullLayout._tracePreGUI[contFull._fullInput.uid];
            param = makeNP(preGUI, guiEditFlag)(cont, ai);
            oldVal = param.get();
            newVal = Array.isArray(vi) ? vi[i % vi.length] : vi;

            if (newVal === undefined) continue;

            const finalPart = param.parts[param.parts.length - 1];
            const prefix = ai.slice(0, ai.length - finalPart.length - 1);
            const prefixDot = prefix ? prefix + '.' : '';
            const innerContFull = prefix ? nestedProperty(contFull, prefix).get() : contFull;

            valObject = PlotSchema.getTraceValObject(contFull, param.parts);

            if (valObject && valObject.impliedEdits && newVal !== null) {
                for (const impliedKey in valObject.impliedEdits) {
                    doextra(relativeAttr(ai, impliedKey), valObject.impliedEdits[impliedKey], i);
                }
            } else if (
                (finalPart === 'thicknessmode' || finalPart === 'lenmode') &&
                oldVal !== newVal &&
                (newVal === 'fraction' || newVal === 'pixels') &&
                innerContFull
            ) {
                // changing colorbar size modes,
                // make the resulting size not change
                // note that colorbar fractional sizing is based on the
                // original plot size, before anything (like a colorbar)
                // increases the margins

                const gs = fullLayout._size;
                const orient = innerContFull.orient;
                const topOrBottom = orient === 'top' || orient === 'bottom';
                if (finalPart === 'thicknessmode') {
                    const thicknorm = topOrBottom ? gs.h : gs.w;
                    doextra(
                        prefixDot + 'thickness',
                        innerContFull.thickness * (newVal === 'fraction' ? 1 / thicknorm : thicknorm),
                        i
                    );
                } else {
                    const lennorm = topOrBottom ? gs.w : gs.h;
                    doextra(prefixDot + 'len', innerContFull.len * (newVal === 'fraction' ? 1 / lennorm : lennorm), i);
                }
            } else if (
                ai === 'type' &&
                ((newVal === 'pie') !== (oldVal === 'pie') || (newVal === 'funnelarea') !== (oldVal === 'funnelarea'))
            ) {
                let labelsTo = 'x';
                let valuesTo = 'y';
                if ((newVal === 'bar' || oldVal === 'bar') && cont.orientation === 'h') {
                    labelsTo = 'y';
                    valuesTo = 'x';
                }
                Lib.swapAttrs(cont, ['?', '?src'], 'labels', labelsTo);
                Lib.swapAttrs(cont, ['d?', '?0'], 'label', labelsTo);
                Lib.swapAttrs(cont, ['?', '?src'], 'values', valuesTo);

                if (oldVal === 'pie' || oldVal === 'funnelarea') {
                    nestedProperty(cont, 'marker.color').set(nestedProperty(cont, 'marker.colors').get());

                    // super kludgy - but if all pies are gone we won't remove them otherwise
                    fullLayout._pielayer.selectAll('g.trace').remove();
                } else if (traceIs(cont, 'cartesian')) {
                    nestedProperty(cont, 'marker.colors').set(nestedProperty(cont, 'marker.color').get());
                }
            }

            (undoit as any)[ai][i] = undefinedToNull(oldVal);
            // set the new value - if val is an array, it's one el per trace
            // first check for attributes that get more complex alterations
            const swapAttrs = ['swapxy', 'swapxyaxes', 'orientation', 'orientationaxes'];
            if (swapAttrs.indexOf(ai) !== -1) {
                // setting an orientation: make sure it's changing
                // before we swap everything else
                if (ai === 'orientation') {
                    param.set(newVal);
                    // obnoxious that we need this level of coupling... but in order to
                    // properly handle setting orientation to `null` we need to mimic
                    // the logic inside Bars.supplyDefaults for default orientation
                    const defaultOrientation = cont.x && !cont.y ? 'h' : 'v';
                    if ((param.get() || defaultOrientation) === contFull.orientation) {
                        continue;
                    }
                } else if (ai === 'orientationaxes') {
                    // orientationaxes has no value,
                    // it flips everything and the axes

                    cont.orientation = ({ v: 'h', h: 'v' } as any)[contFull.orientation];
                }
                helpers.swapXYData(cont);
                flags.calc = flags.clearAxisTypes = true;
            } else if (dataArrayContainers.indexOf(param.parts[0]) !== -1) {
                // TODO: use manageArrays.applyContainerArrayChanges here too
                helpers.manageArrayContainers(param, newVal, undoit);
                flags.calc = true;
            } else {
                if (valObject) {
                    // must redo calcdata when restyling array values of arrayOk attributes
                    // ... but no need to this for regl-based traces
                    if (
                        valObject.arrayOk &&
                        !traceIs(contFull, 'regl') &&
                        (isArrayOrTypedArray(newVal) || isArrayOrTypedArray(oldVal))
                    ) {
                        flags.calc = true;
                    } else editTypes.update(flags, valObject);
                } else {
                    /*
                     * if we couldn't find valObject,  assume a full recalc.
                     * This can happen if you're changing type and making
                     * some other edits too, so the modules we're
                     * looking at don't have these attributes in them.
                     */
                    flags.calc = true;
                }

                // all the other ones, just modify that one attribute
                param.set(newVal);
            }
        }

        // swap the data attributes of the relevant x and y axes?
        if (['swapxyaxes', 'orientationaxes'].indexOf(ai) !== -1) {
            Axes.swap(gd, traces);
        }

        // swap hovermode if set to "compare x/y data"
        if (ai === 'orientationaxes') {
            const hovermode = nestedProperty(gd.layout, 'hovermode');
            const h = hovermode.get();
            if (h === 'x') {
                hovermode.set('y');
            } else if (h === 'y') {
                hovermode.set('x');
            } else if (h === 'x unified') {
                hovermode.set('y unified');
            } else if (h === 'y unified') {
                hovermode.set('x unified');
            }
        }

        // Major enough changes deserve autoscale and
        // non-reversed axes so people don't get confused
        //
        // Note: autobin (or its new analog bin clearing) is not included here
        // since we're not pushing bins back to gd.data, so if we have bin
        // info it was explicitly provided by the user.
        if (['orientation', 'type'].indexOf(ai) !== -1) {
            axlist = [];
            for (i = 0; i < traces.length; i++) {
                const trace = data[traces[i]];

                if (traceIs(trace, 'cartesian')) {
                    addToAxlist(trace.xaxis || 'x');
                    addToAxlist(trace.yaxis || 'y');
                }
            }

            doextra(axlist.map(autorangeAttr), true, 0);
            doextra(axlist.map(rangeAttr), [0, 1], 0);
        }
    }

    if (flags.calc || flags.plot) {
        flags.fullReplot = true;
    }

    return {
        flags: flags,
        undoit: undoit,
        redoit: redoit,
        traces: traces,
        eventData: extendDeepNoArrays([], [eventData, traces])
    };
}

/**
 * relayout: update layout attributes of an existing plot
 *
 * Can be called two ways:
 *
 * Signature 1:
 * @param {String | HTMLDivElement} gd
 *  the id or dom element of the graph container div
 * @param {String} astr
 *  attribute string (like `'xaxis.range[0]'`) to update
 * @param {*} val
 *  value to give this attribute
 *
 * Signature 2:
 * @param {String | HTMLDivElement} gd
 *  (as in signature 1)
 * @param {Object} aobj
 *  attribute object `{astr1: val1, astr2: val2 ...}`
 *  allows setting multiple attributes simultaneously
 */
function relayout(gd?: any, astr?: any, val?: any): any {
    gd = getGraphDiv(gd);
    helpers.clearPromiseQueue(gd);

    let aobj: any = {};
    if (typeof astr === 'string') {
        aobj[astr] = val;
    } else if (isPlainObject(astr)) {
        aobj = extendFlat({}, astr);
    } else {
        warn('Relayout fail.', astr, val);
        return Promise.reject();
    }

    if (Object.keys(aobj).length) gd.changed = true;

    const specs = _relayout(gd, aobj);
    const flags: any = specs.flags;

    // clear calcdata if required
    if (flags.calc) gd.calcdata = undefined;

    // fill in redraw sequence

    // even if we don't have anything left in aobj,
    // something may have happened within relayout that we
    // need to wait for
    const seq = [previousPromises];
    if (flags.layoutReplot) {
        seq.push(subroutines.layoutReplot);
    } else if (Object.keys(aobj).length) {
        axRangeSupplyDefaultsByPass(gd, flags, specs) || supplyDefaults(gd);

        if (flags.legend) seq.push(subroutines.doLegend);
        if (flags.layoutstyle) seq.push(subroutines.layoutStyles);
        if (flags.axrange) addAxRangeSequence(seq, specs.rangesAltered);
        if (flags.ticks) seq.push(subroutines.doTicksRelayout);
        if (flags.modebar) seq.push(subroutines.doModeBar);
        if (flags.camera) seq.push(subroutines.doCamera);
        if (flags.colorbars) seq.push(subroutines.doColorBars);

        seq.push(emitAfterPlot);
    }

    seq.push(rehover, redrag, reselect);

    Queue.add(gd, relayout, [gd, specs.undoit], relayout, [gd, specs.redoit]);

    let plotDone = syncOrAsync(seq, gd);
    if (!plotDone || !plotDone.then) plotDone = Promise.resolve(gd);

    return plotDone.then(() => {
        gd.emit('plotly_relayout', specs.eventData);
        return gd;
    });
}

// Optimization mostly for large splom traces where
// Plots.supplyDefaults can take > 100ms
function axRangeSupplyDefaultsByPass(gd?: any, flags?: any, specs?: any): boolean {
    const fullLayout = gd._fullLayout;

    if (!flags.axrange) return false;

    for (const k in flags) {
        if (k !== 'axrange' && flags[k]) return false;
    }

    let axIn: any, axOut: any;
    const coerce = function (attr?: any, dflt?: any) {
        return Lib.coerce(axIn, axOut, cartesianLayoutAttributes, attr, dflt);
    };

    const options = {}; // passing empty options for now!

    for (const axId in specs.rangesAltered) {
        const axName = Axes.id2name(axId);
        axIn = gd.layout[axName];
        axOut = fullLayout[axName];

        handleRangeDefaults(axIn, axOut, coerce, options);

        if (axOut._matchGroup) {
            for (const axId2 in axOut._matchGroup) {
                if (axId2 !== axId) {
                    const ax2 = fullLayout[Axes.id2name(axId2)];
                    ax2.autorange = axOut.autorange;
                    ax2.range = axOut.range.slice();
                    ax2._input.range = axOut.range.slice();
                }
            }
        }
    }

    return true;
}

function addAxRangeSequence(seq?: any, rangesAltered?: any): void {
    // N.B. leave as sequence of subroutines (for now) instead of
    // subroutine of its own so that finalDraw always gets
    // executed after drawData
    const drawAxes = rangesAltered
        ? function (gd?: any) {
              const axIds: any[] = [];
              const skipTitle = true;

              for (const id in rangesAltered) {
                  const ax: any = Axes.getFromId(gd, id);
                  axIds.push(id);

                  if ((ax.ticklabelposition || '').indexOf('inside') !== -1) {
                      if (ax._anchorAxis) {
                          axIds.push(ax._anchorAxis._id);
                      }
                  }

                  if (ax._matchGroup) {
                      for (const id2 in ax._matchGroup) {
                          if (!rangesAltered[id2]) {
                              axIds.push(id2);
                          }
                      }
                  }
              }

              return Axes.draw(gd, axIds, { skipTitle: skipTitle });
          }
        : function (gd?: any) {
              return Axes.draw(gd, 'redraw');
          };

    seq.push(
        clearOutline,
        subroutines.doAutoRangeAndConstraints,
        drawAxes,
        subroutines.drawData,
        subroutines.finalDraw
    );
}

const AX_RANGE_RE = /^[xyz]axis[0-9]*\.range(\[[0|1]\])?$/;
const AX_AUTORANGE_RE = /^[xyz]axis[0-9]*\.autorange$/;
const AX_DOMAIN_RE = /^[xyz]axis[0-9]*\.domain(\[[0|1]\])?$/;

function _relayout(gd?: any, aobj?: any): any {
    const layout = gd.layout;
    const fullLayout = gd._fullLayout;
    const guiEditFlag = fullLayout._guiEditing;
    const layoutNP = makeNP(fullLayout._preGUI, guiEditFlag);
    let keys = Object.keys(aobj);
    const axes = Axes.list(gd);
    const eventData = extendDeepAll({}, aobj);
    const arrayEdits: any = {};

    let arrayStr, i, j;

    keys = Object.keys(aobj);

    // look for 'allaxes', split out into all axes
    // in case of 3D the axis are nested within a scene which is held in _id
    for (i = 0; i < keys.length; i++) {
        if (keys[i].indexOf('allaxes') === 0) {
            for (j = 0; j < axes.length; j++) {
                const scene = axes[j]._id.slice(1);
                const axisAttr = scene.indexOf('scene') !== -1 ? scene + '.' : '';
                const newkey = keys[i].replace('allaxes', axisAttr + axes[j]._name);

                if (!aobj[newkey]) aobj[newkey] = aobj[keys[i]];
            }

            delete aobj[keys[i]];
        }
    }

    // initialize flags
    const flags: any = editTypes.layoutFlags();

    // copies of the change (and previous values of anything affected)
    // for the undo / redo queue
    const redoit: any = {};
    const undoit: any = {};

    // for attrs that interact (like scales & autoscales), save the
    // old vals before making the change
    // val=undefined will not set a value, just record what the value was.
    // attr can be an array to set several at once (all to the same val)
    function doextra(attr?: any, val?: any) {
        if (Array.isArray(attr)) {
            attr.forEach((a?: any) => {
                doextra(a, val);
            });
            return;
        }

        // if we have another value for this attribute (explicitly or
        // via a parent) do not override with this auto-generated extra
        if (attr in aobj || helpers.hasParent(aobj, attr)) return;

        const p = layoutNP(layout, attr);
        if (!(attr in undoit)) {
            undoit[attr] = undefinedToNull(p.get());
        }
        if (val !== undefined) p.set(val);
    }

    // for constraint enforcement: keep track of all axes (as {id: name})
    // we're editing the (auto)range of, so we can tell the others constrained
    // to scale with them that it's OK for them to shrink
    const rangesAltered: any = {};
    let ax;

    function recordAlteredAxis(pleafPlus?: any) {
        const axId = Axes.name2id(pleafPlus.split('.')[0]);
        rangesAltered[axId] = 1;
        return axId;
    }

    // alter gd.layout
    for (const ai in aobj) {
        if (helpers.hasParent(aobj, ai)) {
            throw new Error('cannot set ' + ai + ' and a parent attribute simultaneously');
        }

        const p = layoutNP(layout, ai);
        const vi = aobj[ai];
        const plen = p.parts.length;
        // p.parts may end with an index integer if the property is an array
        let pend = plen - 1;
        while (pend > 0 && typeof p.parts[pend] !== 'string') pend--;
        // last property in chain (leaf node)
        const pleaf = p.parts[pend];
        // leaf plus immediate parent
        const pleafPlus = p.parts[pend - 1] + '.' + pleaf;
        // trunk nodes (everything except the leaf)
        const ptrunk = p.parts.slice(0, pend).join('.');
        const parentIn: any = nestedProperty(gd.layout, ptrunk).get();
        const parentFull: any = nestedProperty(fullLayout, ptrunk).get();
        const vOld = p.get();

        if (vi === undefined) continue;

        redoit[ai] = vi;

        // axis reverse is special - it is its own inverse
        // op and has no flag.
        undoit[ai] = pleaf === 'reverse' ? vi : undefinedToNull(vOld);

        const valObject: any = PlotSchema.getLayoutValObject(fullLayout, p.parts);

        if (valObject && valObject.impliedEdits && vi !== null) {
            for (const impliedKey in valObject.impliedEdits) {
                doextra(relativeAttr(ai, impliedKey), valObject.impliedEdits[impliedKey]);
            }
        }

        // Setting width or height to null must reset the graph's width / height
        // back to its initial value as computed during the first pass in Plots.plotAutoSize.
        //
        // To do so, we must manually set them back here using the _initialAutoSize cache.
        // can't use impliedEdits for this because behavior depends on vi
        if (['width', 'height'].indexOf(ai) !== -1) {
            if (vi) {
                doextra('autosize', null);
                // currently we don't support autosize one dim only - so
                // explicitly set the other one. Note that doextra will
                // ignore this if the same relayout call also provides oppositeAttr
                const oppositeAttr = ai === 'height' ? 'width' : 'height';
                doextra(oppositeAttr, fullLayout[oppositeAttr]);
            } else {
                fullLayout[ai] = gd._initialAutoSize[ai];
            }
        } else if (ai === 'autosize') {
            // depends on vi here too, so again can't use impliedEdits
            doextra('width', vi ? null : fullLayout.width);
            doextra('height', vi ? null : fullLayout.height);
        } else if (pleafPlus.match(AX_RANGE_RE)) {
            // check autorange vs range

            recordAlteredAxis(pleafPlus);
            nestedProperty(fullLayout, ptrunk + '._inputRange').set(null);
        } else if (pleafPlus.match(AX_AUTORANGE_RE)) {
            recordAlteredAxis(pleafPlus);
            nestedProperty(fullLayout, ptrunk + '._inputRange').set(null);
            const axFull = nestedProperty(fullLayout, ptrunk).get();
            if (axFull._inputDomain) {
                // if we're autoranging and this axis has a constrained domain,
                // reset it so we don't get locked into a shrunken size
                axFull._input.domain = axFull._inputDomain.slice();
            }
        } else if (pleafPlus.match(AX_DOMAIN_RE)) {
            nestedProperty(fullLayout, ptrunk + '._inputDomain').set(null);
        }

        // toggling axis type between log and linear: we need to convert
        // positions for components that are still using linearized values,
        // not data values like newer components.
        // previously we did this for log <-> not-log, but now only do it
        // for log <-> linear
        if (pleaf === 'type') {
            ax = parentIn;
            const toLog = parentFull.type === 'linear' && vi === 'log';
            const fromLog = parentFull.type === 'log' && vi === 'linear';

            if (toLog || fromLog) {
                if (!ax || !ax.range) {
                    // 2D never gets here, but 3D does
                    // I don't think this is needed, but left here in case there
                    // are edge cases I'm not thinking of.
                    doextra(ptrunk + '.autorange', true);
                } else if (!parentFull.autorange) {
                    // toggling log without autorange: need to also recalculate ranges
                    // because log axes use linearized values for range endpoints
                    let r0 = ax.range[0];
                    let r1 = ax.range[1];
                    if (toLog) {
                        // if both limits are negative, autorange
                        if (r0 <= 0 && r1 <= 0) {
                            doextra(ptrunk + '.autorange', true);
                        }
                        // if one is negative, set it 6 orders below the other.
                        if (r0 <= 0) r0 = r1 / 1e6;
                        else if (r1 <= 0) r1 = r0 / 1e6;
                        // now set the range values as appropriate
                        doextra(ptrunk + '.range[0]', Math.log(r0) / Math.LN10);
                        doextra(ptrunk + '.range[1]', Math.log(r1) / Math.LN10);
                    } else {
                        doextra(ptrunk + '.range[0]', Math.pow(10, r0));
                        doextra(ptrunk + '.range[1]', Math.pow(10, r1));
                    }
                } else if (toLog) {
                    // just make sure the range is positive and in the right
                    // order, it'll get recalculated later
                    ax.range = ax.range[1] > ax.range[0] ? [1, 2] : [2, 1];
                }

                // clear polar view initial stash for radial range so that
                // value get recomputed in correct units
                if (
                    Array.isArray(fullLayout._subplots.polar) &&
                    fullLayout._subplots.polar.length &&
                    fullLayout[p.parts[0]] &&
                    p.parts[1] === 'radialaxis'
                ) {
                    delete fullLayout[p.parts[0]]._subplot.viewInitial['radialaxis.range'];
                }

                // Annotations and images also need to convert to/from linearized coords
                // Shapes do not need this :)
                getComponentMethod('annotations', 'convertCoords')(gd, parentFull, vi, doextra);
                getComponentMethod('images', 'convertCoords')(gd, parentFull, vi, doextra);
            } else {
                // any other type changes: the range from the previous type
                // will not make sense, so autorange it.
                doextra(ptrunk + '.autorange', true);
                doextra(ptrunk + '.range', null);
            }
            nestedProperty(fullLayout, ptrunk + '._inputRange').set(null);
        } else if (pleaf.match(AX_NAME_PATTERN)) {
            const fullProp = nestedProperty(fullLayout, ai).get();
            let newType = (vi || {}).type;

            // This can potentially cause strange behavior if the autotype is not
            // numeric (linear, because we don't auto-log) but the previous type
            // was log. That's a very strange edge case though
            if (!newType || newType === '-') newType = 'linear';
            getComponentMethod('annotations', 'convertCoords')(gd, fullProp, newType, doextra);
            getComponentMethod('images', 'convertCoords')(gd, fullProp, newType, doextra);
        }

        // alter gd.layout

        // collect array component edits for execution all together
        // so we can ensure consistent behavior adding/removing items
        // and order-independence for add/remove/edit all together in
        // one relayout call
        const containerArrayMatch = manageArrays.containerArrayMatch(ai);
        if (containerArrayMatch) {
            arrayStr = containerArrayMatch.array;
            i = containerArrayMatch.index;
            const propStr = containerArrayMatch.property;
            const updateValObject = valObject || { editType: 'calc' };

            if (i !== '' && propStr === '') {
                // special handling of undoit if we're adding or removing an element
                // ie 'annotations[2]' which can be {...} (add) or null,
                // does not work when replacing the entire array
                if (manageArrays.isAddVal(vi)) {
                    undoit[ai] = null;
                } else if (manageArrays.isRemoveVal(vi)) {
                    undoit[ai] = (nestedProperty(layout, arrayStr).get() || [])[i];
                } else {
                    warn('unrecognized full object value', aobj);
                }
            }
            editTypes.update(flags, updateValObject);

            // prepare the edits object we'll send to applyContainerArrayChanges
            if (!arrayEdits[arrayStr]) arrayEdits[arrayStr] = {};
            let objEdits = arrayEdits[arrayStr][i];
            if (!objEdits) objEdits = arrayEdits[arrayStr][i] = {};
            objEdits[propStr] = vi;

            delete aobj[ai];
        } else if (pleaf === 'reverse') {
            // handle axis reversal explicitly, as there's no 'reverse' attribute

            if (parentIn.range) parentIn.range.reverse();
            else {
                doextra(ptrunk + '.autorange', true);
                parentIn.range = [1, 0];
            }

            if (parentFull.autorange) flags.calc = true;
            else flags.plot = true;
        } else {
            if (ai === 'dragmode' && ((vi === false && vOld !== false) || (vi !== false && vOld === false))) {
                flags.plot = true;
            } else if (
                fullLayout._has('scatter-like') &&
                fullLayout._has('regl') &&
                ai === 'dragmode' &&
                (vi === 'lasso' || vi === 'select') &&
                !(vOld === 'lasso' || vOld === 'select')
            ) {
                flags.plot = true;
            } else if (valObject) editTypes.update(flags, valObject);
            else flags.calc = true;

            p.set(vi);
        }
    }

    // now we've collected component edits - execute them all together
    for (arrayStr in arrayEdits) {
        const finished = manageArrays.applyContainerArrayChanges(
            gd,
            layoutNP(layout, arrayStr),
            arrayEdits[arrayStr],
            flags,
            layoutNP
        );
        if (!finished) flags.plot = true;
    }

    // figure out if we need to recalculate axis constraints
    for (const axId in rangesAltered) {
        ax = Axes.getFromId(gd, axId);
        const group = ax && ax._constraintGroup;
        if (group) {
            // Always recalc if we're changing constrained ranges.
            // Otherwise it's possible to violate the constraints by
            // specifying arbitrary ranges for all axes in the group.
            // this way some ranges may expand beyond what's specified,
            // as they do at first draw, to satisfy the constraints.
            flags.calc = true;
            for (const groupAxId in group) {
                if (!rangesAltered[groupAxId]) {
                    Axes.getFromId(gd, groupAxId)._constraintShrinkable = true;
                }
            }
        }
    }

    // If the autosize changed or height or width was explicitly specified,
    // this triggers a redraw
    // TODO: do we really need special aobj.height/width handling here?
    // couldn't editType do this?
    if (updateAutosize(gd) || aobj.height || aobj.width) flags.plot = true;

    // update shape legends
    const shapes = fullLayout.shapes;
    for (i = 0; i < shapes.length; i++) {
        if (shapes[i].showlegend) {
            flags.calc = true;
            break;
        }
    }

    if (flags.plot || flags.calc) {
        flags.layoutReplot = true;
    }

    // now all attribute mods are done, as are
    // redo and undo so we can save them

    return {
        flags: flags,
        rangesAltered: rangesAltered,
        undoit: undoit,
        redoit: redoit,
        eventData: eventData
    };
}

/*
 * updateAutosize: we made a change, does it change the autosize result?
 * puts the new size into fullLayout
 * returns true if either height or width changed
 */
function updateAutosize(gd?: any): boolean {
    const fullLayout = gd._fullLayout;
    const oldWidth = fullLayout.width;
    const oldHeight = fullLayout.height;

    // calculate autosizing
    if (gd.layout.autosize) plotAutoSize(gd, gd.layout, fullLayout);

    return fullLayout.width !== oldWidth || fullLayout.height !== oldHeight;
}

/**
 * update: update trace and layout attributes of an existing plot
 *
 * @param {String | HTMLDivElement} gd
 *  the id or DOM element of the graph container div
 * @param {Object} traceUpdate
 *  attribute object `{astr1: val1, astr2: val2 ...}`
 *  corresponding to updates in the plot's traces
 * @param {Object} layoutUpdate
 *  attribute object `{astr1: val1, astr2: val2 ...}`
 *  corresponding to updates in the plot's layout
 * @param {Number[] | Number} [traces]
 *  integer or array of integers for the traces to alter (all if omitted)
 *
 */
function update(gd?: any, traceUpdate?: any, layoutUpdate?: any, _traces?: any): any {
    gd = getGraphDiv(gd);
    helpers.clearPromiseQueue(gd);

    if (!isPlainObject(traceUpdate)) traceUpdate = {};
    if (!isPlainObject(layoutUpdate)) layoutUpdate = {};

    if (Object.keys(traceUpdate).length) gd.changed = true;
    if (Object.keys(layoutUpdate).length) gd.changed = true;

    const traces = helpers.coerceTraceIndices(gd, _traces);

    const restyleSpecs = _restyle(gd, extendFlat({}, traceUpdate), traces);
    const restyleFlags = restyleSpecs.flags;

    const relayoutSpecs = _relayout(gd, extendFlat({}, layoutUpdate));
    const relayoutFlags: any = relayoutSpecs.flags;

    // clear calcdata and/or axis types if required
    if (restyleFlags.calc || relayoutFlags.calc) gd.calcdata = undefined;
    if (restyleFlags.clearAxisTypes) helpers.clearAxisTypes(gd, traces, layoutUpdate);

    // fill in redraw sequence
    const seq: any[] = [];

    if (relayoutFlags.layoutReplot) {
        // N.B. works fine when both
        // relayoutFlags.layoutReplot and restyleFlags.fullReplot are true
        seq.push(subroutines.layoutReplot);
    } else if (restyleFlags.fullReplot) {
        seq.push(_doPlot);
    } else {
        seq.push(previousPromises);
        axRangeSupplyDefaultsByPass(gd, relayoutFlags, relayoutSpecs) || supplyDefaults(gd);

        if (restyleFlags.style) seq.push(subroutines.doTraceStyle);
        if (restyleFlags.colorbars || relayoutFlags.colorbars) seq.push(subroutines.doColorBars);
        if (relayoutFlags.legend) seq.push(subroutines.doLegend);
        if (relayoutFlags.layoutstyle) seq.push(subroutines.layoutStyles);
        if (relayoutFlags.axrange) addAxRangeSequence(seq, relayoutSpecs.rangesAltered);
        if (relayoutFlags.ticks) seq.push(subroutines.doTicksRelayout);
        if (relayoutFlags.modebar) seq.push(subroutines.doModeBar);
        if (relayoutFlags.camera) seq.push(subroutines.doCamera);

        seq.push(emitAfterPlot);
    }

    seq.push(rehover, redrag, reselect);

    Queue.add(gd, update, [gd, restyleSpecs.undoit, relayoutSpecs.undoit, restyleSpecs.traces], update, [
        gd,
        restyleSpecs.redoit,
        relayoutSpecs.redoit,
        restyleSpecs.traces
    ]);

    let plotDone = syncOrAsync(seq, gd);
    if (!plotDone || !plotDone.then) plotDone = Promise.resolve(gd);

    return plotDone.then(() => {
        gd.emit('plotly_update', {
            data: restyleSpecs.eventData,
            layout: relayoutSpecs.eventData
        });

        return gd;
    });
}

/*
 * internal-use-only restyle/relayout/update variants that record the initial
 * values in (fullLayout|fullTrace)._preGUI so changes can be persisted across
 * Plotly.react data updates, dependent on uirevision attributes
 */
function guiEdit(func?: any): any {
    return function wrappedEdit(gd?: any, ...args: any[]) {
        gd._fullLayout._guiEditing = true;
        const p = func(gd, ...args);
        gd._fullLayout._guiEditing = false;
        return p;
    };
}

// For connecting edited layout attributes to uirevision attrs
// If no `attr` we use `match[1] + '.uirevision'`
// Ordered by most common edits first, to minimize our search time
const layoutUIControlPatterns = [
    { pattern: /^hiddenlabels/, attr: 'legend.uirevision' },
    { pattern: /^((x|y)axis\d*)\.((auto)?range|title\.text)/ },

    // showspikes and modes include those nested inside scenes
    { pattern: /axis\d*\.showspikes$/, attr: 'modebar.uirevision' },
    { pattern: /(hover|drag)mode$/, attr: 'modebar.uirevision' },

    { pattern: /^(scene\d*)\.camera/ },
    { pattern: /^(geo\d*)\.(projection|center|fitbounds)/ },
    { pattern: /^(ternary\d*\.[abc]axis)\.(min|title\.text)$/ },
    { pattern: /^(polar\d*\.radialaxis)\.((auto)?range|angle|title\.text)/ },
    { pattern: /^(polar\d*\.angularaxis)\.rotation/ },
    { pattern: /^(mapbox\d*)\.(center|zoom|bearing|pitch)/ },
    { pattern: /^(map\d*)\.(center|zoom|bearing|pitch)/ },

    { pattern: /^legend\.(x|y)$/, attr: 'editrevision' },
    { pattern: /^(shapes|annotations)/, attr: 'editrevision' },
    { pattern: /^title\.text$/, attr: 'editrevision' }
];

// same for trace attributes: if `attr` is given it's in layout,
// or with no `attr` we use `trace.uirevision`
const traceUIControlPatterns = [
    { pattern: /^selectedpoints$/, attr: 'selectionrevision' },
    // "visible" includes trace.transforms[i].styles[j].value.visible
    { pattern: /(^|value\.)visible$/, attr: 'legend.uirevision' },
    { pattern: /^dimensions\[\d+\]\.constraintrange/ },
    { pattern: /^node\.(x|y|groups)/ }, // for Sankey nodes
    { pattern: /^level$/ }, // for Sunburst, Treemap and Icicle traces

    // below this you must be in editable: true mode
    // TODO: I still put name and title with `trace.uirevision`
    // reasonable or should these be `editrevision`?
    // Also applies to axis titles up in the layout section

    // "name" also includes transform.styles
    { pattern: /(^|value\.)name$/ },
    // including nested colorbar attributes (ie marker.colorbar)
    { pattern: /colorbar\.title\.text$/ },
    { pattern: /colorbar\.(x|y)$/, attr: 'editrevision' }
];

function findUIPattern(key?: any, patternSpecs?: any): any {
    for (let i = 0; i < patternSpecs.length; i++) {
        const spec = patternSpecs[i];
        const match = key.match(spec.pattern);
        if (match) {
            const head = match[1] || '';
            return { head: head, tail: key.slice(head.length + 1), attr: spec.attr };
        }
    }
}

// We're finding the new uirevision before supplyDefaults, so do the
// inheritance manually. Note that only `undefined` inherits - other
// falsy values are returned.
function getNewRev(revAttr?: any, container?: any): any {
    let newRev = nestedProperty(container, revAttr).get();
    if (newRev !== undefined) return newRev;

    const parts = revAttr.split('.');
    parts.pop();
    while (parts.length > 1) {
        parts.pop();
        newRev = nestedProperty(container, parts.join('.') + '.uirevision').get();
        if (newRev !== undefined) return newRev;
    }

    return container.uirevision;
}

function getFullTraceIndexFromUid(uid?: any, fullData?: any): number {
    for (let i = 0; i < fullData.length; i++) {
        if (fullData[i]._fullInput.uid === uid) return i;
    }
    return -1;
}

function getTraceIndexFromUid(uid?: any, data?: any, tracei?: any): any {
    for (let i = 0; i < data.length; i++) {
        if (data[i].uid === uid) return i;
    }
    // fall back on trace order, but only if user didn't provide a uid for that trace
    return !data[tracei] || data[tracei].uid ? -1 : tracei;
}

function valsMatch(v1?: any, v2?: any): boolean {
    const v1IsObj = isPlainObject(v1);
    const v1IsArray = Array.isArray(v1);
    if (v1IsObj || v1IsArray) {
        return (
            ((v1IsObj && isPlainObject(v2)) || (v1IsArray && Array.isArray(v2))) &&
            JSON.stringify(v1) === JSON.stringify(v2)
        );
    }
    return v1 === v2;
}

function applyUIRevisions(data?: any, layout?: any, oldFullData?: any, oldFullLayout?: any): any {
    const layoutPreGUI = oldFullLayout._preGUI;
    let key, revAttr, oldRev, newRev, match, preGUIVal, newNP, newVal, head, tail;
    const bothInheritAutorange: any[] = [];
    const newAutorangeIn: any = {};
    const newRangeAccepted: any = {};
    for (key in layoutPreGUI) {
        match = findUIPattern(key, layoutUIControlPatterns);
        if (match) {
            head = match.head;
            tail = match.tail;
            revAttr = match.attr || head + '.uirevision';
            oldRev = nestedProperty(oldFullLayout, revAttr).get();
            newRev = oldRev && getNewRev(revAttr, layout);

            if (newRev && newRev === oldRev) {
                preGUIVal = layoutPreGUI[key];
                if (preGUIVal === null) preGUIVal = undefined;
                newNP = nestedProperty(layout, key);
                newVal = newNP.get();

                if (valsMatch(newVal, preGUIVal)) {
                    if (newVal === undefined && tail === 'autorange') {
                        bothInheritAutorange.push(head);
                    }
                    newNP.set(undefinedToNull(nestedProperty(oldFullLayout, key).get()));
                    continue;
                } else if (tail === 'autorange' || tail.slice(0, 6) === 'range[') {
                    // Special case for (auto)range since we push it back into the layout
                    // so all null should be treated equivalently to autorange: true with any range
                    const pre0 = layoutPreGUI[head + '.range[0]'];
                    const pre1 = layoutPreGUI[head + '.range[1]'];
                    const preAuto = layoutPreGUI[head + '.autorange'];
                    if (preAuto || (preAuto === null && pre0 === null && pre1 === null)) {
                        // Only read the input layout once and stash the result,
                        // so we get it before we start modifying it
                        if (!(head in newAutorangeIn)) {
                            const newContainer: any = nestedProperty(layout, head).get();
                            newAutorangeIn[head] =
                                newContainer &&
                                (newContainer.autorange ||
                                    (newContainer.autorange !== false &&
                                        (!newContainer.range || newContainer.range.length !== 2)));
                        }
                        if (newAutorangeIn[head]) {
                            newNP.set(undefinedToNull(nestedProperty(oldFullLayout, key).get()));
                            continue;
                        }
                    }
                }
            }
        } else {
            warn('unrecognized GUI edit: ' + key);
        }
        // if we got this far, the new value was accepted as the new starting
        // point (either because it changed or revision changed)
        // so remove it from _preGUI for next time.
        delete layoutPreGUI[key];

        if (match && match.tail.slice(0, 6) === 'range[') {
            newRangeAccepted[match.head] = 1;
        }
    }

    // More special logic for `autorange`, since it interacts with `range`:
    // If the new figure's matching `range` was kept, and `autorange`
    // wasn't supplied explicitly in either the original or the new figure,
    // we shouldn't alter that - but we may just have done that, so fix it.
    for (let i = 0; i < bothInheritAutorange.length; i++) {
        const axAttr = bothInheritAutorange[i];
        if (newRangeAccepted[axAttr]) {
            const newAx = nestedProperty(layout, axAttr).get();
            if (newAx) delete newAx.autorange;
        }
    }

    // Now traces - try to match them up by uid (in case we added/deleted in
    // the middle), then fall back on index.
    const allTracePreGUI = oldFullLayout._tracePreGUI;
    for (const uid in allTracePreGUI) {
        const tracePreGUI = allTracePreGUI[uid];
        let newTrace = null;
        let fullInput;
        for (key in tracePreGUI) {
            // wait until we know we have preGUI values to look for traces
            // but if we don't find both, stop looking at this uid
            if (!newTrace) {
                const fulli = getFullTraceIndexFromUid(uid, oldFullData);
                if (fulli < 0) {
                    // Somehow we didn't even have this trace in oldFullData...
                    // I guess this could happen with `deleteTraces` or something
                    delete allTracePreGUI[uid];
                    break;
                }
                const fullTrace = oldFullData[fulli];
                fullInput = fullTrace._fullInput;

                const newTracei = getTraceIndexFromUid(uid, data, fullInput.index);
                if (newTracei < 0) {
                    // No match in new data
                    delete allTracePreGUI[uid];
                    break;
                }
                newTrace = data[newTracei];
            }

            match = findUIPattern(key, traceUIControlPatterns);
            if (match) {
                if (match.attr) {
                    oldRev = nestedProperty(oldFullLayout, match.attr).get();
                    newRev = oldRev && getNewRev(match.attr, layout);
                } else {
                    oldRev = fullInput.uirevision;
                    // inheritance for trace.uirevision is simple, just layout.uirevision
                    newRev = (newTrace as any)!.uirevision;
                    if (newRev === undefined) newRev = layout.uirevision;
                }

                if (newRev && newRev === oldRev) {
                    preGUIVal = tracePreGUI[key];
                    if (preGUIVal === null) preGUIVal = undefined;
                    newNP = nestedProperty(newTrace, key);
                    newVal = newNP.get();
                    if (valsMatch(newVal, preGUIVal)) {
                        newNP.set(undefinedToNull(nestedProperty(fullInput, key).get()));
                        continue;
                    }
                }
            } else {
                warn('unrecognized GUI edit: ' + key + ' in trace uid ' + uid);
            }
            delete tracePreGUI[key];
        }
    }
}

/**
 * Plotly.react:
 * A plot/update method that takes the full plot state (same API as plot/newPlot)
 * and diffs to determine the minimal update pathway
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 * @param {array of objects} data
 *      array of traces, containing the data and display information for each trace
 * @param {object} layout
 *      object describing the overall display of the plot,
 *      all the stuff that doesn't pertain to any individual trace
 * @param {object} config
 *      configuration options (see ./plot_config.js for more info)
 *
 * OR
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 * @param {object} figure
 *      object containing `data`, `layout`, `config`, and `frames` members
 *
 */
function react(gd?: any, data?: any, layout?: any, config?: any): void {
    let frames: any, plotDone;
    let configChanged = false;

    function addFrames(..._args: any[]): any {
        return addFrames(gd, frames);
    }

    gd = getGraphDiv(gd);
    helpers.clearPromiseQueue(gd);

    const oldFullData = gd._fullData;
    const oldFullLayout = gd._fullLayout;

    // you can use this as the initial draw as well as to update
    if (!isPlotDiv(gd) || !oldFullData || !oldFullLayout) {
        plotDone = newPlot(gd, data, layout, config);
    } else {
        if (isPlainObject(data)) {
            const obj = data;
            data = obj.data;
            layout = obj.layout;
            config = obj.config;
            frames = obj.frames;
        }
        // assume that if there's a config at all, we're reacting to it too,
        // and completely replace the previous config
        if (config) {
            const oldConfig = extendDeepAll({}, gd._context);
            gd._context = undefined;
            setPlotContext(gd, config);
            configChanged = !helpers.collectionsAreEqual(oldConfig, gd._context);
        }

        if (configChanged) {
            // Save event listeners as newPlot will remove them
            const eventListeners = gd._ev.eventNames().map((name: any) => [name, gd._ev.listeners(name)]);
            plotDone = newPlot(gd, data, layout, config).then(() => {
                for (const [name, callbacks] of eventListeners) {
                    callbacks.forEach((cb: any) => gd.on(name, cb));
                }

                // Call react in case transition should have occurred along with config change
                return react(gd, data, layout, config);
            });
        } else {
            gd.data = data || [];
            helpers.cleanData(gd.data);
            gd.layout = layout || {};
            helpers.cleanLayout(gd.layout);

            applyUIRevisions(gd.data, gd.layout, oldFullData, oldFullLayout);

            // "true" skips updating calcdata and remapping arrays from calcTransforms,
            // which supplyDefaults usually does at the end, but we may need to NOT do
            // if the diff (which we haven't determined yet) says we'll recalc
            supplyDefaults(gd, { skipUpdateCalc: true });

            const newFullData = gd._fullData;
            const newFullLayout = gd._fullLayout;
            const immutable = newFullLayout.datarevision === undefined;
            const transition = newFullLayout.transition;

            const relayoutFlags: any = diffLayout(gd, oldFullLayout, newFullLayout, immutable, transition);
            const newDataRevision = relayoutFlags.newDataRevision;
            const restyleFlags = diffData(gd, oldFullData, newFullData, immutable, transition, newDataRevision);

            // TODO: how to translate this part of relayout to Plotly.react?
            // // Setting width or height to null must reset the graph's width / height
            // // back to its initial value as computed during the first pass in Plots.plotAutoSize.
            // //
            // // To do so, we must manually set them back here using the _initialAutoSize cache.
            // if(['width', 'height'].indexOf(ai) !== -1 && vi === null) {
            //     fullLayout[ai] = gd._initialAutoSize[ai];
            // }

            if (updateAutosize(gd)) relayoutFlags.layoutReplot = true;

            // clear calcdata and empty categories if required
            if (restyleFlags.calc || relayoutFlags.calc) {
                gd.calcdata = undefined;
                const allNames = Object.getOwnPropertyNames(newFullLayout);
                for (let q = 0; q < allNames.length; q++) {
                    const name = allNames[q];
                    const start = name.substring(0, 5);
                    if (start === 'xaxis' || start === 'yaxis') {
                        const emptyCategories = newFullLayout[name]._emptyCategories;
                        if (emptyCategories) emptyCategories();
                    }
                }
                // otherwise do the calcdata updates and calcTransform array remaps that we skipped earlier
            } else {
                supplyDefaultsUpdateCalc(gd.calcdata, newFullData);
            }

            // Note: what restyle/relayout use impliedEdits and clearAxisTypes for
            // must be handled by the user when using Plotly.react.

            // fill in redraw sequence
            const seq: any[] = [];

            if (frames) {
                gd._transitionData = {};
                createTransitionData(gd);
                seq.push(addFrames);
            }

            // Transition pathway,
            // only used when 'transition' is set by user and
            // when at least one animatable attribute has changed,
            // N.B. config changed aren't animatable
            if (newFullLayout.transition && (restyleFlags.anim || relayoutFlags.anim)) {
                if (relayoutFlags.ticks) seq.push(subroutines.doTicksRelayout);

                doCalcdata(gd);
                subroutines.doAutoRangeAndConstraints(gd);

                seq.push(function () {
                    return transitionFromReact(gd, restyleFlags, relayoutFlags, oldFullLayout);
                });
            } else if (restyleFlags.fullReplot || relayoutFlags.layoutReplot) {
                gd._fullLayout._skipDefaults = true;
                seq.push(_doPlot);
            } else {
                for (const componentType in relayoutFlags.arrays) {
                    const indices = relayoutFlags.arrays[componentType];
                    if (indices.length) {
                        const drawOne = getComponentMethod(componentType, 'drawOne');
                        if (drawOne !== noop) {
                            for (let i = 0; i < indices.length; i++) {
                                drawOne(gd, indices[i]);
                            }
                        } else {
                            const draw = getComponentMethod(componentType, 'draw');
                            if (draw === noop) {
                                throw new Error('cannot draw components: ' + componentType);
                            }
                            draw(gd);
                        }
                    }
                }

                seq.push(previousPromises);
                if (restyleFlags.style) seq.push(subroutines.doTraceStyle);
                if (restyleFlags.colorbars || relayoutFlags.colorbars) seq.push(subroutines.doColorBars);
                if (relayoutFlags.legend) seq.push(subroutines.doLegend);
                if (relayoutFlags.layoutstyle) seq.push(subroutines.layoutStyles);
                if (relayoutFlags.axrange) addAxRangeSequence(seq);
                if (relayoutFlags.ticks) seq.push(subroutines.doTicksRelayout);
                if (relayoutFlags.modebar) seq.push(subroutines.doModeBar);
                if (relayoutFlags.camera) seq.push(subroutines.doCamera);
                seq.push(emitAfterPlot);
            }

            seq.push(rehover, redrag, reselect);

            plotDone = syncOrAsync(seq, gd);
            if (!plotDone || !plotDone.then) plotDone = Promise.resolve(gd);
        }
    }

    return plotDone.then(() => {
        if (!configChanged) gd.emit('plotly_react', { config, data, layout });

        return gd;
    });
}

function diffData(gd?: any, oldFullData?: any, newFullData?: any, immutable?: any, transition?: any, newDataRevision?: any): any {
    const sameTraceLength = oldFullData.length === newFullData.length;

    if (!transition && !sameTraceLength) {
        return {
            fullReplot: true,
            calc: true
        };
    }

    const flags: any = editTypes.traceFlags();
    flags.arrays = {};
    flags.nChanges = 0;
    flags.nChangesAnim = 0;

    let i, trace: any;

    function getTraceValObject(parts?: any) {
        const out: any = PlotSchema.getTraceValObject(trace, parts);
        if (!trace._module.animatable && out.anim) {
            out.anim = false;
        }
        return out;
    }

    const diffOpts = {
        getValObject: getTraceValObject,
        flags: flags,
        immutable: immutable,
        transition: transition,
        newDataRevision: newDataRevision,
        gd: gd
    };

    const seenUIDs: any = {};

    for (i = 0; i < oldFullData.length; i++) {
        if (newFullData[i]) {
            trace = newFullData[i]._fullInput;
            if (seenUIDs[trace.uid]) continue;
            seenUIDs[trace.uid] = 1;

            getDiffFlags(oldFullData[i]._fullInput, trace, [], diffOpts);
        }
    }

    if (flags.calc || flags.plot) {
        flags.fullReplot = true;
    }

    if (transition && flags.nChanges && flags.nChangesAnim) {
        flags.anim = flags.nChanges === flags.nChangesAnim && sameTraceLength ? 'all' : 'some';
    }

    return flags;
}

function diffLayout(gd?: any, oldFullLayout?: any, newFullLayout?: any, immutable?: any, transition?: any): any {
    const flags: any = editTypes.layoutFlags();
    flags.arrays = {};
    flags.rangesAltered = {};
    flags.nChanges = 0;
    flags.nChangesAnim = 0;

    function getLayoutValObject(parts?: any) {
        return PlotSchema.getLayoutValObject(newFullLayout, parts);
    }

    // Clear out any _inputDomain that's no longer valid
    for (const key in newFullLayout) {
        if (!key.startsWith('xaxis') && !key.startsWith('yaxis')) {
            continue;
        }
        if (!oldFullLayout[key]) {
            continue;
        }
        const newDomain = newFullLayout[key].domain;
        const oldDomain = oldFullLayout[key].domain;
        const oldInputDomain = oldFullLayout[key]._inputDomain;
        if (oldFullLayout[key]._inputDomain) {
            if (newDomain[0] === oldInputDomain[0] && newDomain[1] === oldInputDomain[1]) {
                // what you're asking for hasn't changed, so let plotly.js start with what it
                // concluded last time and iterate from there
                newFullLayout[key].domain = oldFullLayout[key].domain;
            } else if (newDomain[0] !== oldDomain[0] || newDomain[1] !== oldDomain[1]) {
                // what you're asking for HAS changed, so clear _inputDomain and let us start from scratch
                newFullLayout[key]._inputDomain = null;
            }
            // We skip the else case (newDomain !== oldInputDomain && newDomain === oldDomain)
            // because it's likely that if the newDomain and oldDomain are the same, the user
            // passed in the same layout object and we should keep the _inputDomain.
        }
    }

    const diffOpts = {
        getValObject: getLayoutValObject,
        flags: flags,
        immutable: immutable,
        transition: transition,
        gd: gd
    };

    getDiffFlags(oldFullLayout, newFullLayout, [], diffOpts);

    if (flags.plot || flags.calc) {
        flags.layoutReplot = true;
    }

    if (transition && flags.nChanges && flags.nChangesAnim) {
        flags.anim = flags.nChanges === flags.nChangesAnim ? 'all' : 'some';
    }

    return flags;
}

function getDiffFlags(oldContainer?: any, newContainer?: any, outerparts?: any, opts?: any): void {
    let valObject: any, key: any, astr: any;

    const getValObject = opts.getValObject;
    const flags: any = opts.flags;
    const immutable = opts.immutable;
    const inArray = opts.inArray;
    const arrayIndex = opts.arrayIndex;

    function changed() {
        const editType = valObject.editType;
        if (inArray && editType.indexOf('arraydraw') !== -1) {
            pushUnique(flags.arrays[inArray], arrayIndex);
            return;
        }
        editTypes.update(flags, valObject);

        if (editType !== 'none') {
            flags.nChanges++;
        }

        // track animatable changes
        if (opts.transition && valObject.anim) {
            flags.nChangesAnim++;
        }

        // track cartesian axes with altered ranges
        if (AX_RANGE_RE.test(astr) || AX_AUTORANGE_RE.test(astr)) {
            flags.rangesAltered[outerparts[0]] = 1;
        }

        // track datarevision changes
        if (key === 'datarevision') {
            flags.newDataRevision = 1;
        }
    }

    function valObjectCanBeDataArray(valObject?: any) {
        return valObject.valType === 'data_array' || valObject.arrayOk;
    }

    for (key in oldContainer) {
        // short-circuit based on previous calls or previous keys that already maximized the pathway
        if (flags.calc && !opts.transition) return;

        const oldVal = oldContainer[key];
        const newVal = newContainer[key];
        const parts = outerparts.concat(key);
        astr = parts.join('.');

        if (key.charAt(0) === '_' || typeof oldVal === 'function' || oldVal === newVal) continue;

        // FIXME: ax.tick0 and dtick get filled in during plotting (except for geo subplots),
        // and unlike other auto values they don't make it back into the input,
        // so newContainer won't have them.
        if ((key === 'tick0' || key === 'dtick') && outerparts[0] !== 'geo') {
            const tickMode = newContainer.tickmode;
            if (tickMode === 'auto' || tickMode === 'array' || !tickMode) continue;
        }
        // FIXME: Similarly for axis ranges for 3D
        // contourcarpet doesn't HAVE zmin/zmax, they're just auto-added. It needs them.
        if (key === 'range' && newContainer.autorange) continue;
        if ((key === 'zmin' || key === 'zmax') && newContainer.type === 'contourcarpet') continue;

        valObject = getValObject(parts);

        // in case type changed, we may not even *have* a valObject.
        if (!valObject) continue;

        if (valObject._compareAsJSON && JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

        const valType = valObject.valType;
        let i;

        const canBeDataArray = valObjectCanBeDataArray(valObject);
        const wasArray = Array.isArray(oldVal);
        const nowArray = Array.isArray(newVal);

        // hack for traces that modify the data in supplyDefaults, like
        // converting 1D to 2D arrays, which will always create new objects
        if (wasArray && nowArray) {
            const inputKey = '_input_' + key;
            const oldValIn = oldContainer[inputKey];
            const newValIn = newContainer[inputKey];
            if (Array.isArray(oldValIn) && oldValIn === newValIn) continue;
        }

        if (newVal === undefined) {
            if (canBeDataArray && wasArray) flags.calc = true;
            else changed();
        } else if (valObject._isLinkedToArray) {
            const arrayEditIndices: any[] = [];
            let extraIndices = false;
            if (!inArray) flags.arrays[key] = arrayEditIndices;

            const minLen = Math.min(oldVal.length, newVal.length);
            const maxLen = Math.max(oldVal.length, newVal.length);
            if (minLen !== maxLen) {
                if (valObject.editType === 'arraydraw') {
                    extraIndices = true;
                } else {
                    changed();
                    continue;
                }
            }

            for (i = 0; i < minLen; i++) {
                getDiffFlags(
                    oldVal[i],
                    newVal[i],
                    parts.concat(i),
                    // add array indices, but not if we're already in an array
                    extendFlat({ inArray: key, arrayIndex: i }, opts)
                );
            }

            // put this at the end so that we know our collected array indices are sorted
            // but the check for length changes happens up front so we can short-circuit
            // diffing if appropriate
            if (extraIndices) {
                for (i = minLen; i < maxLen; i++) {
                    arrayEditIndices.push(i);
                }
            }
        } else if (!valType && isPlainObject(oldVal)) {
            getDiffFlags(oldVal, newVal, parts, opts);
        } else if (canBeDataArray) {
            if (wasArray && nowArray) {
                // don't try to diff two data arrays. If immutable we know the data changed,
                // if not, assume it didn't and let `layout.datarevision` tell us if it did
                if (immutable) {
                    flags.calc = true;
                }

                // look for animatable attributes when the data changed
                if (immutable || opts.newDataRevision) {
                    changed();
                }
            } else if (wasArray !== nowArray) {
                flags.calc = true;
            } else changed();
        } else if (wasArray && nowArray) {
            // info array, colorscale, 'any' - these are short, just stringify.
            // I don't *think* that covers up any real differences post-validation, does it?
            // otherwise we need to dive in 1 (info_array) or 2 (colorscale) levels and compare
            // all elements.
            if (oldVal.length !== newVal.length || String(oldVal) !== String(newVal)) {
                changed();
            }
        } else {
            changed();
        }
    }

    for (key in newContainer) {
        if (!(key in oldContainer || key.charAt(0) === '_' || typeof newContainer[key] === 'function')) {
            valObject = getValObject(outerparts.concat(key));

            if (valObjectCanBeDataArray(valObject) && Array.isArray(newContainer[key])) {
                flags.calc = true;
                return;
            } else changed();
        }
    }
}

/**
 * Animate to a frame, sequence of frame, frame group, or frame definition
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 *
 * @param {string or object or array of strings or array of objects} frameOrGroupNameOrFrameList
 *      a single frame, array of frames, or group to which to animate. The intent is
 *      inferred by the type of the input. Valid inputs are:
 *
 *      - string, e.g. 'groupname': animate all frames of a given `group` in the order
 *            in which they are defined via `Plotly.addFrames`.
 *
 *      - array of strings, e.g. ['frame1', frame2']: a list of frames by name to which
 *            to animate in sequence
 *
 *      - object: {data: ...}: a frame definition to which to animate. The frame is not
 *            and does not need to be added via `Plotly.addFrames`. It may contain any of
 *            the properties of a frame, including `data`, `layout`, and `traces`. The
 *            frame is used as provided and does not use the `baseframe` property.
 *
 *      - array of objects, e.g. [{data: ...}, {data: ...}]: a list of frame objects,
 *            each following the same rules as a single `object`.
 *
 * @param {object} animationOpts
 *      configuration for the animation
 */
function animate(gd?: any, frameOrGroupNameOrFrameList?: any, animationOpts?: any): any {
    gd = getGraphDiv(gd);

    if (!isPlotDiv(gd)) {
        throw new Error(
            'This element is not a Plotly plot: ' +
                gd +
                ". It's likely that you've failed " +
                'to create a plot before animating it. For more details, see ' +
                'https://plotly.com/javascript/animations/'
        );
    }

    const trans: any = gd._transitionData;

    // This is the queue of frames that will be animated as soon as possible. They
    // are popped immediately upon the *start* of a transition:
    if (!trans._frameQueue) {
        trans._frameQueue = [];
    }

    animationOpts = supplyAnimationDefaults(animationOpts);
    const transitionOpts: any = animationOpts.transition;
    const frameOpts = animationOpts.frame;

    // Since frames are popped immediately, an empty queue only means all frames have
    // *started* to transition, not that the animation is complete. To solve that,
    // track a separate counter that increments at the same time as frames are added
    // to the queue, but decrements only when the transition is complete.
    if (trans._frameWaitingCnt === undefined) {
        trans._frameWaitingCnt = 0;
    }

    function getTransitionOpts(i?: any) {
        if (Array.isArray(transitionOpts)) {
            if (i >= transitionOpts.length) {
                return transitionOpts[0];
            } else {
                return transitionOpts[i];
            }
        } else {
            return transitionOpts;
        }
    }

    function getFrameOpts(i?: any) {
        if (Array.isArray(frameOpts)) {
            if (i >= frameOpts.length) {
                return frameOpts[0];
            } else {
                return frameOpts[i];
            }
        } else {
            return frameOpts;
        }
    }

    // Execute a callback after the wrapper function has been called n times.
    // This is used to defer the resolution until a transition has resolved *and*
    // the frame has completed. If it's not done this way, then we get a race
    // condition in which the animation might resolve before a transition is complete
    // or vice versa.
    function callbackOnNthTime(cb?: any, n?: any) {
        let cnt = 0;
        return function () {
            if (cb && ++cnt === n) {
                return cb();
            }
        };
    }

    return new Promise(function (resolve?: any, reject?: any) {
        function discardExistingFrames() {
            if (trans._frameQueue.length === 0) {
                return;
            }

            while (trans._frameQueue.length) {
                const next = trans._frameQueue.pop();
                if (next.onInterrupt) {
                    next.onInterrupt();
                }
            }

            gd.emit('plotly_animationinterrupted', []);
        }

        function queueFrames(frameList?: any) {
            if (frameList.length === 0) return;

            for (let i = 0; i < frameList.length; i++) {
                let computedFrame;

                if (frameList[i].type === 'byname') {
                    // If it's a named frame, compute it:
                    computedFrame = computeFrame(gd, frameList[i].name);
                } else {
                    // Otherwise we must have been given a simple object, so treat
                    // the input itself as the computed frame.
                    computedFrame = frameList[i].data;
                }

                const frameOpts = getFrameOpts(i);
                const transitionOpts: any = getTransitionOpts(i);

                // It doesn't make much sense for the transition duration to be greater than
                // the frame duration, so limit it:
                transitionOpts.duration = Math.min(transitionOpts.duration, frameOpts.duration);

                const nextFrame: any = {
                    frame: computedFrame,
                    name: frameList[i].name,
                    frameOpts: frameOpts,
                    transitionOpts: transitionOpts
                };
                if (i === frameList.length - 1) {
                    // The last frame in this .animate call stores the promise resolve
                    // and reject callbacks. This is how we ensure that the animation
                    // loop (which may exist as a result of a *different* .animate call)
                    // still resolves or rejecdts this .animate call's promise. once it's
                    // complete.
                    nextFrame.onComplete = callbackOnNthTime(resolve, 2);
                    nextFrame.onInterrupt = reject;
                }

                trans._frameQueue.push(nextFrame);
            }

            // Set it as never having transitioned to a frame. This will cause the animation
            // loop to immediately transition to the next frame (which, for immediate mode,
            // is the first frame in the list since all others would have been discarded
            // below)
            if (animationOpts.mode === 'immediate') {
                trans._lastFrameAt = -Infinity;
            }

            // Only it's not already running, start a RAF loop. This could be avoided in the
            // case that there's only one frame, but it significantly complicated the logic
            // and only sped things up by about 5% or so for a lorenz attractor simulation.
            // It would be a fine thing to implement, but the benefit of that optimization
            // doesn't seem worth the extra complexity.
            if (!trans._animationRaf) {
                beginAnimationLoop();
            }
        }

        function stopAnimationLoop() {
            gd.emit('plotly_animated');

            // Be sure to unset also since it's how we know whether a loop is already running:
            window.cancelAnimationFrame(trans._animationRaf);
            trans._animationRaf = null;
        }

        function nextFrame() {
            if (trans._currentFrame && trans._currentFrame.onComplete) {
                // Execute the callback and unset it to ensure it doesn't
                // accidentally get called twice
                trans._currentFrame.onComplete();
            }

            const newFrame = (trans._currentFrame = trans._frameQueue.shift());

            if (newFrame) {
                // Since it's sometimes necessary to do deep digging into frame data,
                // we'll consider it not 100% impossible for nulls or numbers to sneak through,
                // so check when casting the name, just to be absolutely certain:
                const stringName = newFrame.name ? newFrame.name.toString() : null;
                gd._fullLayout._currentFrame = stringName;

                trans._lastFrameAt = Date.now();
                trans._timeToNext = newFrame.frameOpts.duration;

                // This is simply called and it's left to .transition to decide how to manage
                // interrupting current transitions. That means we don't need to worry about
                // how it resolves or what happens after this:
                plotsTransition(
                    gd,
                    newFrame.frame.data,
                    newFrame.frame.layout,
                    helpers.coerceTraceIndices(gd, newFrame.frame.traces),
                    newFrame.frameOpts,
                    newFrame.transitionOpts
                ).then(() => {
                    if (newFrame.onComplete) {
                        newFrame.onComplete();
                    }
                });

                gd.emit('plotly_animatingframe', {
                    name: stringName,
                    frame: newFrame.frame,
                    animation: {
                        frame: newFrame.frameOpts,
                        transition: newFrame.transitionOpts
                    }
                });
            } else {
                // If there are no more frames, then stop the RAF loop:
                stopAnimationLoop();
            }
        }

        function beginAnimationLoop() {
            gd.emit('plotly_animating');

            // If no timer is running, then set last frame = long ago so that the next
            // frame is immediately transitioned:
            trans._lastFrameAt = -Infinity;
            trans._timeToNext = 0;
            trans._runningTransitions = 0;
            trans._currentFrame = null;

            const doFrame = function () {
                // This *must* be requested before nextFrame since nextFrame may decide
                // to cancel it if there's nothing more to animated:
                trans._animationRaf = window.requestAnimationFrame(doFrame);

                // Check if we're ready for a new frame:
                if (Date.now() - trans._lastFrameAt > trans._timeToNext) {
                    nextFrame();
                }
            };

            doFrame();
        }

        // This is an animate-local counter that helps match up option input list
        // items with the particular frame.
        let configCounter = 0;
        function setTransitionConfig(frame?: any) {
            if (Array.isArray(transitionOpts)) {
                if (configCounter >= transitionOpts.length) {
                    frame.transitionOpts = transitionOpts[configCounter];
                } else {
                    frame.transitionOpts = transitionOpts[0];
                }
            } else {
                frame.transitionOpts = transitionOpts;
            }
            configCounter++;
            return frame;
        }

        // Disambiguate what's sort of frames have been received
        let i, frame;
        let frameList: any = [];
        const allFrames = frameOrGroupNameOrFrameList === undefined || frameOrGroupNameOrFrameList === null;
        const isFrameArray = Array.isArray(frameOrGroupNameOrFrameList);
        const isSingleFrame = !allFrames && !isFrameArray && isPlainObject(frameOrGroupNameOrFrameList);

        if (isSingleFrame) {
            // In this case, a simple object has been passed to animate.
            frameList.push({
                type: 'object',
                data: setTransitionConfig(extendFlat({}, frameOrGroupNameOrFrameList))
            });
        } else if (allFrames || ['string', 'number'].indexOf(typeof frameOrGroupNameOrFrameList) !== -1) {
            // In this case, null or undefined has been passed so that we want to
            // animate *all* currently defined frames
            for (i = 0; i < trans._frames.length; i++) {
                frame = trans._frames[i];

                if (!frame) continue;

                if (allFrames || String(frame.group) === String(frameOrGroupNameOrFrameList)) {
                    frameList.push({
                        type: 'byname',
                        name: String(frame.name),
                        data: setTransitionConfig({ name: frame.name })
                    });
                }
            }
        } else if (isFrameArray) {
            for (i = 0; i < frameOrGroupNameOrFrameList.length; i++) {
                let frameOrName = frameOrGroupNameOrFrameList[i];
                if (['number', 'string'].indexOf(typeof frameOrName) !== -1) {
                    frameOrName = String(frameOrName);
                    // In this case, there's an array and this frame is a string name:
                    frameList.push({
                        type: 'byname',
                        name: frameOrName,
                        data: setTransitionConfig({ name: frameOrName })
                    });
                } else if (isPlainObject(frameOrName)) {
                    frameList.push({
                        type: 'object',
                        data: setTransitionConfig(extendFlat({}, frameOrName))
                    });
                }
            }
        }

        // Verify that all of these frames actually exist; return and reject if not:
        for (i = 0; i < frameList.length; i++) {
            frame = frameList[i];
            if (frame.type === 'byname' && !trans._frameHash[frame.data.name]) {
                warn('animate failure: frame not found: "' + frame.data.name + '"');
                reject();
                return;
            }
        }

        // If the mode is either next or immediate, then all currently queued frames must
        // be dumped and the corresponding .animate promises rejected.
        if (['next', 'immediate'].indexOf(animationOpts.mode) !== -1) {
            discardExistingFrames();
        }

        if (animationOpts.direction === 'reverse') {
            frameList.reverse();
        }

        const currentFrame = gd._fullLayout._currentFrame;
        if (currentFrame && animationOpts.fromcurrent) {
            let idx = -1;
            for (i = 0; i < frameList.length; i++) {
                frame = frameList[i];
                if (frame.type === 'byname' && frame.name === currentFrame) {
                    idx = i;
                    break;
                }
            }

            if (idx > 0 && idx < frameList.length - 1) {
                const filteredFrameList: any[] = [];
                for (i = 0; i < frameList.length; i++) {
                    frame = frameList[i];
                    if (frameList[i].type !== 'byname' || i > idx) {
                        filteredFrameList.push(frame);
                    }
                }
                frameList = filteredFrameList;
            }
        }

        if (frameList.length > 0) {
            queueFrames(frameList);
        } else {
            // This is the case where there were simply no frames. It's a little strange
            // since there's not much to do:
            gd.emit('plotly_animated');
            resolve();
        }
    });
}

/**
 * Register new frames
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 *
 * @param {array of objects} frameList
 *      list of frame definitions, in which each object includes any of:
 *      - name: {string} name of frame to add
 *      - data: {array of objects} trace data
 *      - layout {object} layout definition
 *      - traces {array} trace indices
 *      - baseframe {string} name of frame from which this frame gets defaults
 *
 *  @param {array of integers} indices
 *      an array of integer indices matching the respective frames in `frameList`. If not
 *      provided, an index will be provided in serial order. If already used, the frame
 *      will be overwritten.
 */
function addFrames(gd?: any, frameList?: any, indices?: any): any {
    gd = getGraphDiv(gd);

    if (frameList === null || frameList === undefined) {
        return Promise.resolve();
    }

    if (!isPlotDiv(gd)) {
        throw new Error(
            'This element is not a Plotly plot: ' +
                gd +
                ". It's likely that you've failed " +
                'to create a plot before adding frames. For more details, see ' +
                'https://plotly.com/javascript/animations/'
        );
    }

    let i, frame, j, idx;
    const _frames = gd._transitionData._frames;
    const _frameHash = gd._transitionData._frameHash;

    if (!Array.isArray(frameList)) {
        throw new Error('addFrames failure: frameList must be an Array of frame definitions' + frameList);
    }

    // Create a sorted list of insertions since we run into lots of problems if these
    // aren't in ascending order of index:
    //
    // Strictly for sorting. Make sure this is guaranteed to never collide with any
    // already-exisisting indices:
    const bigIndex = _frames.length + frameList.length * 2;

    const insertions: any[] = [];
    const _frameHashLocal: any = {};
    for (i = frameList.length - 1; i >= 0; i--) {
        if (!isPlainObject(frameList[i])) continue;

        // The entire logic for checking for this type of name collision can be removed once we migrate to ES6 and
        // use a Map instead of an Object instance, as Map keys aren't converted to strings.
        const lookupName = frameList[i].name;
        const name = (_frameHash[lookupName] || _frameHashLocal[lookupName] || {}).name;
        const newName = frameList[i].name;
        const collisionPresent = _frameHash[name] || _frameHashLocal[name];

        if (
            name &&
            newName &&
            typeof newName === 'number' &&
            collisionPresent &&
            numericNameWarningCount < numericNameWarningCountLimit
        ) {
            numericNameWarningCount++;

            warn(
                'addFrames: overwriting frame "' +
                    (_frameHash[name] || _frameHashLocal[name]).name +
                    '" with a frame whose name of type "number" also equates to "' +
                    name +
                    '". This is valid but may potentially lead to unexpected ' +
                    'behavior since all plotly.js frame names are stored internally ' +
                    'as strings.'
            );

            if (numericNameWarningCount === numericNameWarningCountLimit) {
                warn(
                    'addFrames: This API call has yielded too many of these warnings. ' +
                        'For the rest of this call, further warnings about numeric frame ' +
                        'names will be suppressed.'
                );
            }
        }

        _frameHashLocal[lookupName] = { name: lookupName };

        insertions.push({
            frame: supplyFrameDefaults(frameList[i]),
            index: indices && indices[i] !== undefined && indices[i] !== null ? indices[i] : bigIndex + i
        });
    }

    // Sort this, taking note that undefined insertions end up at the end:
    insertions.sort((a?: any, b?: any) => {
        if (a.index > b.index) return -1;
        if (a.index < b.index) return 1;
        return 0;
    });

    const ops: any[] = [];
    const revops: any[] = [];
    let frameCount = _frames.length;

    for (i = insertions.length - 1; i >= 0; i--) {
        frame = (insertions[i] as any).frame;

        if (typeof frame.name === 'number') {
            warn(
                'Warning: addFrames accepts frames with numeric names, but the numbers are' +
                    'implicitly cast to strings'
            );
        }

        if (!frame.name) {
            // Repeatedly assign a default name, incrementing the counter each time until
            // we get a name that's not in the hashed lookup table:
            while (_frameHash[(frame.name = 'frame ' + gd._transitionData._counter++)]);
        }

        if (_frameHash[frame.name]) {
            // If frame is present, overwrite its definition:
            for (j = 0; j < _frames.length; j++) {
                if ((_frames[j] || {}).name === frame.name) break;
            }
            ops.push({ type: 'replace', index: j, value: frame });
            revops.unshift({ type: 'replace', index: j, value: _frames[j] });
        } else {
            // Otherwise insert it at the end of the list:
            idx = Math.max(0, Math.min((insertions[i] as any).index, frameCount));

            ops.push({ type: 'insert', index: idx, value: frame });
            revops.unshift({ type: 'delete', index: idx });
            frameCount++;
        }
    }

    const undoFunc = modifyFrames;
    const redoFunc = modifyFrames;
    const undoArgs = [gd, revops];
    const redoArgs = [gd, ops];

    if (Queue) Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);

    return modifyFrames(gd, ops);
}

/**
 * Delete frame
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 *
 * @param {array of integers} frameList
 *      list of integer indices of frames to be deleted
 */
function deleteFrames(gd?: any, frameList?: any): any {
    gd = getGraphDiv(gd);

    if (!isPlotDiv(gd)) {
        throw new Error('This element is not a Plotly plot: ' + gd);
    }

    let i, idx;
    const _frames = gd._transitionData._frames;
    const ops: any[] = [];
    const revops: any[] = [];

    if (!frameList) {
        frameList = [];
        for (i = 0; i < _frames.length; i++) {
            frameList.push(i);
        }
    }

    frameList = frameList.slice();
    frameList.sort();

    for (i = frameList.length - 1; i >= 0; i--) {
        idx = frameList[i];
        ops.push({ type: 'delete', index: idx });
        revops.unshift({ type: 'insert', index: idx, value: _frames[idx] });
    }

    const undoFunc = modifyFrames;
    const redoFunc = modifyFrames;
    const undoArgs = [gd, revops];
    const redoArgs = [gd, ops];

    if (Queue) Queue.add(gd, undoFunc, undoArgs, redoFunc, redoArgs);

    return modifyFrames(gd, ops);
}

/**
 * Purge a graph container div back to its initial pre-_doPlot state
 *
 * @param {string id or DOM element} gd
 *      the id or DOM element of the graph container div
 */
function purge(gd?: any): any {
    gd = getGraphDiv(gd);

    const fullLayout = gd._fullLayout || {} as FullLayout;
    const fullData = gd._fullData || [];

    // remove gl contexts
    cleanPlot([], {}, fullData, fullLayout);

    // purge properties
    plotsPurge(gd);

    // purge event emitter methods
    Events.purge(gd);

    // remove plot container
    if (fullLayout._container) fullLayout._container.remove();

    // in contrast to _doPlots.purge which does NOT clear _context!
    delete gd._context;

    return gd;
}

// determines if the graph div requires a recalculation of its inverse matrix transforms by comparing old + new bounding boxes.
function calcInverseTransform(gd?: any): void {
    const fullLayout = gd._fullLayout;

    const newBBox = gd.getBoundingClientRect();
    if (equalDomRects(newBBox, fullLayout._lastBBox)) return;

    const m = (fullLayout._invTransform = inverseTransformMatrix(getFullTransformMatrix(gd)));
    fullLayout._invScaleX = Math.sqrt(m[0][0] * m[0][0] + m[0][1] * m[0][1] + m[0][2] * m[0][2]);
    fullLayout._invScaleY = Math.sqrt(m[1][0] * m[1][0] + m[1][1] * m[1][1] + m[1][2] * m[1][2]);
    fullLayout._lastBBox = newBBox;
}

// -------------------------------------------------------
// makePlotFramework: Create the plot container and axes
// -------------------------------------------------------
function makePlotFramework(gd?: any): void {
    const gd3 = select(gd);
    const fullLayout = gd._fullLayout;

    fullLayout._calcInverseTransform = calcInverseTransform;
    fullLayout._calcInverseTransform(gd);

    // Plot container
    const containerJoin = gd3.selectAll('.plot-container').data([0]);
    fullLayout._container = containerJoin
        .enter()
        .insert('div', ':first-child')
        .classed('plot-container', true)
        .classed('plotly', true)
        .style('width', '100%')
        .style('height', '100%')
        .merge(containerJoin);

    // Make the svg container
    const paperdivJoin = fullLayout._container.selectAll('.svg-container').data([0]);
    fullLayout._paperdiv = paperdivJoin
        .enter()
        .append('div')
        .classed('user-select-none', true)
        .classed('svg-container', true)
        .style('position', 'relative')
        .merge(paperdivJoin);

    // Make the graph containers
    // start fresh each time we get here, so we know the order comes out
    // right, rather than enter/exit which can muck up the order
    // TODO: sort out all the ordering so we don't have to
    // explicitly delete anything
    // FIXME: parcoords reuses this object, not the best pattern
    const glcontainerJoin = fullLayout._paperdiv.selectAll('.gl-container').data([{}]);

    fullLayout._glcontainer = glcontainerJoin.enter().append('div').classed('gl-container', true).merge(glcontainerJoin);

    fullLayout._paperdiv.selectAll('.main-svg').remove();
    fullLayout._paperdiv.select('.modebar-container').remove();

    fullLayout._paper = fullLayout._paperdiv.insert('svg', ':first-child').classed('main-svg', true);

    fullLayout._toppaper = fullLayout._paperdiv.append('svg').classed('main-svg', true);

    fullLayout._modebardiv = fullLayout._paperdiv.append('div');
    delete fullLayout._modeBar;

    fullLayout._hoverpaper = fullLayout._paperdiv.append('svg').classed('main-svg', true);

    if (!fullLayout._uid) {
        const otherUids: any = {};
        selectAll('defs').each(function (this: any) {
            if (this.id) otherUids[this.id.split('-')[1]] = 1;
        });
        fullLayout._uid = randstr(otherUids);
    }

    fullLayout._paperdiv.selectAll('.main-svg')
        .attr('xmlns', xmlnsNamespaces.svg)
        .attr('xmlns:xlink', xmlnsNamespaces.xlink);

    fullLayout._defs = fullLayout._paper.append('defs').attr('id', 'defs-' + fullLayout._uid);

    fullLayout._clips = fullLayout._defs.append('g').classed('clips', true);

    fullLayout._topdefs = fullLayout._toppaper.append('defs').attr('id', 'topdefs-' + fullLayout._uid);

    fullLayout._topclips = fullLayout._topdefs.append('g').classed('clips', true);

    fullLayout._bgLayer = fullLayout._paper.append('g').classed('bglayer', true);

    fullLayout._draggers = fullLayout._paper.append('g').classed('draglayer', true);

    // lower shape/image layer - note that this is behind
    // all subplots data/grids but above the backgrounds
    // except inset subplots, whose backgrounds are drawn
    // inside their own group so that they appear above
    // the data for the main subplot
    // lower shapes and images which are fully referenced to
    // a subplot still get drawn within the subplot's group
    // so they will work correctly on insets
    const layerBelow = fullLayout._paper.append('g').classed('layer-below', true);
    fullLayout._imageLowerLayer = layerBelow.append('g').classed('imagelayer', true);
    fullLayout._shapeLowerLayer = layerBelow.append('g').classed('shapelayer', true);

    // single cartesian layer for the whole plot
    fullLayout._cartesianlayer = fullLayout._paper.append('g').classed('cartesianlayer', true);

    // single polar layer for the whole plot
    fullLayout._polarlayer = fullLayout._paper.append('g').classed('polarlayer', true);

    // single smith layer for the whole plot
    fullLayout._smithlayer = fullLayout._paper.append('g').classed('smithlayer', true);

    // single ternary layer for the whole plot
    fullLayout._ternarylayer = fullLayout._paper.append('g').classed('ternarylayer', true);

    // single geo layer for the whole plot
    fullLayout._geolayer = fullLayout._paper.append('g').classed('geolayer', true);

    // single funnelarea layer for the whole plot
    fullLayout._funnelarealayer = fullLayout._paper.append('g').classed('funnelarealayer', true);

    // single pie layer for the whole plot
    fullLayout._pielayer = fullLayout._paper.append('g').classed('pielayer', true);

    // single treemap layer for the whole plot
    fullLayout._iciclelayer = fullLayout._paper.append('g').classed('iciclelayer', true);

    // single treemap layer for the whole plot
    fullLayout._treemaplayer = fullLayout._paper.append('g').classed('treemaplayer', true);

    // single sunburst layer for the whole plot
    fullLayout._sunburstlayer = fullLayout._paper.append('g').classed('sunburstlayer', true);

    // single indicator layer for the whole plot
    fullLayout._indicatorlayer = fullLayout._toppaper.append('g').classed('indicatorlayer', true);

    // fill in image server scrape-svg
    fullLayout._glimages = fullLayout._paper.append('g').classed('glimages', true);

    // lastly upper shapes, info (legend, annotations) and hover layers go on top
    // these are in a different svg element normally, but get collapsed into a single
    // svg when exporting (after inserting 3D)
    // upper shapes/images are only those drawn above the whole plot, including subplots
    const layerAbove = fullLayout._toppaper.append('g').classed('layer-above', true);
    fullLayout._imageUpperLayer = layerAbove.append('g').classed('imagelayer', true);
    fullLayout._shapeUpperLayer = layerAbove.append('g').classed('shapelayer', true);

    fullLayout._selectionLayer = fullLayout._toppaper.append('g').classed('selectionlayer', true);
    fullLayout._infolayer = fullLayout._toppaper.append('g').classed('infolayer', true);
    fullLayout._menulayer = fullLayout._toppaper.append('g').classed('menulayer', true);
    fullLayout._zoomlayer = fullLayout._toppaper.append('g').classed('zoomlayer', true);
    fullLayout._hoverlayer = fullLayout._hoverpaper.append('g').classed('hoverlayer', true);

    // Make the modebar container
    fullLayout._modebardiv
        .classed('modebar-container', true)
        .style('position', 'absolute')
        .style('top', '0px')
        .style('right', '0px');

    gd.emit('plotly_framework');
}

export { animate };
export { addFrames };
export { deleteFrames };
export { addTraces };
export { deleteTraces };
export { extendTraces };
export { moveTraces };
export { prependTraces };
export { newPlot };
export { _doPlot };
export { purge };
export { react };
export { redraw };
export { relayout };
export { restyle };
export { setPlotConfig };
export { update };
export const _guiRelayout = guiEdit(relayout);
export const _guiRestyle = guiEdit(restyle);
export const _guiUpdate = guiEdit(update);
export { _storeDirectGUIEdit };

export default { _guiRelayout, _guiRestyle, _guiUpdate, animate, addFrames, deleteFrames, addTraces, deleteTraces, extendTraces, moveTraces, prependTraces, newPlot, _doPlot, purge, react, redraw, relayout, restyle, setPlotConfig, update, _storeDirectGUIEdit };
