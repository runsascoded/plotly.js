import { select } from 'd3-selection';
import isNumeric from 'fast-isnumeric';
import tinycolor from 'tinycolor2';
import { apply3DTransform, castOption, constrain, ensureSingle, extractOption, getGraphDiv, hovertemplateString, log, mean, pushUnique, strRotate, strTranslate, templateString, throttle, warn } from '../../lib/index.js';
import Events from '../../lib/events.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import overrideCursor from '../../lib/override_cursor.js';
import { dashStyle, font as drawingFont, setClipUrl, setRect, tester } from '../drawing/index.js';
import Color from '../color/index.js';
import dragElement from '../dragelement/index.js';
import Axes from '../../plots/cartesian/axes.js';
import _constants from '../../plots/cartesian/constants.js';
const { zindexSeparator } = _constants;
import { getComponentMethod } from '../../registry.js';
import { traceIs } from '../../lib/trace_categories.js';
import helpers from './helpers.js';
import constants from './constants.js';
import legendSupplyDefaults from '../legend/defaults.js';
import legendDraw from '../legend/draw.js';
import type { GraphDiv, FullLayout, FullAxis, FullTrace } from '../../../types/core';

// hover labels for multiple horizontal bars get tilted by some angle,
// then need to be offset differently if they overlap
const YANGLE = constants.YANGLE;
const YA_RADIANS = (Math.PI * YANGLE) / 180;

// expansion of projected height
const YFACTOR = 1 / Math.sin(YA_RADIANS);

// to make the appropriate post-rotation x offset,
// you need both x and y offsets
const YSHIFTX = Math.cos(YA_RADIANS);
const YSHIFTY = Math.sin(YA_RADIANS);

// size and display constants for hover text
const HOVERARROWSIZE = constants.HOVERARROWSIZE;
const HOVERTEXTPAD = constants.HOVERTEXTPAD;

const multipleHoverPoints: Record<string, boolean> = {
    box: true,
    ohlc: true,
    violin: true,
    candlestick: true
};

const cartesianScatterPoints: Record<string, boolean> = {
    scatter: true,
    scattergl: true,
    splom: true
};

function distanceSort(a: any, b: any): number {
    return a.distance - b.distance;
}

export function hover(gd: GraphDiv, evt: any, subplot?: any, noHoverEvent?: boolean): void {
    gd = getGraphDiv(gd) as GraphDiv;
    // The 'target' property changes when bubbling out of Shadow DOM.
    // Throttling can delay reading the target, so we save the current value.
    const eventTarget = evt.target;
    throttle(gd._fullLayout._uid + constants.HOVERID, constants.HOVERMINTIME, function () {
        _hover(gd, evt, subplot, noHoverEvent, eventTarget);
    });
}

export function loneHover(hoverItems: any, opts: any): any {
    let multiHover = true;
    if (!Array.isArray(hoverItems)) {
        multiHover = false;
        hoverItems = [hoverItems];
    }

    const gd = opts.gd;
    const gTop = getTopOffset(gd);
    const gLeft = getLeftOffset(gd);

    const pointsData = hoverItems.map((hoverItem: any) => {
        const _x0 = hoverItem._x0 || hoverItem.x0 || hoverItem.x || 0;
        const _x1 = hoverItem._x1 || hoverItem.x1 || hoverItem.x || 0;
        const _y0 = hoverItem._y0 || hoverItem.y0 || hoverItem.y || 0;
        const _y1 = hoverItem._y1 || hoverItem.y1 || hoverItem.y || 0;

        let eventData = hoverItem.eventData;
        if (eventData) {
            let x0 = Math.min(_x0, _x1);
            let x1 = Math.max(_x0, _x1);
            let y0 = Math.min(_y0, _y1);
            let y1 = Math.max(_y0, _y1);

            const trace = hoverItem.trace;
            if (traceIs(trace, 'gl3d')) {
                const container = gd._fullLayout[trace.scene]._scene.container;
                const dx = container.offsetLeft;
                const dy = container.offsetTop;
                x0 += dx;
                x1 += dx;
                y0 += dy;
                y1 += dy;
            }

            eventData.bbox = {
                x0: x0 + gLeft,
                x1: x1 + gLeft,
                y0: y0 + gTop,
                y1: y1 + gTop
            };

            if (opts.inOut_bbox) {
                opts.inOut_bbox.push(eventData.bbox);
            }
        } else {
            eventData = false;
        }

        return {
            color: hoverItem.color || Color.defaultLine,
            x0: hoverItem.x0 || hoverItem.x || 0,
            x1: hoverItem.x1 || hoverItem.x || 0,
            y0: hoverItem.y0 || hoverItem.y || 0,
            y1: hoverItem.y1 || hoverItem.y || 0,
            xLabel: hoverItem.xLabel,
            yLabel: hoverItem.yLabel,
            zLabel: hoverItem.zLabel,
            text: hoverItem.text,
            name: hoverItem.name,
            idealAlign: hoverItem.idealAlign,

            // optional extra bits of styling
            borderColor: hoverItem.borderColor,
            fontFamily: hoverItem.fontFamily,
            fontSize: hoverItem.fontSize,
            fontColor: hoverItem.fontColor,
            fontWeight: hoverItem.fontWeight,
            fontStyle: hoverItem.fontStyle,
            fontVariant: hoverItem.fontVariant,
            nameLength: hoverItem.nameLength,
            textAlign: hoverItem.textAlign,

            // filler to make createHoverText happy
            trace: hoverItem.trace || {
                index: 0,
                hoverinfo: ''
            },
            xa: { _offset: 0 },
            ya: { _offset: 0 },
            index: 0,

            hovertemplate: hoverItem.hovertemplate || false,
            hovertemplateLabels: hoverItem.hovertemplateLabels || false,

            eventData: eventData
        };
    });

    const rotateLabels = false;

    const hoverText = createHoverText(pointsData, {
        gd: gd,
        hovermode: 'closest',
        rotateLabels: rotateLabels,
        bgColor: opts.bgColor || Color.background,
        container: select(opts.container),
        outerContainer: opts.outerContainer || opts.container
    });
    const hoverLabel = hoverText.hoverLabels;

    // Fix vertical overlap
    const tooltipSpacing = 5;
    let lastBottomY = 0;
    let anchor = 0;
    hoverLabel
        .sort((a: any, b: any) => a.y0 - b.y0)
        .each(function (d: any, i: any) {
            const topY = d.y0 - d.by / 2;

            if (topY - tooltipSpacing < lastBottomY) {
                d.offset = lastBottomY - topY + tooltipSpacing;
            } else {
                d.offset = 0;
            }

            lastBottomY = topY + d.by + d.offset;

            if (i === opts.anchorIndex || 0) anchor = d.offset;
        })
        .each(function (d: any) {
            d.offset -= anchor;
        });

    const scaleX = gd._fullLayout._invScaleX;
    const scaleY = gd._fullLayout._invScaleY;
    alignHoverText(hoverLabel, rotateLabels, scaleX, scaleY);

    return multiHover ? hoverLabel : hoverLabel.node();
}

// The actual implementation is here:
function _hover(gd: GraphDiv, evt: any, subplot: any, noHoverEvent: any, eventTarget: any): any {
    if (!subplot) subplot = 'xy';

    if (typeof subplot === 'string') {
        // drop zindex from subplot id
        subplot = subplot.split(zindexSeparator)[0];
    }

    // if the user passed in an array of subplots,
    // use those instead of finding overlayed plots
    let subplots = Array.isArray(subplot) ? subplot : [subplot];

    let spId;

    const fullLayout = gd._fullLayout;
    const hoversubplots = fullLayout.hoversubplots;
    const plots = fullLayout._plots || [];
    const plotinfo = plots[subplot];
    const hasCartesian = fullLayout._has('cartesian');

    let hovermode = evt.hovermode || fullLayout.hovermode;
    const hovermodeHasX = (hovermode || '').charAt(0) === 'x';
    const hovermodeHasY = (hovermode || '').charAt(0) === 'y';

    let firstXaxis: any;
    let firstYaxis: any;

    if (hasCartesian && (hovermodeHasX || hovermodeHasY) && hoversubplots === 'axis') {
        const subplotsLength = subplots.length;
        for (let p = 0; p < subplotsLength; p++) {
            spId = subplots[p];
            if (plots[spId]) {
                // 'cartesian' case

                firstXaxis = Axes.getFromId(gd, spId, 'x');
                firstYaxis = Axes.getFromId(gd, spId, 'y');

                const subplotsWith = (hovermodeHasX ? firstXaxis : firstYaxis)._subplotsWith;

                if (subplotsWith && subplotsWith.length) {
                    for (let q = 0; q < subplotsWith.length; q++) {
                        pushUnique(subplots, subplotsWith[q]);
                    }
                }
            }
        }
    }

    // list of all overlaid subplots to look at
    if (plotinfo && hoversubplots !== 'single') {
        const overlayedSubplots = plotinfo.overlays.map((pi: any) => pi.id);

        subplots = subplots.concat(overlayedSubplots);
    }

    const len = subplots.length;
    const xaArray = new Array(len);
    const yaArray = new Array(len);
    let supportsCompare = false;

    for (let i = 0; i < len; i++) {
        spId = subplots[i];

        if (plots[spId]) {
            // 'cartesian' case
            supportsCompare = true;
            xaArray[i] = plots[spId].xaxis;
            yaArray[i] = plots[spId].yaxis;
        } else if (fullLayout[spId] && fullLayout[spId]._subplot) {
            // other subplot types
            const _subplot = fullLayout[spId]._subplot;
            xaArray[i] = _subplot.xaxis;
            yaArray[i] = _subplot.yaxis;
        } else {
            warn('Unrecognized subplot: ' + spId);
            return;
        }
    }

    if (hovermode && !supportsCompare) hovermode = 'closest';

    if (
        ['x', 'y', 'closest', 'x unified', 'y unified'].indexOf(hovermode) === -1 ||
        !gd.calcdata ||
        gd.querySelector('.zoombox') ||
        gd._dragging
    ) {
        return dragElement.unhoverRaw(gd, evt);
    }

    let hoverdistance = fullLayout.hoverdistance;
    if (hoverdistance === -1) hoverdistance = Infinity;

    let spikedistance = fullLayout.spikedistance;
    if (spikedistance === -1) spikedistance = Infinity;

    // hoverData: the set of candidate points we've found to highlight
    let hoverData: any[] = [];

    // searchData: the data to search in. Mostly this is just a copy of
    // gd.calcdata, filtered to the subplot and overlays we're on
    // but if a point array is supplied it will be a mapping
    // of indicated curves
    const searchData: any[] = [];

    // [x|y]valArray: the axis values of the hover event
    // mapped onto each of the currently selected overlaid subplots
    let xvalArray: any, yvalArray: any;

    let itemnum, curvenum, cd, trace, subplotId, subploti, _mode, xval: any, yval: any, pointData: any, closedataPreviousLength;

    // spikePoints: the set of candidate points we've found to draw spikes to
    const spikePoints = {
        hLinePoint: null,
        vLinePoint: null
    };

    // does subplot have one (or more) horizontal traces?
    // This is used to determine whether we rotate the labels or not
    let hasOneHorizontalTrace = false;

    // Figure out what we're hovering on:
    // mouse location or user-supplied data

    if (Array.isArray(evt)) {
        // user specified an array of points to highlight
        hovermode = 'array';
        for (itemnum = 0; itemnum < evt.length; itemnum++) {
            cd = gd.calcdata[evt[itemnum].curveNumber || 0];
            if (cd) {
                trace = cd[0].trace;
                if (cd[0].trace.hoverinfo !== 'skip') {
                    searchData.push(cd);
                    if (trace.orientation === 'h') {
                        hasOneHorizontalTrace = true;
                    }
                }
            }
        }
    } else {
        // take into account zorder
        const zorderedCalcdata = gd.calcdata.slice();
        zorderedCalcdata.sort((a, b) => {
            const aZorder = a[0].trace.zorder || 0;
            const bZorder = b[0].trace.zorder || 0;
            return aZorder - bZorder;
        });

        for (curvenum = 0; curvenum < zorderedCalcdata.length; curvenum++) {
            cd = zorderedCalcdata[curvenum];
            trace = cd[0].trace;
            if (trace.hoverinfo !== 'skip' && helpers.isTraceInSubplots(trace, subplots)) {
                searchData.push(cd);
                if (trace.orientation === 'h') {
                    hasOneHorizontalTrace = true;
                }
            }
        }

        // [x|y]px: the pixels (from top left) of the mouse location
        // on the currently selected plot area
        // add pointerX|Y property for drawing the spikes in spikesnap 'cursor' situation
        const hasUserCalledHover = !eventTarget;
        let xpx, ypx;

        if (hasUserCalledHover) {
            if ('xpx' in evt) xpx = evt.xpx;
            else xpx = xaArray[0]._length / 2;

            if ('ypx' in evt) ypx = evt.ypx;
            else ypx = yaArray[0]._length / 2;
        } else {
            // fire the beforehover event and quit if it returns false
            // note that we're only calling this on real mouse events, so
            // manual calls to fx.hover will always run.
            if (Events.triggerHandler(gd, 'plotly_beforehover', evt) === false) {
                return;
            }

            const dbb = eventTarget.getBoundingClientRect();

            xpx = evt.clientX - dbb.left;
            ypx = evt.clientY - dbb.top;

            fullLayout._calcInverseTransform(gd);
            const transformedCoords = apply3DTransform(fullLayout._invTransform)(xpx, ypx);

            xpx = transformedCoords[0];
            ypx = transformedCoords[1];

            // in case hover was called from mouseout into hovertext,
            // it's possible you're not actually over the plot anymore
            if (xpx < 0 || xpx > xaArray[0]._length || ypx < 0 || ypx > yaArray[0]._length) {
                return dragElement.unhoverRaw(gd, evt);
            }
        }

        evt.pointerX = xpx + xaArray[0]._offset;
        evt.pointerY = ypx + yaArray[0]._offset;

        if ('xval' in evt) xvalArray = helpers.flat(subplots, evt.xval);
        else xvalArray = helpers.p2c(xaArray, xpx);

        if ('yval' in evt) yvalArray = helpers.flat(subplots, evt.yval);
        else yvalArray = helpers.p2c(yaArray, ypx);

        if (!isNumeric(xvalArray[0]) || !isNumeric(yvalArray[0])) {
            warn('Fx.hover failed', evt, gd);
            return dragElement.unhoverRaw(gd, evt);
        }
    }

    // the pixel distance to beat as a matching point
    // in 'x' or 'y' mode this resets for each trace
    let distance = Infinity;

    // find the closest point in each trace
    // this is minimum dx and/or dy, depending on mode
    // and the pixel position for the label (labelXpx, labelYpx)
    function findHoverPoints(customXVal?: any, customYVal?: any): void {
        for (curvenum = 0; curvenum < searchData.length; curvenum++) {
            cd = searchData[curvenum];

            // filter out invisible or broken data
            if (!cd || !cd[0] || !cd[0].trace) continue;

            trace = cd[0].trace;

            if (trace.visible !== true || trace._length === 0) continue;

            // Explicitly bail out for these two. I don't know how to otherwise prevent
            // the rest of this function from running and failing
            if (['carpet', 'contourcarpet'].indexOf(trace._module.name) !== -1) continue;

            // within one trace mode can sometimes be overridden
            _mode = hovermode;
            if (helpers.isUnifiedHover(_mode)) {
                _mode = _mode.charAt(0);
            }

            if (trace.type === 'splom') {
                // splom traces do not generate overlay subplots,
                // it is safe to assume here splom traces correspond to the 0th subplot
                subploti = 0;
                subplotId = subplots[subploti];
            } else {
                subplotId = helpers.getSubplot(trace);
                subploti = subplots.indexOf(subplotId);
            }

            // container for new point, also used to pass info into module.hoverPoints
            pointData = {
                // trace properties
                cd: cd,
                trace: trace,
                xa: xaArray[subploti],
                ya: yaArray[subploti],

                // max distances for hover and spikes - for points that want to show but do not
                // want to override other points, set distance/spikeDistance equal to max*Distance
                // and it will not get filtered out but it will be guaranteed to have a greater
                // distance than any point that calculated a real distance.
                maxHoverDistance: hoverdistance,
                maxSpikeDistance: spikedistance,

                // point properties - override all of these
                index: false, // point index in trace - only used by plotly.js hoverdata consumers
                distance: Math.min(distance, hoverdistance), // pixel distance or pseudo-distance

                // distance/pseudo-distance for spikes. This distance should always be calculated
                // as if in "closest" mode, and should only be set if this point should
                // generate a spike.
                spikeDistance: Infinity,

                // in some cases the spikes have different positioning from the hover label
                // they don't need x0/x1, just one position
                xSpike: undefined,
                ySpike: undefined,

                // where and how to display the hover label
                color: Color.defaultLine, // trace color
                name: trace.name,
                x0: undefined,
                x1: undefined,
                y0: undefined,
                y1: undefined,
                xLabelVal: undefined,
                yLabelVal: undefined,
                zLabelVal: undefined,
                text: undefined
            };

            // add ref to subplot object (non-cartesian case)
            if (fullLayout[subplotId]) {
                pointData.subplot = fullLayout[subplotId]._subplot;
            }
            // add ref to splom scene
            if (fullLayout._splomScenes && fullLayout._splomScenes[trace.uid]) {
                pointData.scene = fullLayout._splomScenes[trace.uid];
            }

            // for a highlighting array, figure out what
            // we're searching for with this element
            if (_mode === 'array') {
                const selection = evt[curvenum];
                if ('pointNumber' in selection) {
                    pointData.index = selection.pointNumber;
                    _mode = 'closest';
                } else {
                    _mode = '';
                    if ('xval' in selection) {
                        xval = selection.xval;
                        _mode = 'x';
                    }
                    if ('yval' in selection) {
                        yval = selection.yval;
                        _mode = _mode ? 'closest' : 'y';
                    }
                }
            } else if (customXVal !== undefined && customYVal !== undefined) {
                xval = customXVal;
                yval = customYVal;
            } else {
                xval = xvalArray[subploti];
                yval = yvalArray[subploti];
            }

            closedataPreviousLength = hoverData.length;

            // Now if there is range to look in, find the points to hover.
            if (hoverdistance !== 0) {
                if (trace._module && trace._module.hoverPoints) {
                    const newPoints = trace._module.hoverPoints(pointData, xval, yval, _mode, {
                        finiteRange: true,
                        hoverLayer: fullLayout._hoverlayer,

                        // options for splom when hovering on same axis
                        hoversubplots: hoversubplots,
                        gd: gd
                    });

                    if (newPoints) {
                        let newPoint;
                        for (let newPointNum = 0; newPointNum < newPoints.length; newPointNum++) {
                            newPoint = newPoints[newPointNum];
                            if (isNumeric(newPoint.x0) && isNumeric(newPoint.y0)) {
                                hoverData.push((cleanPoint(newPoint, hovermode) as any));
                            }
                        }
                    }
                } else {
                    log('Unrecognized trace type in hover:', trace);
                }
            }

            // in closest mode, remove any existing (farther) points
            // and don't look any farther than this latest point (or points, some
            // traces like box & violin make multiple hover labels at once)
            if (hovermode === 'closest' && hoverData.length > closedataPreviousLength) {
                hoverData.splice(0, closedataPreviousLength);
                distance = (hoverData[0] as any).distance;
            }

            // Now if there is range to look in, find the points to draw the spikelines
            // Do it only if there is no hoverData
            if (hasCartesian && spikedistance !== 0) {
                if (hoverData.length === 0) {
                    pointData.distance = spikedistance;
                    pointData.index = false;
                    let closestPoints = trace._module.hoverPoints(pointData, xval, yval, 'closest', {
                        hoverLayer: fullLayout._hoverlayer
                    });
                    if (closestPoints) {
                        closestPoints = closestPoints.filter((point: any) => point.spikeDistance <= spikedistance);
                    }
                    if (closestPoints && closestPoints.length) {
                        let tmpPoint;
                        const closestVPoints = closestPoints.filter((point: any) => point.xa.showspikes && point.xa.spikesnap !== 'hovered data');
                        if (closestVPoints.length) {
                            const closestVPt = closestVPoints[0];
                            if (isNumeric(closestVPt.x0) && isNumeric(closestVPt.y0)) {
                                tmpPoint = fillSpikePoint(closestVPt);
                                if (
                                    !spikePoints.vLinePoint ||
                                    (spikePoints.vLinePoint as any).spikeDistance > tmpPoint.spikeDistance
                                ) {
                                    spikePoints.vLinePoint = tmpPoint;
                                }
                            }
                        }

                        const closestHPoints = closestPoints.filter((point: any) => point.ya.showspikes && point.ya.spikesnap !== 'hovered data');
                        if (closestHPoints.length) {
                            const closestHPt = closestHPoints[0];
                            if (isNumeric(closestHPt.x0) && isNumeric(closestHPt.y0)) {
                                tmpPoint = fillSpikePoint(closestHPt);
                                if (
                                    !spikePoints.hLinePoint ||
                                    (spikePoints.hLinePoint as any).spikeDistance > tmpPoint.spikeDistance
                                ) {
                                    spikePoints.hLinePoint = tmpPoint;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    findHoverPoints();

    function selectClosestPoint(pointsData: any[], spikedistance: number, spikeOnWinning: any): any {
        let resultPoint = null;
        let minDistance = Infinity;
        let thisSpikeDistance;

        for (let i = 0; i < pointsData.length; i++) {
            if (firstXaxis && firstXaxis._id !== pointsData[i].xa._id) continue;
            if (firstYaxis && firstYaxis._id !== pointsData[i].ya._id) continue;

            thisSpikeDistance = pointsData[i].spikeDistance;
            if (spikeOnWinning && i === 0) thisSpikeDistance = -Infinity;

            if (thisSpikeDistance <= minDistance && thisSpikeDistance <= spikedistance) {
                resultPoint = pointsData[i];
                minDistance = thisSpikeDistance;
            }
        }
        return resultPoint;
    }

    function fillSpikePoint(point: any): any {
        if (!point) return null;
        return {
            xa: point.xa,
            ya: point.ya,
            x: point.xSpike !== undefined ? point.xSpike : (point.x0 + point.x1) / 2,
            y: point.ySpike !== undefined ? point.ySpike : (point.y0 + point.y1) / 2,
            distance: point.distance,
            spikeDistance: point.spikeDistance,
            curveNumber: point.trace.index,
            color: point.color,
            pointNumber: point.index
        };
    }

    const spikelineOpts = {
        fullLayout: fullLayout,
        container: fullLayout._hoverlayer,
        event: evt
    };
    const oldspikepoints = gd._spikepoints;
    const newspikepoints = {
        vLinePoint: spikePoints.vLinePoint,
        hLinePoint: spikePoints.hLinePoint
    };
    gd._spikepoints = newspikepoints;

    const sortHoverData = function () {
        // When sorting keep the points in the main subplot at the top
        // then add points in other subplots

        const hoverDataInSubplot = hoverData.filter((a) => firstXaxis && firstXaxis._id === (a as any).xa._id && firstYaxis && firstYaxis._id === (a as any).ya._id);

        const hoverDataOutSubplot = hoverData.filter((a) => !(firstXaxis && firstXaxis._id === (a as any).xa._id && firstYaxis && firstYaxis._id === (a as any).ya._id));

        hoverDataInSubplot.sort(distanceSort);
        hoverDataOutSubplot.sort(distanceSort);
        hoverData = hoverDataInSubplot.concat(hoverDataOutSubplot);

        // move period positioned points and box/bar-like traces to the end of the list
        hoverData = (orderRangePoints(hoverData, hovermode) as any);
    };
    sortHoverData();

    const axLetter = hovermode.charAt(0);
    const spikeOnWinning =
        (axLetter === 'x' || axLetter === 'y') && hoverData[0] && cartesianScatterPoints[(hoverData[0] as any).trace.type];

    // Now if it is not restricted by spikedistance option, set the points to draw the spikelines
    if (hasCartesian && spikedistance !== 0) {
        if (hoverData.length !== 0) {
            const tmpHPointData = hoverData.filter((point) => (point as any).ya.showspikes);
            const tmpHPoint = selectClosestPoint(tmpHPointData, spikedistance, spikeOnWinning);
            spikePoints.hLinePoint = fillSpikePoint(tmpHPoint);

            const tmpVPointData = hoverData.filter((point) => (point as any).xa.showspikes);
            const tmpVPoint = selectClosestPoint(tmpVPointData, spikedistance, spikeOnWinning);
            spikePoints.vLinePoint = fillSpikePoint(tmpVPoint);
        }
    }

    // if hoverData is empty check for the spikes to draw and quit if there are none
    if (hoverData.length === 0) {
        const result = dragElement.unhoverRaw(gd, evt);
        if (hasCartesian && (spikePoints.hLinePoint !== null || spikePoints.vLinePoint !== null)) {
            if (spikesChanged(oldspikepoints)) {
                createSpikelines(gd, spikePoints, spikelineOpts);
            }
        }
        return result;
    }

    if (hasCartesian) {
        if (spikesChanged(oldspikepoints)) {
            createSpikelines(gd, spikePoints, spikelineOpts);
        }
    }

    if (
        helpers.isXYhover(_mode) &&
        (hoverData[0] as any).length !== 0 &&
        (hoverData[0] as any).trace.type !== 'splom' // TODO: add support for splom
    ) {
        // pick winning point
        const winningPoint = hoverData[0];
        // discard other points
        if (multipleHoverPoints[(winningPoint as any).trace.type]) {
            hoverData = hoverData.filter((d) => (d as any).trace.index === (winningPoint as any).trace.index);
        } else {
            hoverData = [winningPoint];
        }
        const initLen = hoverData.length;

        const winX = getCoord('x', winningPoint, fullLayout);
        const winY = getCoord('y', winningPoint, fullLayout);

        // in compare mode, select every point at position
        findHoverPoints(winX, winY);

        const finalPoints: any[] = [];
        const seen: any = {};
        let id = 0;
        const insert = function (newHd: any) {
            const key = multipleHoverPoints[newHd.trace.type] ? hoverDataKey(newHd) : newHd.trace.index;
            if (!seen[key]) {
                id++;
                seen[key] = id;
                finalPoints.push(newHd);
            } else {
                const oldId = seen[key] - 1;
                const oldHd = finalPoints[oldId];
                if (oldId > 0 && Math.abs(newHd.distance) < Math.abs((oldHd as any).distance)) {
                    // replace with closest
                    finalPoints[oldId] = newHd;
                }
            }
        };

        let k;
        // insert the winnig point(s) first
        for (k = 0; k < initLen; k++) {
            insert(hoverData[k]);
        }
        // override from the end
        for (k = hoverData.length - 1; k > initLen - 1; k--) {
            insert(hoverData[k]);
        }
        hoverData = (finalPoints as any);
        sortHoverData();
    }

    // lastly, emit custom hover/unhover events
    const oldhoverdata = gd._hoverdata;
    const newhoverdata: any[] = [];

    const gTop = getTopOffset(gd);
    const gLeft = getLeftOffset(gd);

    // pull out just the data that's useful to
    // other people and send it to the event
    for (const pt of hoverData) {
        const eventData = helpers.makeEventData(pt, (pt as any).trace, (pt as any).cd);

        if ((pt as any).hovertemplate !== false) {
            let ht = false;
            if ((pt as any).cd[(pt as any).index] && (pt as any).cd[(pt as any).index].ht) {
                ht = (pt as any).cd[(pt as any).index].ht;
            }
            (pt as any).hovertemplate = ht || (pt as any).trace.hovertemplate || false;
        }

        if ((pt as any).xa && (pt as any).ya) {
            const _x0 = (pt as any).x0 + (pt as any).xa._offset;
            const _x1 = (pt as any).x1 + (pt as any).xa._offset;
            const _y0 = (pt as any).y0 + (pt as any).ya._offset;
            const _y1 = (pt as any).y1 + (pt as any).ya._offset;

            const x0 = Math.min(_x0, _x1);
            const x1 = Math.max(_x0, _x1);
            const y0 = Math.min(_y0, _y1);
            const y1 = Math.max(_y0, _y1);

            eventData.bbox = {
                x0: x0 + gLeft,
                x1: x1 + gLeft,
                y0: y0 + gTop,
                y1: y1 + gTop
            };
        }

        (pt as any).eventData = [eventData];
        newhoverdata.push(eventData);
    }

    gd._hoverdata = newhoverdata;

    const rotateLabels =
        (hovermode === 'y' && (searchData.length > 1 || hoverData.length > 1)) ||
        (hovermode === 'closest' && hasOneHorizontalTrace && hoverData.length > 1);

    const bgColor = Color.combine(fullLayout.plot_bgcolor || Color.background, fullLayout.paper_bgcolor);

    const hoverText = createHoverText(hoverData, {
        gd: gd,
        hovermode: hovermode,
        rotateLabels: rotateLabels,
        bgColor: bgColor,
        container: fullLayout._hoverlayer,
        outerContainer: fullLayout._paper.node(),
        commonLabelOpts: fullLayout.hoverlabel,
        hoverdistance: fullLayout.hoverdistance
    });
    const hoverLabels = hoverText.hoverLabels;

    if (!helpers.isUnifiedHover(hovermode)) {
        hoverAvoidOverlaps(hoverLabels, rotateLabels, fullLayout, hoverText.commonLabelBoundingBox);
        alignHoverText(hoverLabels, rotateLabels, fullLayout._invScaleX, fullLayout._invScaleY);
    } // TODO: tagName hack is needed to appease geo.js's hack of using eventTarget=true
    // we should improve the "fx" API so other plots can use it without these hack.
    if (eventTarget && eventTarget.tagName) {
        const hasClickToShow = getComponentMethod('annotations', 'hasClickToShow')(gd, newhoverdata);
        overrideCursor(select(eventTarget), hasClickToShow ? 'pointer' : '');
    }

    // don't emit events if called manually
    if (!eventTarget || noHoverEvent || !hoverChanged(gd, evt, oldhoverdata)) return;

    if (oldhoverdata) {
        gd.emit('plotly_unhover', {
            event: evt,
            points: oldhoverdata
        });
    }

    gd.emit('plotly_hover', {
        event: evt,
        points: gd._hoverdata,
        xaxes: xaArray,
        yaxes: yaArray,
        xvals: xvalArray,
        yvals: yvalArray
    });
}

function hoverDataKey(d: any): string {
    return [d.trace.index, d.index, d.x0, d.y0, d.name, d.attr, d.xa ? d.xa._id : '', d.ya ? d.ya._id : ''].join(',');
}

const EXTRA_STRING_REGEX = /<extra>([\s\S]*)<\/extra>/;

function createHoverText(hoverData: any[], opts: any): any {
    const gd = opts.gd;
    const fullLayout = gd._fullLayout;
    const hovermode = opts.hovermode;
    const rotateLabels = opts.rotateLabels;
    const bgColor = opts.bgColor;
    const container = opts.container;
    const outerContainer = opts.outerContainer;
    const commonLabelOpts = opts.commonLabelOpts || {};
    // Early exit if no labels are drawn
    if (hoverData.length === 0) return [[]];

    // opts.fontFamily/Size are used for the common label
    // and as defaults for each hover label, though the individual labels
    // can override this.
    const fontFamily = opts.fontFamily || constants.HOVERFONT;
    const fontSize = opts.fontSize || constants.HOVERFONTSIZE;
    const fontWeight = opts.fontWeight || fullLayout.font.weight;
    const fontStyle = opts.fontStyle || fullLayout.font.style;
    const fontVariant = opts.fontVariant || fullLayout.font.variant;
    const fontTextcase = opts.fontTextcase || fullLayout.font.textcase;
    const fontLineposition = opts.fontLineposition || fullLayout.font.lineposition;
    const fontShadow = opts.fontShadow || fullLayout.font.shadow;

    const c0 = hoverData[0];
    const xa = c0.xa;
    const ya = c0.ya;
    const axLetter = hovermode.charAt(0);
    const axLabel = axLetter + 'Label';
    let t0 = c0[axLabel];

    // search in array for the label
    if (t0 === undefined && xa.type === 'multicategory') {
        for (let q = 0; q < hoverData.length; q++) {
            t0 = hoverData[q][axLabel];
            if (t0 !== undefined) break;
        }
    }

    const outerContainerBB = getBoundingClientRect(gd, outerContainer);
    const outerTop = outerContainerBB.top;
    const outerWidth = outerContainerBB.width;
    const outerHeight = outerContainerBB.height;

    // show the common label, if any, on the axis
    // never show a common label in array mode,
    // even if sometimes there could be one
    let showCommonLabel =
        t0 !== undefined && c0.distance <= opts.hoverdistance && (hovermode === 'x' || hovermode === 'y');

    // all hover traces hoverinfo must contain the hovermode
    // to have common labels
    if (showCommonLabel) {
        let allHaveZ = true;
        let i, traceHoverinfo;
        for (i = 0; i < hoverData.length; i++) {
            if (allHaveZ && hoverData[i].zLabel === undefined) allHaveZ = false;

            traceHoverinfo = hoverData[i].hoverinfo || hoverData[i].trace.hoverinfo;
            if (traceHoverinfo) {
                const parts = Array.isArray(traceHoverinfo) ? traceHoverinfo : traceHoverinfo.split('+');
                if (parts.indexOf('all') === -1 && parts.indexOf(hovermode) === -1) {
                    showCommonLabel = false;
                    break;
                }
            }
        }

        // xyz labels put all info in their main label, so have no need of a common label
        if (allHaveZ) showCommonLabel = false;
    }

    const commonLabelJoin = container.selectAll('g.axistext').data(showCommonLabel ? [0] : []);
    const commonLabelEnter = commonLabelJoin.enter().append('g').classed('axistext', true);
    commonLabelJoin.exit().remove();
    const commonLabel = commonLabelJoin.merge(commonLabelEnter);

    // set rect (without arrow) behind label below for later collision detection
    const commonLabelRect: any = {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0
    };
    commonLabel.each(function (this: any) {
        const label = select(this);
        const lpath = ensureSingle(label, 'path', '', function (s: any) {
            s.style('stroke-width', '1px');
        });
        const ltext = ensureSingle(label, 'text', '', function (s: any) {
            // prohibit tex interpretation until we can handle
            // tex and regular text together
            s.attr('data-notex', 1);
        });

        const commonBgColor = commonLabelOpts.bgcolor || Color.defaultLine;
        const commonStroke = commonLabelOpts.bordercolor || Color.contrast(commonBgColor);
        const contrastColor = Color.contrast(commonBgColor);
        const commonLabelOptsFont = commonLabelOpts.font;
        const commonLabelFont = {
            weight: commonLabelOptsFont.weight || fontWeight,
            style: commonLabelOptsFont.style || fontStyle,
            variant: commonLabelOptsFont.variant || fontVariant,
            textcase: commonLabelOptsFont.textcase || fontTextcase,
            lineposition: commonLabelOptsFont.lineposition || fontLineposition,
            shadow: commonLabelOptsFont.shadow || fontShadow,
            family: commonLabelOptsFont.family || fontFamily,
            size: commonLabelOptsFont.size || fontSize,
            color: commonLabelOptsFont.color || contrastColor
        };

        lpath
            .style('fill', commonBgColor)
            .style('stroke', commonStroke);

        ltext
            .text(t0)
            .call(drawingFont, commonLabelFont)
            .call(svgTextUtils.positionText, 0, 0)
            .call(svgTextUtils.convertToTspans, gd);

        label.attr('transform', '');

        const tbb = getBoundingClientRect(gd, ltext.node());
        let lx, ly;

        if (hovermode === 'x') {
            const topsign = xa.side === 'top' ? '-' : '';

            ltext
                .attr('text-anchor', 'middle')
                .call(
                    svgTextUtils.positionText,
                    0,
                    xa.side === 'top'
                        ? outerTop - tbb.bottom - HOVERARROWSIZE - HOVERTEXTPAD
                        : outerTop - tbb.top + HOVERARROWSIZE + HOVERTEXTPAD
                );

            lx = xa._offset + (c0.x0 + c0.x1) / 2;
            ly = ya._offset + (xa.side === 'top' ? 0 : ya._length);

            const halfWidth = tbb.width / 2 + HOVERTEXTPAD;

            let tooltipMidX = lx;
            if (lx < halfWidth) {
                tooltipMidX = halfWidth;
            } else if (lx > fullLayout.width - halfWidth) {
                tooltipMidX = fullLayout.width - halfWidth;
            }

            lpath.attr(
                'd',
                'M' +
                    (lx - tooltipMidX) +
                    ',0' +
                    'L' +
                    (lx - tooltipMidX + HOVERARROWSIZE) +
                    ',' +
                    topsign +
                    HOVERARROWSIZE +
                    'H' +
                    halfWidth +
                    'v' +
                    topsign +
                    (HOVERTEXTPAD * 2 + tbb.height) +
                    'H' +
                    -halfWidth +
                    'V' +
                    topsign +
                    HOVERARROWSIZE +
                    'H' +
                    (lx - tooltipMidX - HOVERARROWSIZE) +
                    'Z'
            );

            lx = tooltipMidX;
            commonLabelRect.minX = lx - halfWidth;
            commonLabelRect.maxX = lx + halfWidth;
            if (xa.side === 'top') {
                // label on negative y side
                commonLabelRect.minY = ly - (HOVERTEXTPAD * 2 + tbb.height);
                commonLabelRect.maxY = ly - HOVERTEXTPAD;
            } else {
                commonLabelRect.minY = ly + HOVERTEXTPAD;
                commonLabelRect.maxY = ly + (HOVERTEXTPAD * 2 + tbb.height);
            }
        } else {
            let anchor;
            let sgn;
            let leftsign;
            if (ya.side === 'right') {
                anchor = 'start';
                sgn = 1;
                leftsign = '';
                lx = xa._offset + xa._length;
            } else {
                anchor = 'end';
                sgn = -1;
                leftsign = '-';
                lx = xa._offset;
            }

            ly = ya._offset + (c0.y0 + c0.y1) / 2;

            ltext.attr('text-anchor', anchor);

            lpath.attr(
                'd',
                'M0,0' +
                    'L' +
                    leftsign +
                    HOVERARROWSIZE +
                    ',' +
                    HOVERARROWSIZE +
                    'V' +
                    (HOVERTEXTPAD + tbb.height / 2) +
                    'h' +
                    leftsign +
                    (HOVERTEXTPAD * 2 + tbb.width) +
                    'V-' +
                    (HOVERTEXTPAD + tbb.height / 2) +
                    'H' +
                    leftsign +
                    HOVERARROWSIZE +
                    'V-' +
                    HOVERARROWSIZE +
                    'Z'
            );

            commonLabelRect.minY = ly - (HOVERTEXTPAD + tbb.height / 2);
            commonLabelRect.maxY = ly + (HOVERTEXTPAD + tbb.height / 2);
            if (ya.side === 'right') {
                commonLabelRect.minX = lx + HOVERARROWSIZE;
                commonLabelRect.maxX = lx + HOVERARROWSIZE + (HOVERTEXTPAD * 2 + tbb.width);
            } else {
                // label on negative x side
                commonLabelRect.minX = lx - HOVERARROWSIZE - (HOVERTEXTPAD * 2 + tbb.width);
                commonLabelRect.maxX = lx - HOVERARROWSIZE;
            }

            const halfHeight = tbb.height / 2;
            const lty = outerTop - tbb.top - halfHeight;
            const clipId = 'clip' + fullLayout._uid + 'commonlabel' + ya._id;
            let clipPath;

            if (lx < tbb.width + 2 * HOVERTEXTPAD + HOVERARROWSIZE) {
                clipPath =
                    'M-' +
                    (HOVERARROWSIZE + HOVERTEXTPAD) +
                    '-' +
                    halfHeight +
                    'h-' +
                    (tbb.width - HOVERTEXTPAD) +
                    'V' +
                    halfHeight +
                    'h' +
                    (tbb.width - HOVERTEXTPAD) +
                    'Z';

                const ltx = tbb.width - lx + HOVERTEXTPAD;
                svgTextUtils.positionText(ltext, ltx, lty);

                // shift each line (except the longest) so that start-of-line
                // is always visible
                if (anchor === 'end') {
                    ltext.selectAll('tspan').each(function (this: any) {
                        const s = select(this);
                        const dummy = tester.append('text').text(s.text()).call(drawingFont, commonLabelFont);
                        const dummyBB = getBoundingClientRect(gd, dummy.node());
                        if (Math.round(dummyBB.width) < Math.round(tbb.width)) {
                            s.attr('x', ltx - dummyBB.width);
                        }
                        dummy.remove();
                    });
                }
            } else {
                svgTextUtils.positionText(ltext, sgn * (HOVERTEXTPAD + HOVERARROWSIZE), lty);
                clipPath = null;
            }

            const textClipJoin = fullLayout._topclips.selectAll('#' + clipId).data(clipPath ? [0] : []);
            const textClipEnter = textClipJoin.enter().append('clipPath').attr('id', clipId);
            textClipEnter.append('path');
            textClipJoin.exit().remove();
            const textClip = textClipJoin.merge(textClipEnter);
            textClip.select('path').attr('d', clipPath);
            setClipUrl(ltext, (clipPath ? clipId : null as any), gd);
        }

        label.attr('transform', strTranslate(lx, ly));
    });

    // Show a single hover label
    if (helpers.isUnifiedHover(hovermode)) {
        // Delete leftover hover labels from other hovermodes
        container.selectAll('g.hovertext').remove();
        const groupedHoverData = hoverData.filter((data) => data.hoverinfo !== 'none');
        // Return early if nothing is hovered on
        if (groupedHoverData.length === 0) return [];

        // mock legend
        const hoverlabel = fullLayout.hoverlabel;
        const font = hoverlabel.font;

        const item0 = groupedHoverData[0];

        const unifiedhovertitleText = ((hovermode === 'x unified' ? item0.xa : item0.ya).unifiedhovertitle || {}).text;

        const mainText = !unifiedhovertitleText
            ? t0
            : hovertemplateString({
                  data:
                      hovermode === 'x unified' ? [{ xa: item0.xa, x: item0.xVal }] : [{ ya: item0.ya, y: item0.yVal }],
                  fallback: item0.trace.hovertemplatefallback,
                  locale: fullLayout._d3locale,
                  template: unifiedhovertitleText
              });

        const mockLayoutIn = {
            showlegend: true,
            legend: {
                title: { text: mainText, font: font },
                font: font,
                bgcolor: hoverlabel.bgcolor,
                bordercolor: hoverlabel.bordercolor,
                borderwidth: 1,
                tracegroupgap: 7,
                traceorder: fullLayout.legend ? fullLayout.legend.traceorder : undefined,
                orientation: 'v'
            }
        };
        const mockLayoutOut: any = {
            font: font
        };
        legendSupplyDefaults(mockLayoutIn, mockLayoutOut, gd._fullData);
        const mockLegend = mockLayoutOut.legend;

        // Force traceorder from fullLayout — legendSupplyDefaults may
        // override it to 'normal' when traces have showlegend: false
        if(fullLayout.legend && fullLayout.legend.traceorder) {
            mockLegend.traceorder = fullLayout.legend.traceorder;
        }

        // prepare items for the legend
        mockLegend.entries = [];
        for (let j = 0; j < groupedHoverData.length; j++) {
            const pt = groupedHoverData[j];
            if (pt.hoverinfo === 'none') continue;

            const texts = getHoverLabelText(pt, true, hovermode, fullLayout, t0);
            const text = texts[0];
            const name = texts[1];

            pt.name = name;
            if (name !== '') {
                pt.text = name + ' : ' + text;
            } else {
                pt.text = text;
            }

            // pass through marker's calcdata to style legend items
            const cd = pt.cd[pt.index];
            if (cd) {
                if (cd.mc) pt.mc = cd.mc;
                if (cd.mcc) pt.mc = cd.mcc;
                if (cd.mlc) pt.mlc = cd.mlc;
                if (cd.mlcc) pt.mlc = cd.mlcc;
                if (cd.mlw) pt.mlw = cd.mlw;
                if (cd.mrc) pt.mrc = cd.mrc;
                if (cd.dir) pt.dir = cd.dir;
            }
            pt._distinct = true;

            mockLegend.entries.push([pt]);
        }
        // Normalize to trace index order before getLegendData applies traceorder.
        // groupedHoverData may arrive in inconsistent order depending on
        // showlegend and hover collection order.
        mockLegend.entries.sort((a: any, b: any) => a[0].trace.index - b[0].trace.index);
        // Reversal (if traceorder includes 'reversed') is handled by getLegendData inside legendDraw.
        // which respects traceorder (including 'reversed').
        mockLegend.layer = container;

        // Draw unified hover label
        mockLegend._inHover = true;
        mockLegend._groupTitleFont = hoverlabel.grouptitlefont;

        legendDraw(gd, mockLegend);

        // Position the hover
        const legendContainer = container.select('g.legend');
        const tbb = getBoundingClientRect(gd, legendContainer.node());
        const tWidth = tbb.width + 2 * HOVERTEXTPAD;
        const tHeight = tbb.height + 2 * HOVERTEXTPAD;
        const winningPoint = groupedHoverData[0];
        const avgX = (winningPoint.x0 + winningPoint.x1) / 2;
        const avgY = (winningPoint.y0 + winningPoint.y1) / 2;
        // When a scatter (or e.g. heatmap) point wins, it's OK for the hovelabel to occlude the bar and other points.
        const pointWon = !(
            traceIs(winningPoint.trace, 'bar-like') || traceIs(winningPoint.trace, 'box-violin')
        );

        let lyBottom, lyTop;
        if (axLetter === 'y') {
            if (pointWon) {
                lyTop = avgY - HOVERTEXTPAD;
                lyBottom = avgY + HOVERTEXTPAD;
            } else {
                lyTop = Math.min.apply(
                    null,
                    groupedHoverData.map((c) => Math.min(c.y0, c.y1))
                );
                lyBottom = Math.max.apply(
                    null,
                    groupedHoverData.map((c) => Math.max(c.y0, c.y1))
                );
            }
        } else {
            lyTop = lyBottom =
                mean(
                    groupedHoverData.map((c) => (c.y0 + c.y1) / 2)
                ) -
                tHeight / 2;
        }

        let lxRight, lxLeft;
        if (axLetter === 'x') {
            if (pointWon) {
                lxRight = avgX + HOVERTEXTPAD;
                lxLeft = avgX - HOVERTEXTPAD;
            } else {
                lxRight = Math.max.apply(
                    null,
                    groupedHoverData.map((c) => Math.max(c.x0, c.x1))
                );
                lxLeft = Math.min.apply(
                    null,
                    groupedHoverData.map((c) => Math.min(c.x0, c.x1))
                );
            }
        } else {
            lxRight = lxLeft =
                mean(
                    groupedHoverData.map((c) => (c.x0 + c.x1) / 2)
                ) -
                tWidth / 2;
        }

        const xOffset = xa._offset;
        const yOffset = ya._offset;
        lyBottom += yOffset;
        lxRight += xOffset;
        lxLeft += xOffset - tWidth;
        lyTop += yOffset - tHeight;

        let lx, ly; // top and left positions of the hover box

        // horizontal alignment to end up on screen
        if (lxRight + tWidth < outerWidth && lxRight >= 0) {
            lx = lxRight;
        } else if (lxLeft + tWidth < outerWidth && lxLeft >= 0) {
            lx = lxLeft;
        } else if (xOffset + tWidth < outerWidth) {
            lx = xOffset; // subplot left corner
        } else {
            // closest left or right side of the paper
            if (lxRight - avgX < avgX - lxLeft + tWidth) {
                lx = outerWidth - tWidth;
            } else {
                lx = 0;
            }
        }
        lx += HOVERTEXTPAD;

        // vertical alignement to end up on screen
        if (lyBottom + tHeight < outerHeight && lyBottom >= 0) {
            ly = lyBottom;
        } else if (lyTop + tHeight < outerHeight && lyTop >= 0) {
            ly = lyTop;
        } else if (yOffset + tHeight < outerHeight) {
            ly = yOffset; // subplot top corner
        } else {
            // closest top or bottom side of the paper
            if (lyBottom - avgY < avgY - lyTop + tHeight) {
                ly = outerHeight - tHeight;
            } else {
                ly = 0;
            }
        }
        ly += HOVERTEXTPAD;

        legendContainer.attr('transform', strTranslate(lx - 1, ly - 1));
        return legendContainer;
    }

    // show all the individual labels

    // first create the objects
    const hoverLabelsJoin = container.selectAll('g.hovertext').data(hoverData, function (d: any) {
        // N.B. when multiple items have the same result key-function value,
        // only the first of those items in hoverData gets rendered
        return hoverDataKey(d);
    });
    const hoverLabelsEnter = hoverLabelsJoin
        .enter()
        .append('g')
        .classed('hovertext', true)
        .each(function (this: any) {
            const g = select(this);
            // trace name label (rect and text.name)
            g.append('rect').call(Color.fill, Color.addOpacity(bgColor, 0.8));
            g.append('text').classed('name', true);
            // trace data label (path and text.nums)
            g.append('path').style('stroke-width', '1px');
            g.append('text').classed('nums', true).call(drawingFont, {
                weight: fontWeight,
                style: fontStyle,
                variant: fontVariant,
                textcase: fontTextcase,
                lineposition: fontLineposition,
                shadow: fontShadow,
                family: fontFamily,
                size: fontSize
            });
        });
    hoverLabelsJoin.exit().remove();

    const hoverLabels = hoverLabelsJoin.merge(hoverLabelsEnter);

    // then put the text in, position the pointer to the data,
    // and figure out sizes
    hoverLabels.each(function (this: any, d: any) {
        const g = select(this).attr('transform', '');

        let dColor = d.color;
        if (Array.isArray(dColor)) {
            dColor = dColor[d.eventData[0].pointNumber];
        }

        // combine possible non-opaque trace color with bgColor
        const color0 = d.bgcolor || dColor;
        // color for 'nums' part of the label
        const numsColor = Color.combine(Color.opacity(color0) ? color0 : Color.defaultLine, bgColor);
        // color for 'name' part of the label
        const nameColor = Color.combine(Color.opacity(dColor) ? dColor : Color.defaultLine, bgColor);
        // find a contrasting color for border and text
        const contrastColor = d.borderColor || Color.contrast(numsColor);

        const texts = getHoverLabelText(d, showCommonLabel, hovermode, fullLayout, t0, g);
        const text = texts[0];
        const name = texts[1];

        // main label
        const tx = g
            .select('text.nums')
            .call(drawingFont, {
                family: d.fontFamily || fontFamily,
                size: d.fontSize || fontSize,
                color: d.fontColor || contrastColor,
                weight: d.fontWeight || fontWeight,
                style: d.fontStyle || fontStyle,
                variant: d.fontVariant || fontVariant,
                textcase: d.fontTextcase || fontTextcase,
                lineposition: d.fontLineposition || fontLineposition,
                shadow: d.fontShadow || fontShadow
            })
            .text(text)
            .attr('data-notex', 1)
            .call(svgTextUtils.positionText, 0, 0)
            .call(svgTextUtils.convertToTspans, gd);

        const tx2 = g.select('text.name');
        let tx2width = 0;
        let tx2height = 0;

        // secondary label for non-empty 'name'
        if (name && name !== text) {
            tx2.call(drawingFont, {
                family: d.fontFamily || fontFamily,
                size: d.fontSize || fontSize,
                color: nameColor,
                weight: d.fontWeight || fontWeight,
                style: d.fontStyle || fontStyle,
                variant: d.fontVariant || fontVariant,
                textcase: d.fontTextcase || fontTextcase,
                lineposition: d.fontLineposition || fontLineposition,
                shadow: d.fontShadow || fontShadow
            })
                .text(name)
                .attr('data-notex', 1)
                .call(svgTextUtils.positionText, 0, 0)
                .call(svgTextUtils.convertToTspans, gd);

            const t2bb = getBoundingClientRect(gd, tx2.node());
            tx2width = t2bb.width + 2 * HOVERTEXTPAD;
            tx2height = t2bb.height + 2 * HOVERTEXTPAD;
        } else {
            tx2.remove();
            g.select('rect').remove();
        }

        g.select('path')
            .style('fill', numsColor)
            .style('stroke', contrastColor);

        let htx = d.xa._offset + (d.x0 + d.x1) / 2;
        let hty = d.ya._offset + (d.y0 + d.y1) / 2;
        const dx = Math.abs(d.x1 - d.x0);
        const dy = Math.abs(d.y1 - d.y0);

        const tbb = getBoundingClientRect(gd, tx.node());
        const tbbWidth = tbb.width / fullLayout._invScaleX;
        const tbbHeight = tbb.height / fullLayout._invScaleY;

        d.ty0 = (outerTop - tbb.top) / fullLayout._invScaleY;
        d.bx = tbbWidth + 2 * HOVERTEXTPAD;
        d.by = Math.max(tbbHeight + 2 * HOVERTEXTPAD, tx2height);
        d.anchor = 'start';
        d.txwidth = tbbWidth;
        d.tx2width = tx2width;
        d.offset = 0;

        const txTotalWidth = (tbbWidth + HOVERARROWSIZE + HOVERTEXTPAD + tx2width) * fullLayout._invScaleX;
        let anchorStartOK, anchorEndOK;

        if (rotateLabels) {
            d.pos = htx;
            anchorStartOK = hty + dy / 2 + txTotalWidth <= outerHeight;
            anchorEndOK = hty - dy / 2 - txTotalWidth >= 0;
            if ((d.idealAlign === 'top' || !anchorStartOK) && anchorEndOK) {
                hty -= dy / 2;
                d.anchor = 'end';
            } else if (anchorStartOK) {
                hty += dy / 2;
                d.anchor = 'start';
            } else {
                d.anchor = 'middle';
            }
            d.crossPos = hty;
        } else {
            d.pos = hty;
            anchorStartOK = htx + dx / 2 + txTotalWidth <= outerWidth;
            anchorEndOK = htx - dx / 2 - txTotalWidth >= 0;

            if ((d.idealAlign === 'left' || !anchorStartOK) && anchorEndOK) {
                htx -= dx / 2;
                d.anchor = 'end';
            } else if (anchorStartOK) {
                htx += dx / 2;
                d.anchor = 'start';
            } else {
                d.anchor = 'middle';

                const txHalfWidth = txTotalWidth / 2;
                const overflowR = htx + txHalfWidth - outerWidth;
                const overflowL = htx - txHalfWidth;
                if (overflowR > 0) htx -= overflowR;
                if (overflowL < 0) htx += -overflowL;
            }
            d.crossPos = htx;
        }

        tx.attr('text-anchor', d.anchor);
        if (tx2width) tx2.attr('text-anchor', d.anchor);
        g.attr('transform', strTranslate(htx, hty) + (rotateLabels ? strRotate(YANGLE) : ''));
    });

    return {
        hoverLabels: hoverLabels,
        commonLabelBoundingBox: commonLabelRect
    };
}

function getHoverLabelText(d: any, showCommonLabel: boolean, hovermode: any, fullLayout: FullLayout, t0: any, g?: any): [string, string] {
    let name = '';
    let text = '';
    // to get custom 'name' labels pass cleanPoint
    if (d.nameOverride !== undefined) d.name = d.nameOverride;

    if (d.name) {
        if (d.trace._meta) d.name = templateString(d.name, d.trace._meta);
        name = plainText(d.name, d.nameLength);
    }

    const h0 = hovermode.charAt(0);
    const h1 = h0 === 'x' ? 'y' : 'x';

    if (d.zLabel !== undefined) {
        if (d.xLabel !== undefined) text += 'x: ' + d.xLabel + '<br>';
        if (d.yLabel !== undefined) text += 'y: ' + d.yLabel + '<br>';
        if (d.trace.type !== 'choropleth' && d.trace.type !== 'choroplethmapbox' && d.trace.type !== 'choroplethmap') {
            text += (text ? 'z: ' : '') + d.zLabel;
        }
    } else if (showCommonLabel && d[h0 + 'Label'] === t0) {
        text = d[h1 + 'Label'] || '';
    } else if (d.xLabel === undefined) {
        if (d.yLabel !== undefined && d.trace.type !== 'scattercarpet') {
            text = d.yLabel;
        }
    } else if (d.yLabel === undefined) text = d.xLabel;
    else text = '(' + d.xLabel + ', ' + d.yLabel + ')';

    if ((d.text || d.text === 0) && !Array.isArray(d.text)) {
        text += (text ? '<br>' : '') + d.text;
    }

    // used by other modules (initially just ternary) that
    // manage their own hoverinfo independent of cleanPoint
    // the rest of this will still apply, so such modules
    // can still put things in (x|y|z)Label, text, and name
    // and hoverinfo will still determine their visibility
    if (d.extraText !== undefined) text += (text ? '<br>' : '') + d.extraText;

    // if 'text' is empty at this point,
    // and hovertemplate is not defined,
    // put 'name' in main label and don't show secondary label
    if (g && text === '' && !d.hovertemplate) {
        // if 'name' is also empty, remove entire label
        if (name === '') g.remove();
        text = name;
    }

    // Ignore hovertemplate if hoverlabel.split is set
    // This ensures correct behavior of hoverlabel.split for candlestick and OHLC traces
    // Not very elegant but it works
    if (d.trace?.hoverlabel?.split) d.hovertemplate = '';

    const { hovertemplate = false } = d;
    if (hovertemplate) {
        const labels = d.hovertemplateLabels || d;

        if (d[h0 + 'Label'] !== t0) {
            labels[h0 + 'other'] = labels[h0 + 'Val'];
            labels[h0 + 'otherLabel'] = labels[h0 + 'Label'];
        }

        text = hovertemplateString({
            data: [d.eventData[0] || {}, d.trace._meta],
            fallback: d.trace.hovertemplatefallback,
            labels,
            locale: fullLayout._d3locale,
            template: hovertemplate
        });

        text = text.replace(EXTRA_STRING_REGEX, (_, extra) => {
            // assign name for secondary text label
            name = plainText(extra, d.nameLength);
            // remove from main text label
            return '';
        });
    }
    return [text, name];
}

// Make groups of touching points, and within each group
// move each point so that no labels overlap, but the average
// label position is the same as it was before moving. Incidentally,
// this is equivalent to saying all the labels are on equal linear
// springs about their initial position. Initially, each point is
// its own group, but as we find overlaps we will clump the points.
//
// Also, there are hard constraints at the edges of the graphs,
// that push all groups to the middle so they are visible. I don't
// know what happens if the group spans all the way from one edge to
// the other, though it hardly matters - there's just too much
// information then.
function hoverAvoidOverlaps(hoverLabels: any, rotateLabels: boolean, fullLayout: FullLayout, commonLabelBoundingBox: any): void {
    const axKey = rotateLabels ? 'xa' : 'ya';
    const crossAxKey = rotateLabels ? 'ya' : 'xa';
    let nummoves = 0;
    let axSign = 1;
    const nLabels = hoverLabels.size();

    // make groups of touching points
    const pointgroups = new Array(nLabels);
    let k = 0;

    // get extent of axis hover label
    const axisLabelMinX = commonLabelBoundingBox.minX;
    const axisLabelMaxX = commonLabelBoundingBox.maxX;
    const axisLabelMinY = commonLabelBoundingBox.minY;
    const axisLabelMaxY = commonLabelBoundingBox.maxY;

    const pX = function (x: any) {
        return x * fullLayout._invScaleX;
    };
    const pY = function (y: any) {
        return y * fullLayout._invScaleY;
    };

    hoverLabels.each(function (d: any) {
        const ax = d[axKey];
        const crossAx = d[crossAxKey];
        const axIsX = ax._id.charAt(0) === 'x';
        const rng = ax.range;

        if (k === 0 && rng && rng[0] > rng[1] !== axIsX) {
            axSign = -1;
        }
        let pmin = 0;
        let pmax = axIsX ? fullLayout.width : fullLayout.height;
        // in hovermode avoid overlap between hover labels and axis label
        if (fullLayout.hovermode === 'x' || fullLayout.hovermode === 'y') {
            // extent of rect behind hover label on cross axis:
            const offsets = getHoverLabelOffsets(d, rotateLabels);
            const anchor = d.anchor;
            const horzSign = anchor === 'end' ? -1 : 1;
            let labelMin;
            let labelMax;
            if (anchor === 'middle') {
                // use extent of centered rect either on x or y axis depending on current axis
                labelMin = d.crossPos + (axIsX ? pY(offsets.y - d.by / 2) : pX(d.bx / 2 + d.tx2width / 2));
                labelMax = labelMin + (axIsX ? pY(d.by) : pX(d.bx));
            } else {
                // use extend of path (see alignHoverText function) without arrow
                if (axIsX) {
                    labelMin = d.crossPos + pY(HOVERARROWSIZE + offsets.y) - pY(d.by / 2 - HOVERARROWSIZE);
                    labelMax = labelMin + pY(d.by);
                } else {
                    const startX = pX(horzSign * HOVERARROWSIZE + offsets.x);
                    const endX = startX + pX(horzSign * d.bx);
                    labelMin = d.crossPos + Math.min(startX, endX);
                    labelMax = d.crossPos + Math.max(startX, endX);
                }
            }

            if (axIsX) {
                if (
                    axisLabelMinY !== undefined &&
                    axisLabelMaxY !== undefined &&
                    Math.min(labelMax, axisLabelMaxY) - Math.max(labelMin, axisLabelMinY) > 1
                ) {
                    // has at least 1 pixel overlap with axis label
                    if (crossAx.side === 'left') {
                        pmin = crossAx._mainLinePosition;
                        pmax = fullLayout.width;
                    } else {
                        pmax = crossAx._mainLinePosition;
                    }
                }
            } else {
                if (
                    axisLabelMinX !== undefined &&
                    axisLabelMaxX !== undefined &&
                    Math.min(labelMax, axisLabelMaxX) - Math.max(labelMin, axisLabelMinX) > 1
                ) {
                    // has at least 1 pixel overlap with axis label
                    if (crossAx.side === 'top') {
                        pmin = crossAx._mainLinePosition;
                        pmax = fullLayout.height;
                    } else {
                        pmax = crossAx._mainLinePosition;
                    }
                }
            }
        }

        pointgroups[k++] = [
            {
                datum: d,
                traceIndex: d.trace.index,
                dp: 0,
                pos: d.pos,
                posref: d.posref,
                size: (d.by * (axIsX ? YFACTOR : 1)) / 2,
                pmin: pmin,
                pmax: pmax
            }
        ];
    });

    pointgroups.sort((a, b) => {
        return (
            a[0].posref - b[0].posref ||
            // for equal positions, sort trace indices increasing or decreasing
            // depending on whether the axis is reversed or not... so stacked
            // traces will generally keep their order even if one trace adds
            // nothing to the stack.
            axSign * (b[0].traceIndex - a[0].traceIndex)
        );
    });

    let donepositioning: any, topOverlap, bottomOverlap, i, j, pti, sumdp;

    function constrainGroup(grp: any[]): void {
        const minPt = grp[0];
        const maxPt = grp[grp.length - 1];

        // overlap with the top - positive vals are overlaps
        topOverlap = minPt.pmin - minPt.pos - minPt.dp + minPt.size;

        // overlap with the bottom - positive vals are overlaps
        bottomOverlap = maxPt.pos + maxPt.dp + maxPt.size - minPt.pmax;

        // check for min overlap first, so that we always
        // see the largest labels
        // allow for .01px overlap, so we don't get an
        // infinite loop from rounding errors
        if (topOverlap > 0.01) {
            for (j = grp.length - 1; j >= 0; j--) grp[j].dp += topOverlap;
            donepositioning = false;
        }
        if (bottomOverlap < 0.01) return;
        if (topOverlap < -0.01) {
            // make sure we're not pushing back and forth
            for (j = grp.length - 1; j >= 0; j--) grp[j].dp -= bottomOverlap;
            donepositioning = false;
        }
        if (!donepositioning) return;

        // no room to fix positioning, delete off-screen points

        // first see how many points we need to delete
        let deleteCount = 0;
        for (i = 0; i < grp.length; i++) {
            pti = grp[i];
            if (pti.pos + pti.dp + pti.size > minPt.pmax) deleteCount++;
        }

        // start by deleting points whose data is off screen
        for (i = grp.length - 1; i >= 0; i--) {
            if (deleteCount <= 0) break;
            pti = grp[i];

            // pos has already been constrained to [pmin,pmax]
            // so look for points close to that to delete
            if (pti.pos > minPt.pmax - 1) {
                pti.del = true;
                deleteCount--;
            }
        }
        for (i = 0; i < grp.length; i++) {
            if (deleteCount <= 0) break;
            pti = grp[i];

            // pos has already been constrained to [pmin,pmax]
            // so look for points close to that to delete
            if (pti.pos < minPt.pmin + 1) {
                pti.del = true;
                deleteCount--;

                // shift the whole group minus into this new space
                bottomOverlap = pti.size * 2;
                for (j = grp.length - 1; j >= 0; j--) grp[j].dp -= bottomOverlap;
            }
        }
        // then delete points that go off the bottom
        for (i = grp.length - 1; i >= 0; i--) {
            if (deleteCount <= 0) break;
            pti = grp[i];
            if (pti.pos + pti.dp + pti.size > minPt.pmax) {
                pti.del = true;
                deleteCount--;
            }
        }
    }

    // loop through groups, combining them if they overlap,
    // until nothing moves
    while (!donepositioning && nummoves <= nLabels) {
        // to avoid infinite loops, don't move more times
        // than there are traces
        nummoves++;

        // assume nothing will move in this iteration,
        // reverse this if it does
        donepositioning = true;
        i = 0;
        while (i < pointgroups.length - 1) {
            // the higher (g0) and lower (g1) point group
            const g0 = pointgroups[i];
            const g1 = pointgroups[i + 1];

            // the lowest point in the higher group (p0)
            // the highest point in the lower group (p1)
            const p0 = g0[g0.length - 1];
            const p1 = g1[0];
            topOverlap = p0.pos + p0.dp + p0.size - p1.pos - p1.dp + p1.size;

            if (topOverlap > 0.01) {
                // push the new point(s) added to this group out of the way
                for (j = g1.length - 1; j >= 0; j--) g1[j].dp += topOverlap;

                // add them to the group
                g0.push.apply(g0, g1);
                pointgroups.splice(i + 1, 1);

                // adjust for minimum average movement
                sumdp = 0;
                for (j = g0.length - 1; j >= 0; j--) sumdp += g0[j].dp;
                bottomOverlap = sumdp / g0.length;
                for (j = g0.length - 1; j >= 0; j--) g0[j].dp -= bottomOverlap;
                donepositioning = false;
            } else i++;
        }

        // check if we're going off the plot on either side and fix
        pointgroups.forEach(constrainGroup);
    }

    // now put these offsets into hoverData
    for (i = pointgroups.length - 1; i >= 0; i--) {
        const grp = pointgroups[i];
        for (j = grp.length - 1; j >= 0; j--) {
            const pt = grp[j];
            const hoverPt = pt.datum;
            hoverPt.offset = pt.dp;
            hoverPt.del = pt.del;
        }
    }
}

function getHoverLabelOffsets(hoverLabel: any, rotateLabels: boolean): { x: number; y: number } {
    let offsetX = 0;
    let offsetY = hoverLabel.offset;

    if (rotateLabels) {
        offsetY *= -YSHIFTY;
        offsetX = hoverLabel.offset * YSHIFTX;
    }

    return {
        x: offsetX,
        y: offsetY
    };
}

/**
 * Calculate the shift in x for text and text2 elements
 */
function getTextShiftX(hoverLabel: any): { alignShift: number; textShiftX: number; text2ShiftX: number } {
    const alignShift = ({ start: 1, end: -1, middle: 0 } as any)[hoverLabel.anchor];
    let textShiftX = alignShift * (HOVERARROWSIZE + HOVERTEXTPAD);
    let text2ShiftX = textShiftX + alignShift * (hoverLabel.txwidth + HOVERTEXTPAD);

    const isMiddle = hoverLabel.anchor === 'middle';
    if (isMiddle) {
        textShiftX -= hoverLabel.tx2width / 2;
        text2ShiftX += hoverLabel.txwidth / 2 + HOVERTEXTPAD;
    }

    return {
        alignShift: alignShift,
        textShiftX: textShiftX,
        text2ShiftX: text2ShiftX
    };
}

function alignHoverText(hoverLabels: any, rotateLabels: boolean, scaleX: number, scaleY: number): void {
    const pX = function (x: any) {
        return x * scaleX;
    };
    const pY = function (y: any) {
        return y * scaleY;
    };

    // finally set the text positioning relative to the data and draw the
    // box around it
    hoverLabels.each(function (this: any, d: any) {
        const g = select(this);
        if (d.del) return g.remove();

        const tx = g.select('text.nums');
        const anchor = d.anchor;
        const horzSign = anchor === 'end' ? -1 : 1;
        const shiftX = getTextShiftX(d);
        const offsets = getHoverLabelOffsets(d, rotateLabels);
        const offsetX = offsets.x;
        const offsetY = offsets.y;

        const isMiddle = anchor === 'middle';
        // Get 'showarrow' attribute value from trace hoverlabel settings;
        // if trace has no hoverlabel settings, we should show the arrow by default
        const showArrow = 'hoverlabel' in d.trace ? d.trace.hoverlabel.showarrow : true;

        let pathStr;
        if (isMiddle) {
            // middle aligned: rect centered on data
            pathStr =
                'M-' +
                pX(d.bx / 2 + d.tx2width / 2) +
                ',' +
                pY(offsetY - d.by / 2) +
                'h' +
                pX(d.bx) +
                'v' +
                pY(d.by) +
                'h-' +
                pX(d.bx) +
                'Z';
        } else if (showArrow) {
            // left or right aligned: side rect with arrow to data
            pathStr =
                'M0,0L' +
                pX(horzSign * HOVERARROWSIZE + offsetX) +
                ',' +
                pY(HOVERARROWSIZE + offsetY) +
                'v' +
                pY(d.by / 2 - HOVERARROWSIZE) +
                'h' +
                pX(horzSign * d.bx) +
                'v-' +
                pY(d.by) +
                'H' +
                pX(horzSign * HOVERARROWSIZE + offsetX) +
                'V' +
                pY(offsetY - HOVERARROWSIZE) +
                'Z';
        } else {
            // left or right aligned: side rect without arrow
            pathStr =
                'M' +
                pX(horzSign * HOVERARROWSIZE + offsetX) +
                ',' +
                pY(offsetY - d.by / 2) +
                'h' +
                pX(horzSign * d.bx) +
                'v' +
                pY(d.by) +
                'h' +
                pX(-horzSign * d.bx) +
                'Z';
        }
        g.select('path').attr('d', pathStr);

        let posX = offsetX + shiftX.textShiftX;
        const posY = offsetY + d.ty0 - d.by / 2 + HOVERTEXTPAD;
        const textAlign = d.textAlign || 'auto';

        if (textAlign !== 'auto') {
            if (textAlign === 'left' && anchor !== 'start') {
                tx.attr('text-anchor', 'start');
                posX = isMiddle ? -d.bx / 2 - d.tx2width / 2 + HOVERTEXTPAD : -d.bx - HOVERTEXTPAD;
            } else if (textAlign === 'right' && anchor !== 'end') {
                tx.attr('text-anchor', 'end');
                posX = isMiddle ? d.bx / 2 - d.tx2width / 2 - HOVERTEXTPAD : d.bx + HOVERTEXTPAD;
            }
        }

        tx.call(svgTextUtils.positionText, pX(posX), pY(posY));

        if (d.tx2width) {
            g.select('text.name').call(
                svgTextUtils.positionText,
                pX(shiftX.text2ShiftX + shiftX.alignShift * HOVERTEXTPAD + offsetX),
                pY(offsetY + d.ty0 - d.by / 2 + HOVERTEXTPAD)
            );
            g.select('rect').call(
                setRect,
                pX(shiftX.text2ShiftX + ((shiftX.alignShift - 1) * d.tx2width) / 2 + offsetX),
                pY(offsetY - d.by / 2 - 1),
                pX(d.tx2width),
                pY(d.by + 2)
            );
        }
    });
}

function cleanPoint(d: any, hovermode: any): any {
    const index = d.index;
    const trace = d.trace || {};
    const cd0 = d.cd[0];
    const cd = d.cd[index] || {};

    function pass(v: any): boolean {
        return v || (isNumeric(v) && v === 0);
    }

    const getVal = Array.isArray(index)
        ? function (calcKey: any, traceKey: any) {
              const v = castOption(cd0, index, calcKey);
              return pass(v) ? v : extractOption({}, trace, '', traceKey);
          }
        : function (calcKey: any, traceKey: any) {
              return extractOption(cd, trace, calcKey, traceKey);
          };

    function fill(key: string, calcKey: string, traceKey: string): void {
        const val = getVal(calcKey, traceKey);
        if (pass(val)) d[key] = val;
    }

    fill('hoverinfo', 'hi', 'hoverinfo');
    fill('bgcolor', 'hbg', 'hoverlabel.bgcolor');
    fill('borderColor', 'hbc', 'hoverlabel.bordercolor');
    fill('fontFamily', 'htf', 'hoverlabel.font.family');
    fill('fontSize', 'hts', 'hoverlabel.font.size');
    fill('fontColor', 'htc', 'hoverlabel.font.color');
    fill('fontWeight', 'htw', 'hoverlabel.font.weight');
    fill('fontStyle', 'hty', 'hoverlabel.font.style');
    fill('fontVariant', 'htv', 'hoverlabel.font.variant');
    fill('nameLength', 'hnl', 'hoverlabel.namelength');
    fill('textAlign', 'hta', 'hoverlabel.align');

    d.posref =
        hovermode === 'y' || (hovermode === 'closest' && trace.orientation === 'h')
            ? d.xa._offset + (d.x0 + d.x1) / 2
            : d.ya._offset + (d.y0 + d.y1) / 2;

    // then constrain all the positions to be on the plot
    d.x0 = constrain(d.x0, 0, d.xa._length);
    d.x1 = constrain(d.x1, 0, d.xa._length);
    d.y0 = constrain(d.y0, 0, d.ya._length);
    d.y1 = constrain(d.y1, 0, d.ya._length);

    // and convert the x and y label values into formatted text
    if (d.xLabelVal !== undefined) {
        d.xLabel = 'xLabel' in d ? d.xLabel : Axes.hoverLabelText(d.xa, d.xLabelVal, trace.xhoverformat);
        d.xVal = d.xa.c2d(d.xLabelVal);
    }
    if (d.yLabelVal !== undefined) {
        d.yLabel = 'yLabel' in d ? d.yLabel : Axes.hoverLabelText(d.ya, d.yLabelVal, trace.yhoverformat);
        d.yVal = d.ya.c2d(d.yLabelVal);
    }

    // Traces like heatmaps generate the zLabel in their hoverPoints function
    if (d.zLabelVal !== undefined && d.zLabel === undefined) {
        d.zLabel = String(d.zLabelVal);
    }

    // for box means and error bars, add the range to the label
    if (!isNaN(d.xerr) && !(d.xa.type === 'log' && d.xerr <= 0)) {
        const xeText = Axes.tickText(d.xa, d.xa.c2l(d.xerr), 'hover').text;
        if (d.xerrneg !== undefined) {
            d.xLabel += ' +' + xeText + ' / -' + Axes.tickText(d.xa, d.xa.c2l(d.xerrneg), 'hover').text;
        } else d.xLabel += ' ± ' + xeText;

        // small distance penalty for error bars, so that if there are
        // traces with errors and some without, the error bar label will
        // hoist up to the point
        if (hovermode === 'x') d.distance += 1;
    }
    if (!isNaN(d.yerr) && !(d.ya.type === 'log' && d.yerr <= 0)) {
        const yeText = Axes.tickText(d.ya, d.ya.c2l(d.yerr), 'hover').text;
        if (d.yerrneg !== undefined) {
            d.yLabel += ' +' + yeText + ' / -' + Axes.tickText(d.ya, d.ya.c2l(d.yerrneg), 'hover').text;
        } else d.yLabel += ' ± ' + yeText;

        if (hovermode === 'y') d.distance += 1;
    }

    let infomode = d.hoverinfo || d.trace.hoverinfo;

    if (infomode && infomode !== 'all') {
        infomode = Array.isArray(infomode) ? infomode : infomode.split('+');
        if (infomode.indexOf('x') === -1) d.xLabel = undefined;
        if (infomode.indexOf('y') === -1) d.yLabel = undefined;
        if (infomode.indexOf('z') === -1) d.zLabel = undefined;
        if (infomode.indexOf('text') === -1) d.text = undefined;
        if (infomode.indexOf('name') === -1) d.name = undefined;
    }

    return d;
}

function createSpikelines(gd: GraphDiv, closestPoints: any, opts: any): void {
    const container = opts.container;
    const fullLayout = opts.fullLayout;
    const gs = fullLayout._size;
    const evt = opts.event;
    const showY = !!closestPoints.hLinePoint;
    const showX = !!closestPoints.vLinePoint;

    let xa, ya;

    // Remove old spikeline items
    container.selectAll('.spikeline').remove();

    if (!(showX || showY)) return;

    const contrastColor = Color.combine(fullLayout.plot_bgcolor, fullLayout.paper_bgcolor);

    // Horizontal line (to y-axis)
    if (showY) {
        const hLinePoint = closestPoints.hLinePoint;
        let hLinePointX, hLinePointY;

        xa = hLinePoint && hLinePoint.xa;
        ya = hLinePoint && hLinePoint.ya;
        const ySnap = ya.spikesnap;

        if (ySnap === 'cursor') {
            hLinePointX = evt.pointerX;
            hLinePointY = evt.pointerY;
        } else {
            hLinePointX = xa._offset + hLinePoint.x;
            hLinePointY = ya._offset + hLinePoint.y;
        }
        const dfltHLineColor =
            tinycolor.readability(hLinePoint.color, contrastColor) < 1.5
                ? Color.contrast(contrastColor)
                : hLinePoint.color;
        const yMode = ya.spikemode;
        const yThickness = ya.spikethickness;
        const yColor = ya.spikecolor || dfltHLineColor;
        const xEdge = Axes.getPxPosition(gd, ya);
        let xBase, xEndSpike;

        if (yMode.indexOf('toaxis') !== -1 || yMode.indexOf('across') !== -1) {
            if (yMode.indexOf('toaxis') !== -1) {
                xBase = xEdge;
                xEndSpike = hLinePointX;
            }
            if (yMode.indexOf('across') !== -1) {
                let xAcross0 = ya._counterDomainMin;
                let xAcross1 = ya._counterDomainMax;
                if (ya.anchor === 'free') {
                    xAcross0 = Math.min(xAcross0, ya.position);
                    xAcross1 = Math.max(xAcross1, ya.position);
                }
                xBase = gs.l + xAcross0 * gs.w;
                xEndSpike = gs.l + xAcross1 * gs.w;
            }

            // Foreground horizontal line (to y-axis)
            container
                .insert('line', ':first-child')
                .attr('x1', xBase)
                .attr('x2', xEndSpike)
                .attr('y1', hLinePointY)
                .attr('y2', hLinePointY)
                .attr('stroke-width', yThickness)
                .attr('stroke', yColor)
                .attr('stroke-dasharray', dashStyle(ya.spikedash, yThickness))
                .classed('spikeline', true)
                .classed('crisp', true);

            // Background horizontal Line (to y-axis)
            container
                .insert('line', ':first-child')
                .attr('x1', xBase)
                .attr('x2', xEndSpike)
                .attr('y1', hLinePointY)
                .attr('y2', hLinePointY)
                .attr('stroke-width', yThickness + 2)
                .attr('stroke', contrastColor)
                .classed('spikeline', true)
                .classed('crisp', true);
        }
        // Y axis marker
        if (yMode.indexOf('marker') !== -1) {
            container
                .insert('circle', ':first-child')
                .attr('cx', xEdge + (ya.side !== 'right' ? yThickness : -yThickness))
                .attr('cy', hLinePointY)
                .attr('r', yThickness)
                .attr('fill', yColor)
                .classed('spikeline', true);
        }
    }

    if (showX) {
        const vLinePoint = closestPoints.vLinePoint;
        let vLinePointX, vLinePointY;

        xa = vLinePoint && vLinePoint.xa;
        ya = vLinePoint && vLinePoint.ya;
        const xSnap = xa.spikesnap;

        if (xSnap === 'cursor') {
            vLinePointX = evt.pointerX;
            vLinePointY = evt.pointerY;
        } else {
            vLinePointX = xa._offset + vLinePoint.x;
            vLinePointY = ya._offset + vLinePoint.y;
        }
        const dfltVLineColor =
            tinycolor.readability(vLinePoint.color, contrastColor) < 1.5
                ? Color.contrast(contrastColor)
                : vLinePoint.color;
        const xMode = xa.spikemode;
        const xThickness = xa.spikethickness;
        const xColor = xa.spikecolor || dfltVLineColor;
        const yEdge = Axes.getPxPosition(gd, xa);
        let yBase, yEndSpike;

        if (xMode.indexOf('toaxis') !== -1 || xMode.indexOf('across') !== -1) {
            if (xMode.indexOf('toaxis') !== -1) {
                yBase = yEdge;
                yEndSpike = vLinePointY;
            }
            if (xMode.indexOf('across') !== -1) {
                let yAcross0 = xa._counterDomainMin;
                let yAcross1 = xa._counterDomainMax;
                if (xa.anchor === 'free') {
                    yAcross0 = Math.min(yAcross0, xa.position);
                    yAcross1 = Math.max(yAcross1, xa.position);
                }
                yBase = gs.t + (1 - yAcross1) * gs.h;
                yEndSpike = gs.t + (1 - yAcross0) * gs.h;
            }

            // Foreground vertical line (to x-axis)
            container
                .insert('line', ':first-child')
                .attr('x1', vLinePointX)
                .attr('x2', vLinePointX)
                .attr('y1', yBase)
                .attr('y2', yEndSpike)
                .attr('stroke-width', xThickness)
                .attr('stroke', xColor)
                .attr('stroke-dasharray', dashStyle(xa.spikedash, xThickness))
                .classed('spikeline', true)
                .classed('crisp', true);

            // Background vertical line (to x-axis)
            container
                .insert('line', ':first-child')
                .attr('x1', vLinePointX)
                .attr('x2', vLinePointX)
                .attr('y1', yBase)
                .attr('y2', yEndSpike)
                .attr('stroke-width', xThickness + 2)
                .attr('stroke', contrastColor)
                .classed('spikeline', true)
                .classed('crisp', true);
        }

        // X axis marker
        if (xMode.indexOf('marker') !== -1) {
            container
                .insert('circle', ':first-child')
                .attr('cx', vLinePointX)
                .attr('cy', yEdge - (xa.side !== 'top' ? xThickness : -xThickness))
                .attr('r', xThickness)
                .attr('fill', xColor)
                .classed('spikeline', true);
        }
    }
}

function hoverChanged(gd: GraphDiv, evt: any, oldhoverdata: any): boolean {
    // don't emit any events if nothing changed
    if (!oldhoverdata || oldhoverdata.length !== gd._hoverdata.length) return true;

    for (let i = oldhoverdata.length - 1; i >= 0; i--) {
        const oldPt = oldhoverdata[i];
        const newPt = gd._hoverdata[i];

        if (
            oldPt.curveNumber !== newPt.curveNumber ||
            String(oldPt.pointNumber) !== String(newPt.pointNumber) ||
            String(oldPt.pointNumbers) !== String(newPt.pointNumbers) ||
            oldPt.binNumber !== newPt.binNumber
        ) {
            return true;
        }
    }
    return false;
}

function spikesChanged(gd: GraphDiv, oldspikepoints?: any): boolean {
    // don't relayout the plot because of new spikelines if spikelines points didn't change
    if (!oldspikepoints) return true;
    if (
        oldspikepoints.vLinePoint !== gd._spikepoints.vLinePoint ||
        oldspikepoints.hLinePoint !== gd._spikepoints.hLinePoint
    )
        return true;
    return false;
}

function plainText(s: any, len: any): string {
    return svgTextUtils.plainText(s || '', {
        len: len,
        allowedTags: ['br', 'sub', 'sup', 'b', 'i', 'em', 's', 'u']
    });
}

function orderRangePoints(hoverData: any[], hovermode: any): any[] {
    const axLetter = hovermode.charAt(0);

    const first: any[] = [];
    const second: any[] = [];
    const last: any[] = [];

    for (let i = 0; i < hoverData.length; i++) {
        const d = hoverData[i];

        if (traceIs(d.trace, 'bar-like') || traceIs(d.trace, 'box-violin')) {
            last.push(d);
        } else if (d.trace[axLetter + 'period']) {
            second.push(d);
        } else {
            first.push(d);
        }
    }

    return first.concat(second).concat(last);
}

function getCoord(axLetter: string, winningPoint: any, fullLayout: FullLayout): any {
    const ax = winningPoint[axLetter + 'a'];
    let val = winningPoint[axLetter + 'Val'];

    const cd0 = winningPoint.cd[0];

    if (ax.type === 'category' || ax.type === 'multicategory') val = ax._categoriesMap[val];
    else if (ax.type === 'date') {
        const periodalignment = winningPoint.trace[axLetter + 'periodalignment'];
        if (periodalignment) {
            const d = winningPoint.cd[winningPoint.index];

            let start = d[axLetter + 'Start'];
            if (start === undefined) start = d[axLetter];

            let end = d[axLetter + 'End'];
            if (end === undefined) end = d[axLetter];

            const diff = end - start;

            if (periodalignment === 'end') {
                val += diff;
            } else if (periodalignment === 'middle') {
                val += diff / 2;
            }
        }

        val = ax.d2c(val);
    }

    if (cd0 && cd0.t && cd0.t.posLetter === ax._id) {
        if (fullLayout.boxmode === 'group' || fullLayout.violinmode === 'group') {
            val += cd0.t.dPos;
        }
    }

    return val;
}

// Top/left hover offsets relative to graph div. As long as hover content is
// a sibling of the graph div, it will be positioned correctly relative to
// the offset parent, whatever that may be.
const getTopOffset = (gd: GraphDiv): number => gd.offsetTop + gd.clientTop;
const getLeftOffset = (gd: GraphDiv): number => gd.offsetLeft + gd.clientLeft;

function getBoundingClientRect(gd: GraphDiv, node: any): any {
    const fullLayout = gd._fullLayout;

    const rect = node.getBoundingClientRect();

    const x0 = rect.left;
    const y0 = rect.top;
    const x1 = x0 + rect.width;
    const y1 = y0 + rect.height;

    const A = apply3DTransform(fullLayout._invTransform)(x0, y0);
    const B = apply3DTransform(fullLayout._invTransform)(x1, y1);

    const Ax = A[0];
    const Ay = A[1];
    const Bx = B[0];
    const By = B[1];

    return {
        x: Ax,
        y: Ay,
        width: Bx - Ax,
        height: By - Ay,
        top: Math.min(Ay, By),
        left: Math.min(Ax, Bx),
        right: Math.max(Ax, Bx),
        bottom: Math.max(Ay, By)
    };
}

export default { hover, loneHover };
