import type { FullAxis, GraphDiv } from '../../../types/core';
import polybool from 'polybooljs';
import pointInPolygon from 'point-in-polygon/nested';
import Registry from '../../registry.js';
import { dashStyle } from '../drawing/index.js';
import Color from '../color/index.js';
import Fx from '../fx/index.js';
import { makeEventData } from '../fx/helpers.js';
import dragHelpers from '../dragelement/helpers.js';
import shapeHelpers from '../shapes/helpers.js';
import shapeConstants from '../shapes/constants.js';
import displayOutlines from '../shapes/display_outlines.js';
import _handle_outline from '../shapes/handle_outline.js';
const { clearOutline } = _handle_outline;
import newShapeHelpers from '../shapes/draw_newshape/helpers.js';
import _newshapes from '../shapes/draw_newshape/newshapes.js';
const { newShapes } = _newshapes;
import newSelections from './draw_newselection/newselections.js';
import _draw from './draw.js';
const { activateLastSelection } = _draw;
import Lib from '../../lib/index.js';
import libPolygon from '../../lib/polygon.js';
import throttle from '../../lib/throttle.js';
import { getFromId } from '../../plots/cartesian/axis_ids.js';
import clearGlCanvases from '../../lib/clear_gl_canvases.js';
import { redrawReglTraces } from '../../plot_api/subroutines.js';
import constants from './constants.js';
import helpers from './helpers.js';
const freeMode = dragHelpers.freeMode;
const rectMode = dragHelpers.rectMode;
const drawMode = dragHelpers.drawMode;
const openMode = dragHelpers.openMode;
const selectMode = dragHelpers.selectMode;

const handleEllipse = newShapeHelpers.handleEllipse;
const readPaths = newShapeHelpers.readPaths;

const ascending = Lib.sorterAsc;
const MINSELECT = constants.MINSELECT;

const filteredPolygon = libPolygon.filter;
const polygonTester = libPolygon.tester;

const p2r = helpers.p2r;
const axValue = helpers.axValue;
const getTransform = helpers.getTransform;

function hasSubplot(dragOptions: any) {
    // N.B. subplot may be falsy e.g zero sankey index!
    return dragOptions.subplot !== undefined;
}

function prepSelect(evt: any, startX: any, startY: any, dragOptions: any, mode: any) {
    const isCartesian = !hasSubplot(dragOptions);

    const isFreeMode = freeMode(mode);
    const isRectMode = rectMode(mode);
    const isOpenMode = openMode(mode);
    const isDrawMode = drawMode(mode);
    const isSelectMode = selectMode(mode);

    const isLine = mode === 'drawline';
    const isEllipse = mode === 'drawcircle';
    const isLineOrEllipse = isLine || isEllipse; // cases with two start & end positions

    const gd = dragOptions.gd;
    const fullLayout = gd._fullLayout;
    const immediateSelect = isSelectMode && fullLayout.newselection.mode === 'immediate' &&
        isCartesian; // N.B. only cartesian subplots have persistent selection

    const zoomLayer = fullLayout._zoomlayer;
    const dragBBox = dragOptions.element.getBoundingClientRect();
    const plotinfo = dragOptions.plotinfo;
    const transform = getTransform(plotinfo);
    let x0 = startX - dragBBox.left;
    let y0 = startY - dragBBox.top;

    fullLayout._calcInverseTransform(gd);
    const transformedCoords = Lib.apply3DTransform(fullLayout._invTransform)(x0, y0);
    x0 = transformedCoords[0];
    y0 = transformedCoords[1];
    const scaleX = fullLayout._invScaleX;
    const scaleY = fullLayout._invScaleY;

    let x1 = x0;
    let y1 = y0;
    const path0 = 'M' + x0 + ',' + y0;
    const xAxis = dragOptions.xaxes[0];
    const yAxis = dragOptions.yaxes[0];
    const pw = xAxis._length;
    const ph = yAxis._length;

    const subtract = evt.altKey &&
        !(drawMode(mode) && isOpenMode);

    let filterPoly: any, selectionTesters: any, mergedPolygons: any, currentPolygon: any;
    let i, searchInfo, eventData: any;

    coerceSelectionsCache(evt, gd, dragOptions);

    if(isFreeMode) {
        filterPoly = filteredPolygon([[x0, y0]], constants.BENDPX);
    }

    const outlines = zoomLayer.selectAll('path.select-outline-' + plotinfo.id).data([1]);
    const newStyle = isDrawMode ?
        fullLayout.newshape :
        fullLayout.newselection;

    if(isDrawMode) {
        dragOptions.hasText = newStyle.label.text || newStyle.label.texttemplate;
    }

    const fillC = (isDrawMode && !isOpenMode) ? newStyle.fillcolor : 'rgba(0,0,0,0)';

    const strokeC = newStyle.line.color || (
        (isCartesian ? Color.contrast(gd._fullLayout.plot_bgcolor) : '#7f7f7f') // non-cartesian subplot
    );

    outlines.enter()
        .append('path')
        .attr('class', 'select-outline select-outline-' + plotinfo.id)
        .style('opacity', isDrawMode ? newStyle.opacity / 2 : 1)
        .style('stroke-dasharray', dashStyle(newStyle.line.dash, newStyle.line.width))
        .style('stroke-width', newStyle.line.width + 'px')
        .style('shape-rendering', 'crispEdges')
        .call(Color.stroke, strokeC)
        .call(Color.fill, fillC)
        .attr('fill-rule', 'evenodd')
        .classed('cursor-move', isDrawMode ? true : false)
        .attr('transform', transform)
        .attr('d', path0 + 'Z');

    const corners = zoomLayer.append('path')
        .attr('class', 'zoombox-corners')
        .style('fill', Color.background)
        .style('stroke', Color.defaultLine)
        .style('stroke-width', 1)
        .attr('transform', transform)
        .attr('d', 'M0,0Z');

    // create & style group for text label
    if(isDrawMode && dragOptions.hasText) {
        let shapeGroup = zoomLayer.select('.label-temp');
        if(shapeGroup.empty()) {
            shapeGroup = zoomLayer.append('g')
                .classed('label-temp', true)
                .classed('select-outline', true)
                .style('opacity', 0.8);
        }
    }

    const throttleID = fullLayout._uid + constants.SELECTID;
    let selection: any[] = [];

    // find the traces to search for selection points
    const searchTraces = determineSearchTraces(gd, dragOptions.xaxes,
      dragOptions.yaxes, dragOptions.subplot);

    if(immediateSelect && !evt.shiftKey) {
        dragOptions._clearSubplotSelections = function() {
            if(!isCartesian) return;

            const xRef = xAxis._id;
            const yRef = yAxis._id;
            deselectSubplot(gd, xRef, yRef, searchTraces);

            const selections = (gd.layout || {}).selections || [];
            const list: any[] = [];
            let selectionErased = false;
            for(let q = 0; q < selections.length; q++) {
                const s = fullLayout.selections[q];
                if(
                    !s ||
                    s.xref !== xRef ||
                    s.yref !== yRef
                ) {
                    list.push(selections[q]);
                } else {
                    selectionErased = true;
                }
            }

            if(selectionErased) {
                gd._fullLayout._noEmitSelectedAtStart = true;

                Registry.call('_guiRelayout', gd, {
                    selections: list
                });
            }
        };
    }

    const fillRangeItems = getFillRangeItems(dragOptions);

    dragOptions.moveFn = function(dx0: any, dy0: any) {
        if(dragOptions._clearSubplotSelections) {
            dragOptions._clearSubplotSelections();
            dragOptions._clearSubplotSelections = undefined;
        }

        x1 = Math.max(0, Math.min(pw, scaleX * dx0 + x0));
        y1 = Math.max(0, Math.min(ph, scaleY * dy0 + y0));

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);

        if(isRectMode) {
            let direction;
            let start, end;

            if(isSelectMode) {
                const q = fullLayout.selectdirection;

                if(q === 'any') {
                    if(dy < Math.min(dx * 0.6, MINSELECT)) {
                        direction = 'h';
                    } else if(dx < Math.min(dy * 0.6, MINSELECT)) {
                        direction = 'v';
                    } else {
                        direction = 'd';
                    }
                } else {
                    direction = q;
                }

                switch(direction) {
                    case 'h':
                        start = isEllipse ? ph / 2 : 0;
                        end = ph;
                        break;
                    case 'v':
                        start = isEllipse ? pw / 2 : 0;
                        end = pw;
                        break;
                }
            }

            if(isDrawMode) {
                switch(fullLayout.newshape.drawdirection) {
                    case 'vertical':
                        direction = 'h';
                        start = isEllipse ? ph / 2 : 0;
                        end = ph;
                        break;
                    case 'horizontal':
                        direction = 'v';
                        start = isEllipse ? pw / 2 : 0;
                        end = pw;
                        break;
                    case 'ortho':
                        if(dx < dy) {
                            direction = 'h';
                            start = y0;
                            end = y1;
                        } else {
                            direction = 'v';
                            start = x0;
                            end = x1;
                        }
                        break;
                    default: // i.e. case of 'diagonal'
                        direction = 'd';
                }
            }

            if(direction === 'h') {
                // horizontal motion
                currentPolygon = isLineOrEllipse ?
                    handleEllipse(isEllipse, [x1, start], [x1, end]) : // using x1 instead of x0 allows adjusting the line while drawing
                    [[x0, start], [x0, end], [x1, end], [x1, start]]; // make a vertical box

                currentPolygon.xmin = isLineOrEllipse ? x1 : Math.min(x0, x1);
                currentPolygon.xmax = isLineOrEllipse ? x1 : Math.max(x0, x1);
                currentPolygon.ymin = Math.min(start as any, end);
                currentPolygon.ymax = Math.max(start as any, end);
                // extras to guide users in keeping a straight selection
                corners.attr('d', 'M' + currentPolygon.xmin + ',' + (y0 - MINSELECT) +
                    'h-4v' + (2 * MINSELECT) + 'h4Z' +
                    'M' + (currentPolygon.xmax - 1) + ',' + (y0 - MINSELECT) +
                    'h4v' + (2 * MINSELECT) + 'h-4Z');
            } else if(direction === 'v') {
                // vertical motion
                currentPolygon = isLineOrEllipse ?
                    handleEllipse(isEllipse, [start, y1], [end, y1]) : // using y1 instead of y0 allows adjusting the line while drawing
                    [[start, y0], [start, y1], [end, y1], [end, y0]]; // make a horizontal box

                currentPolygon.xmin = Math.min(start as any, end);
                currentPolygon.xmax = Math.max(start as any, end);
                currentPolygon.ymin = isLineOrEllipse ? y1 : Math.min(y0, y1);
                currentPolygon.ymax = isLineOrEllipse ? y1 : Math.max(y0, y1);
                corners.attr('d', 'M' + (x0 - MINSELECT) + ',' + currentPolygon.ymin +
                    'v-4h' + (2 * MINSELECT) + 'v4Z' +
                    'M' + (x0 - MINSELECT) + ',' + (currentPolygon.ymax - 1) +
                    'v4h' + (2 * MINSELECT) + 'v-4Z');
            } else if(direction === 'd') {
                // diagonal motion
                currentPolygon = isLineOrEllipse ?
                    handleEllipse(isEllipse, [x0, y0], [x1, y1]) :
                    [[x0, y0], [x0, y1], [x1, y1], [x1, y0]];

                currentPolygon.xmin = Math.min(x0, x1);
                currentPolygon.xmax = Math.max(x0, x1);
                currentPolygon.ymin = Math.min(y0, y1);
                currentPolygon.ymax = Math.max(y0, y1);
                corners.attr('d', 'M0,0Z');
            }
        } else if(isFreeMode) {
            filterPoly.addPt([x1, y1]);
            currentPolygon = filterPoly.filtered;
        }

        // create outline & tester
        if(dragOptions.selectionDefs && dragOptions.selectionDefs.length) {
            mergedPolygons = mergePolygons(dragOptions.mergedPolygons, currentPolygon, subtract);

            currentPolygon.subtract = subtract;
            selectionTesters = multiTester(dragOptions.selectionDefs.concat([currentPolygon]));
        } else {
            mergedPolygons = [currentPolygon];
            selectionTesters = polygonTester(currentPolygon);
        }

        // display polygons on the screen
        displayOutlines(convertPoly(mergedPolygons, isOpenMode), outlines, dragOptions);

        if(isSelectMode) {
            let _res = reselect(gd, false);
            const extraPoints = _res.eventData ? _res.eventData.points.slice() : [];

            _res = reselect(gd, false, selectionTesters, searchTraces, dragOptions);
            selectionTesters = _res.selectionTesters;
            eventData = _res.eventData;

            let poly;
            if(filterPoly) {
                poly = filterPoly.filtered;
            } else {
                poly = castMultiPolygon(mergedPolygons);
            }

            throttle.throttle(
                throttleID,
                constants.SELECTDELAY,
                function() {
                    selection = _doSelect(selectionTesters, searchTraces);

                    const newPoints = selection.slice();

                    for(let w = 0; w < extraPoints.length; w++) {
                        const p = extraPoints[w];
                        let found = false;
                        for(let u = 0; u < newPoints.length; u++) {
                            if(
                                (newPoints[u] as any).curveNumber === p.curveNumber &&
                                (newPoints[u] as any).pointNumber === p.pointNumber
                            ) {
                                found = true;
                                break;
                            }
                        }
                        if(!found) newPoints.push((p as any));
                    }

                    if(newPoints.length) {
                        if(!eventData) eventData = {};
                        eventData.points = newPoints;
                    }

                    fillRangeItems(eventData, poly);

                    emitSelecting(gd, eventData);
                }
            );
        }
    };

    dragOptions.clickFn = function(numClicks: any, evt: any) {
        corners.remove();

        if(gd._fullLayout._activeShapeIndex >= 0) {
            gd._fullLayout._deactivateShape(gd);
            return;
        }
        if(isDrawMode) return;

        const clickmode = fullLayout.clickmode;

        throttle.done(throttleID).then(() => {
            throttle.clear(throttleID);
            if(numClicks === 2) {
                // clear selection on doubleclick
                outlines.remove();
                for(i = 0; i < searchTraces.length; i++) {
                    searchInfo = searchTraces[i];
                    searchInfo._module.selectPoints(searchInfo, false);
                }

                updateSelectedState(gd, searchTraces);

                clearSelectionsCache(dragOptions);

                emitDeselect(gd);

                if(searchTraces.length) {
                    const clickedXaxis = (searchTraces[0] as any).xaxis;
                    const clickedYaxis = (searchTraces[0] as any).yaxis;

                    if(clickedXaxis && clickedYaxis) {
                        // drop selections in the clicked subplot
                        const subSelections: any[] = [];
                        const allSelections = gd._fullLayout.selections;
                        for(let k = 0; k < allSelections.length; k++) {
                            const s = allSelections[k];
                            if(!s) continue; // also drop null selections if any

                            if(
                                s.xref !== clickedXaxis._id ||
                                s.yref !== clickedYaxis._id
                            ) {
                                subSelections.push(s);
                            }
                        }

                        if(subSelections.length < allSelections.length) {
                            gd._fullLayout._noEmitSelectedAtStart = true;

                            Registry.call('_guiRelayout', gd, {
                                selections: subSelections
                            });
                        }
                    }
                }
            } else {
                if(clickmode.indexOf('select') > -1) {
                    selectOnClick(evt, gd, dragOptions.xaxes, dragOptions.yaxes,
                      dragOptions.subplot, dragOptions, outlines);
                }

                if(clickmode === 'event') {
                    // TODO: remove in v3 - this was probably never intended to work as it does,
                    // but in case anyone depends on it we don't want to break it now.
                    // Note that click-to-select introduced pre v3 also emitts proper
                    // event data when clickmode is having 'select' in its flag list.
                    emitSelected(gd, undefined);
                }
            }

            Fx.click(gd, evt, plotinfo.id);
        }).catch(Lib.error);
    };

    dragOptions.doneFn = function() {
        corners.remove();

        throttle.done(throttleID).then(() => {
            throttle.clear(throttleID);

            if(!immediateSelect && currentPolygon && dragOptions.selectionDefs) {
                // save last polygons
                currentPolygon.subtract = subtract;
                dragOptions.selectionDefs.push(currentPolygon);

                // we have to keep reference to arrays container
                dragOptions.mergedPolygons.length = 0;
                [].push.apply(dragOptions.mergedPolygons, mergedPolygons);
            }

            if(immediateSelect || isDrawMode) {
                clearSelectionsCache(dragOptions, immediateSelect);
            }

            if(dragOptions.doneFnCompleted) {
                dragOptions.doneFnCompleted(selection);
            }

            if(isSelectMode) {
                emitSelected(gd, eventData);
            }
        }).catch(Lib.error);
    };
}

function selectOnClick(evt: any, gd: GraphDiv, xAxes: any, yAxes: any, subplot: any, dragOptions: any, polygonOutlines?: any) {
    const hoverData = gd._hoverdata;
    const fullLayout = gd._fullLayout;
    const clickmode = fullLayout.clickmode;
    const sendEvents = clickmode.indexOf('event') > -1;
    let selection: any[] = [];
    let searchTraces, searchInfo, currentSelectionDef, selectionTesters, traceSelection;
    let thisTracesSelection, pointOrBinSelected, subtract, eventData, i;

    if(isHoverDataSet(hoverData)) {
        coerceSelectionsCache(evt, gd, dragOptions);
        searchTraces = determineSearchTraces(gd, xAxes, yAxes, subplot);
        const clickedPtInfo = extractClickedPtInfo(hoverData, searchTraces);
        const isBinnedTrace = clickedPtInfo.pointNumbers.length > 0;

        // Note: potentially costly operation isPointOrBinSelected is
        // called as late as possible through the use of an assignment
        // in an if condition.
        if(isBinnedTrace ?
            isOnlyThisBinSelected(searchTraces, clickedPtInfo) :
            isOnlyOnePointSelected(searchTraces) &&
                (pointOrBinSelected = isPointOrBinSelected(clickedPtInfo))) {
            if(polygonOutlines) polygonOutlines.remove();
            for(i = 0; i < searchTraces.length; i++) {
                searchInfo = searchTraces[i];
                searchInfo._module.selectPoints(searchInfo, false);
            }

            updateSelectedState(gd, searchTraces);

            clearSelectionsCache(dragOptions);

            if(sendEvents) {
                emitDeselect(gd);
            }
        } else {
            subtract = evt.shiftKey &&
              (pointOrBinSelected !== undefined ?
                pointOrBinSelected :
                isPointOrBinSelected(clickedPtInfo));
            currentSelectionDef = newPointSelectionDef(clickedPtInfo.pointNumber, clickedPtInfo.searchInfo, subtract);

            const allSelectionDefs = dragOptions.selectionDefs.concat([currentSelectionDef]);
            selectionTesters = multiTester(allSelectionDefs, selectionTesters);

            for(i = 0; i < searchTraces.length; i++) {
                traceSelection = searchTraces[i]._module.selectPoints(searchTraces[i], selectionTesters);
                thisTracesSelection = fillSelectionItem(traceSelection, searchTraces[i]);

                if(selection.length) {
                    for(let j = 0; j < thisTracesSelection.length; j++) {
                        selection.push(thisTracesSelection[j]);
                    }
                } else selection = thisTracesSelection;
            }

            eventData = {points: selection};
            updateSelectedState(gd, searchTraces, eventData);

            if(currentSelectionDef && dragOptions) {
                dragOptions.selectionDefs.push(currentSelectionDef);
            }

            if(polygonOutlines) {
                const polygons = dragOptions.mergedPolygons;
                const isOpenMode = openMode(dragOptions.dragmode);

                // display polygons on the screen
                displayOutlines(convertPoly(polygons, isOpenMode), polygonOutlines, dragOptions);
            }

            if(sendEvents) {
                emitSelected(gd, eventData);
            }
        }
    }
}

/**
 * Constructs a new point selection definition object.
 */
function newPointSelectionDef(pointNumber: any, searchInfo: any, subtract: any) {
    return {
        pointNumber: pointNumber,
        searchInfo: searchInfo,
        subtract: !!subtract
    };
}

function isPointSelectionDef(o: any) {
    return 'pointNumber' in o && 'searchInfo' in o;
}

/*
 * Constructs a new point number tester.
 */
function newPointNumTester(pointSelectionDef: any) {
    return {
        xmin: 0,
        xmax: 0,
        ymin: 0,
        ymax: 0,
        pts: [],
        contains: function(pt: any, omitFirstEdge: any, pointNumber: any, searchInfo: any) {
            const idxWantedTrace = pointSelectionDef.searchInfo.cd[0].trace.index;
            const idxActualTrace = searchInfo.cd[0].trace.index;
            return idxActualTrace === idxWantedTrace &&
              pointNumber === pointSelectionDef.pointNumber;
        },
        isRect: false,
        degenerate: false,
        subtract: !!pointSelectionDef.subtract
    };
}

/**
 * Wraps multiple selection testers.
 *
 * @param {Array} list - An array of selection testers.
 *
 * @return a selection tester object with a contains function
 * that can be called to evaluate a point against all wrapped
 * selection testers that were passed in list.
 */
function multiTester(list: any, _selectionTesters?: any) {
    if(!list.length) return;

    const testers: any[] = [];
    let xmin = isPointSelectionDef(list[0]) ? 0 : list[0][0][0];
    let xmax = xmin;
    let ymin = isPointSelectionDef(list[0]) ? 0 : list[0][0][1];
    let ymax = ymin;

    for(let i = 0; i < list.length; i++) {
        if(isPointSelectionDef(list[i])) {
            testers.push(newPointNumTester(list[i]));
        } else {
            const tester = polygonTester(list[i]);
            tester.subtract = !!list[i].subtract;
            testers.push(tester);

            xmin = Math.min(xmin, tester.xmin);
            xmax = Math.max(xmax, tester.xmax);
            ymin = Math.min(ymin, tester.ymin);
            ymax = Math.max(ymax, tester.ymax);
        }
    }

    /**
     * Tests if the given point is within this tester.
     *
     * @param {Array} pt - [0] is the x coordinate, [1] is the y coordinate of the point.
     * @param {*} arg - An optional parameter to pass down to wrapped testers.
     * @param {number} pointNumber - The point number of the point within the underlying data array.
     * @param {number} searchInfo - An object identifying the trace the point is contained in.
     *
     * @return {boolean} true if point is considered to be selected, false otherwise.
     */
    function contains(pt: any, arg: any, pointNumber: any, searchInfo: any) {
        let contained = false;
        for(let i = 0; i < testers.length; i++) {
            if((testers[i] as any).contains(pt, arg, pointNumber, searchInfo)) {
                // if contained by subtract tester - exclude the point
                contained = !(testers[i] as any).subtract;
            }
        }

        return contained;
    }

    return {
        xmin: xmin,
        xmax: xmax,
        ymin: ymin,
        ymax: ymax,
        pts: [],
        contains: contains,
        isRect: false,
        degenerate: false
    };
}

function coerceSelectionsCache(evt: any, gd: GraphDiv, dragOptions: any) {
    const fullLayout = gd._fullLayout;
    const plotinfo = dragOptions.plotinfo;
    const dragmode = dragOptions.dragmode;

    const selectingOnSameSubplot = (
        fullLayout._lastSelectedSubplot &&
        fullLayout._lastSelectedSubplot === plotinfo.id
    );

    const hasModifierKey = (evt.shiftKey || evt.altKey) &&
        !(drawMode(dragmode) && openMode(dragmode));

    if(
        selectingOnSameSubplot &&
        hasModifierKey &&
        plotinfo.selection &&
        plotinfo.selection.selectionDefs &&
        !dragOptions.selectionDefs
    ) {
        // take over selection definitions from prev mode, if any
        dragOptions.selectionDefs = plotinfo.selection.selectionDefs;
        dragOptions.mergedPolygons = plotinfo.selection.mergedPolygons;
    } else if(!hasModifierKey || !plotinfo.selection) {
        clearSelectionsCache(dragOptions);
    }

    // clear selection outline when selecting a different subplot
    if(!selectingOnSameSubplot) {
        clearOutline(gd);
        fullLayout._lastSelectedSubplot = plotinfo.id;
    }
}

function hasActiveShape(gd: GraphDiv) {
    return gd._fullLayout._activeShapeIndex >= 0;
}

function hasActiveSelection(gd: GraphDiv) {
    return gd._fullLayout._activeSelectionIndex >= 0;
}

function clearSelectionsCache(dragOptions: any, immediateSelect?: any) {
    const dragmode = dragOptions.dragmode;
    const plotinfo = dragOptions.plotinfo;

    const gd = dragOptions.gd;
    if(hasActiveShape(gd)) {
        gd._fullLayout._deactivateShape(gd);
    }
    if(hasActiveSelection(gd)) {
        gd._fullLayout._deactivateSelection(gd);
    }

    const fullLayout = gd._fullLayout;
    const zoomLayer = fullLayout._zoomlayer;

    const isDrawMode = drawMode(dragmode);
    const isSelectMode = selectMode(dragmode);

    if(isDrawMode || isSelectMode) {
        const outlines = zoomLayer.selectAll('.select-outline-' + plotinfo.id);
        if(outlines && gd._fullLayout._outlining) {
            // add shape
            let shapes;
            if(isDrawMode) {
                shapes = newShapes(outlines, dragOptions);
            }
            if(shapes) {
                Registry.call('_guiRelayout', gd, {
                    shapes: shapes
                });
            }

            // add selection
            let selections;
            if(
                isSelectMode &&
                !hasSubplot(dragOptions) // only allow cartesian - no maps for now
            ) {
                selections = newSelections(outlines, dragOptions);
            }
            if(selections) {
                gd._fullLayout._noEmitSelectedAtStart = true;

                Registry.call('_guiRelayout', gd, {
                    selections: selections
                }).then(() => {
                    if(immediateSelect) { activateLastSelection(gd); }
                });
            }

            gd._fullLayout._outlining = false;
        }
    }

    plotinfo.selection = {};
    plotinfo.selection.selectionDefs = dragOptions.selectionDefs = [];
    plotinfo.selection.mergedPolygons = dragOptions.mergedPolygons = [];
}

function getAxId(ax: FullAxis) {
    return ax._id;
}

function determineSearchTraces(gd: GraphDiv, xAxes: any, yAxes: any, subplot: any) {
    if(!gd.calcdata) return [];

    const searchTraces: any[] = [];
    const xAxisIds = xAxes.map(getAxId);
    const yAxisIds = yAxes.map(getAxId);
    let cd, trace, i;

    for(i = 0; i < gd.calcdata.length; i++) {
        cd = gd.calcdata[i];
        trace = cd[0].trace;

        if(trace.visible !== true || !trace._module || !trace._module.selectPoints) continue;

        if(
            hasSubplot({subplot: subplot}) &&
            (trace.subplot === subplot || trace.geo === subplot)
        ) {
            searchTraces.push(createSearchInfo(trace._module, cd, xAxes[0], yAxes[0]));
        } else if(trace.type === 'splom') {
            // FIXME: make sure we don't have more than single axis for splom
            if(trace._xaxes[xAxisIds[0]] && trace._yaxes[yAxisIds[0]]) {
                const info = createSearchInfo(trace._module, cd, xAxes[0], yAxes[0]);
                info.scene = gd._fullLayout._splomScenes[trace.uid];
                searchTraces.push(info);
            }
        } else if(trace.type === 'sankey') {
            const sankeyInfo = createSearchInfo(trace._module, cd, xAxes[0], yAxes[0]);
            searchTraces.push(sankeyInfo);
        } else {
            if(xAxisIds.indexOf(trace.xaxis) === -1 && (!trace._xA || !trace._xA.overlaying)) continue;
            if(yAxisIds.indexOf(trace.yaxis) === -1 && (!trace._yA || !trace._yA.overlaying)) continue;

            searchTraces.push(createSearchInfo(trace._module, cd,
              getFromId(gd, trace.xaxis), getFromId(gd, trace.yaxis)));
        }
    }

    return searchTraces;
}

function createSearchInfo(module: any, calcData: any, xaxis: any, yaxis: any): any {
    return {
        _module: module,
        cd: calcData,
        xaxis: xaxis,
        yaxis: yaxis
    };
}

function isHoverDataSet(hoverData: any) {
    return hoverData &&
      Array.isArray(hoverData) &&
      hoverData[0].hoverOnBox !== true;
}

function extractClickedPtInfo(hoverData: any, searchTraces: any) {
    const hoverDatum = hoverData[0];
    let pointNumber = -1;
    let pointNumbers = [];
    let searchInfo, i;

    for(i = 0; i < searchTraces.length; i++) {
        searchInfo = searchTraces[i];
        if(hoverDatum.fullData.index === searchInfo.cd[0].trace.index) {
            // Special case for box (and violin)
            if(hoverDatum.hoverOnBox === true) {
                break;
            }

            // Hint: in some traces like histogram, one graphical element
            // doesn't correspond to one particular data point, but to
            // bins of data points. Thus, hoverDatum can have a binNumber
            // property instead of pointNumber.
            if(hoverDatum.pointNumber !== undefined) {
                pointNumber = hoverDatum.pointNumber;
            } else if(hoverDatum.binNumber !== undefined) {
                pointNumber = hoverDatum.binNumber;
                pointNumbers = hoverDatum.pointNumbers;
            }

            break;
        }
    }

    return {
        pointNumber: pointNumber,
        pointNumbers: pointNumbers,
        searchInfo: searchInfo
    };
}

function isPointOrBinSelected(clickedPtInfo: any) {
    const trace = clickedPtInfo.searchInfo.cd[0].trace;
    const ptNum = clickedPtInfo.pointNumber;
    const ptNums = clickedPtInfo.pointNumbers;
    const ptNumsSet = ptNums.length > 0;

    // When pointsNumbers is set (e.g. histogram's binning),
    // it is assumed that when the first point of
    // a bin is selected, all others are as well
    const ptNumToTest = ptNumsSet ? ptNums[0] : ptNum;

    // TODO potential performance improvement
    // Primarily we need this function to determine if a click adds
    // or subtracts from a selection.
    // In cases `trace.selectedpoints` is a huge array, indexOf
    // might be slow. One remedy would be to introduce a hash somewhere.
    return trace.selectedpoints ? trace.selectedpoints.indexOf(ptNumToTest) > -1 : false;
}

function isOnlyThisBinSelected(searchTraces: any, clickedPtInfo: any) {
    const tracesWithSelectedPts: any[] = [];
    let searchInfo, trace, isSameTrace, i;

    for(i = 0; i < searchTraces.length; i++) {
        searchInfo = searchTraces[i];
        if(searchInfo.cd[0].trace.selectedpoints && searchInfo.cd[0].trace.selectedpoints.length > 0) {
            tracesWithSelectedPts.push(searchInfo);
        }
    }

    if(tracesWithSelectedPts.length === 1) {
        isSameTrace = tracesWithSelectedPts[0] === clickedPtInfo.searchInfo;
        if(isSameTrace) {
            trace = clickedPtInfo.searchInfo.cd[0].trace;
            if(trace.selectedpoints.length === clickedPtInfo.pointNumbers.length) {
                for(i = 0; i < clickedPtInfo.pointNumbers.length; i++) {
                    if(trace.selectedpoints.indexOf(clickedPtInfo.pointNumbers[i]) < 0) {
                        return false;
                    }
                }
                return true;
            }
        }
    }

    return false;
}

function isOnlyOnePointSelected(searchTraces: any) {
    let len = 0;
    let searchInfo, trace, i;

    for(i = 0; i < searchTraces.length; i++) {
        searchInfo = searchTraces[i];
        trace = searchInfo.cd[0].trace;
        if(trace.selectedpoints) {
            if(trace.selectedpoints.length > 1) return false;

            len += trace.selectedpoints.length;
            if(len > 1) return false;
        }
    }

    return len === 1;
}

function updateSelectedState(gd: GraphDiv, searchTraces: any, eventData?: any) {
    let i;

    // before anything else, update preGUI if necessary
    for(i = 0; i < searchTraces.length; i++) {
        const fullInputTrace = searchTraces[i].cd[0].trace._fullInput;
        const tracePreGUI = gd._fullLayout._tracePreGUI[fullInputTrace.uid] || {};
        if(tracePreGUI.selectedpoints === undefined) {
            tracePreGUI.selectedpoints = fullInputTrace._input.selectedpoints || null;
        }
    }

    let trace;
    if(eventData) {
        const pts = eventData.points || [];
        for(i = 0; i < searchTraces.length; i++) {
            trace = searchTraces[i].cd[0].trace;
            trace._input.selectedpoints = trace._fullInput.selectedpoints = [];
            if(trace._fullInput !== trace) trace.selectedpoints = [];
        }

        for(let k = 0; k < pts.length; k++) {
            const pt = pts[k];
            const data = pt.data;
            const fullData = pt.fullData;
            const pointIndex = pt.pointIndex;
            const pointIndices = pt.pointIndices;
            if(pointIndices) {
                [].push.apply(data.selectedpoints, pointIndices);
                if(trace._fullInput !== trace) {
                    [].push.apply(fullData.selectedpoints, pointIndices);
                }
            } else {
                data.selectedpoints.push(pointIndex);
                if(trace._fullInput !== trace) {
                    fullData.selectedpoints.push(pointIndex);
                }
            }
        }
    } else {
        for(i = 0; i < searchTraces.length; i++) {
            trace = searchTraces[i].cd[0].trace;
            delete trace.selectedpoints;
            delete trace._input.selectedpoints;
            if(trace._fullInput !== trace) {
                delete trace._fullInput.selectedpoints;
            }
        }
    }

    updateReglSelectedState(gd, searchTraces);
}

function updateReglSelectedState(gd: GraphDiv, searchTraces: any) {
    let hasRegl = false;

    for(let i = 0; i < searchTraces.length; i++) {
        const searchInfo = searchTraces[i];
        const cd = searchInfo.cd;

        if(Registry.traceIs(cd[0].trace, 'regl')) {
            hasRegl = true;
        }

        const _module = searchInfo._module;
        const fn = _module.styleOnSelect || _module.style;
        if(fn) {
            fn(gd, cd, cd[0].node3);
            if(cd[0].nodeRangePlot3) fn(gd, cd, cd[0].nodeRangePlot3);
        }
    }

    if(hasRegl) {
        clearGlCanvases(gd);
        redrawReglTraces(gd);
    }
}

function mergePolygons(list: any, poly: any, subtract: any) {
    const fn = subtract ?
        polybool.difference :
        polybool.union;

    const res = fn({
        regions: list
    }, {
        regions: [poly]
    });

    const allPolygons = res.regions.reverse();

    for(let i = 0; i < allPolygons.length; i++) {
        const polygon = allPolygons[i];

        polygon.subtract = getSubtract(polygon, allPolygons.slice(0, i));
    }

    return allPolygons;
}

function fillSelectionItem(selection: any, searchInfo: any) {
    if(Array.isArray(selection)) {
        const cd = searchInfo.cd;
        const trace = searchInfo.cd[0].trace;

        for(let i = 0; i < selection.length; i++) {
            selection[i] = makeEventData(selection[i], trace, cd);
        }
    }

    return selection;
}

function convertPoly(polygonsIn: any, isOpenMode: any) { // add M and L command to draft positions
    const polygonsOut: any[] = [];
    for(let i = 0; i < polygonsIn.length; i++) {
        polygonsOut[i] = [];
        for(let j = 0; j < polygonsIn[i].length; j++) {
            polygonsOut[i][j] = [];
            polygonsOut[i][j][0] = j ? 'L' : 'M';
            for(let k = 0; k < polygonsIn[i][j].length; k++) {
                (polygonsOut[i][j] as any).push(
                    polygonsIn[i][j][k]
                );
            }
        }

        if(!isOpenMode) {
            (polygonsOut[i] as any).push([
                'Z',
                polygonsOut[i][0][1], // initial x
                polygonsOut[i][0][2]  // initial y
            ]);
        }
    }

    return polygonsOut;
}

function _doSelect(selectionTesters: any, searchTraces: any) {
    let allSelections: any[] = [];

    let thisSelection;
    const traceSelections: any[] = [];
    let traceSelection;
    for(let i = 0; i < searchTraces.length; i++) {
        const searchInfo = searchTraces[i];

        traceSelection = searchInfo._module.selectPoints(searchInfo, selectionTesters);
        traceSelections.push(traceSelection);

        thisSelection = fillSelectionItem(traceSelection, searchInfo);

        allSelections = allSelections.concat(thisSelection);
    }

    return allSelections;
}

function reselect(gd: GraphDiv, mayEmitSelected: any, selectionTesters?: any, searchTraces?: any, dragOptions?: any) {
    const hadSearchTraces = !!searchTraces;
    let plotinfo, xRef, yRef;
    if(dragOptions) {
        plotinfo = dragOptions.plotinfo;
        xRef = dragOptions.xaxes[0]._id;
        yRef = dragOptions.yaxes[0]._id;
    }

    let allSelections: any[] = [];
    let allSearchTraces: any[] = [];

    // select layout.selection polygons
    let layoutPolygons = getLayoutPolygons(gd);

    // add draft outline polygons to layoutPolygons
    const fullLayout = gd._fullLayout;
    if(plotinfo) {
        const zoomLayer = fullLayout._zoomlayer;
        const mode = fullLayout.dragmode;
        const isDrawMode = drawMode(mode);
        const isSelectMode = selectMode(mode);
        if(isDrawMode || isSelectMode) {
            const xaxis = getFromId(gd, xRef, 'x');
            const yaxis = getFromId(gd, yRef, 'y');
            if(xaxis && yaxis) {
                const outlines = zoomLayer.selectAll('.select-outline-' + plotinfo.id);
                if(outlines && gd._fullLayout._outlining) {
                    if(outlines.length) {
                        const e = outlines[0][0]; // pick first
                        const d = e.getAttribute('d');
                        const outlinePolys = readPaths(d, gd, plotinfo);

                        const draftPolygons: any[] = [];
                        for(let u = 0; u < outlinePolys.length; u++) {
                            const p = outlinePolys[u];
                            const polygon: any = [];
                            for(let t = 0; t < (p as any).length; t++) {
                                polygon.push([
                                    convert(xaxis, p[t][1]),
                                    convert(yaxis, p[t][2])
                                ]);
                            }

                            polygon.xref = xRef;
                            polygon.yref = yRef;
                            polygon.subtract = getSubtract(polygon, draftPolygons);

                            draftPolygons.push(polygon);
                        }

                        layoutPolygons = layoutPolygons.concat((draftPolygons as any));
                    }
                }
            }
        }
    }

    const subplots = (xRef && yRef) ? [xRef + yRef] :
        fullLayout._subplots.cartesian;

    epmtySplomSelectionBatch(gd);

    const seenSplom: any = {};

    for(let i = 0; i < subplots.length; i++) {
        const subplot = subplots[i];
        const yAt = subplot.indexOf('y');
        const _xRef = subplot.slice(0, yAt);
        const _yRef = subplot.slice(yAt);

        let _selectionTesters = (xRef && yRef) ? selectionTesters : undefined;
        _selectionTesters = addTester(layoutPolygons, _xRef, _yRef, _selectionTesters);

        if(_selectionTesters) {
            let _searchTraces = searchTraces;
            if(!hadSearchTraces) {
                const _xA = getFromId(gd, _xRef, 'x');
                const _yA = getFromId(gd, _yRef, 'y');

                _searchTraces = determineSearchTraces(
                    gd,
                    [_xA],
                    [_yA],
                    subplot
                );

                for(let w = 0; w < _searchTraces.length; w++) {
                    const s = _searchTraces[w];
                    const cd0 = s.cd[0];
                    const trace = cd0.trace;

                    if(s._module.name === 'scattergl' && !cd0.t.xpx) {
                        const x = trace.x;
                        const y = trace.y;
                        const len = trace._length;
                        // generate stash for scattergl
                        cd0.t.xpx = [];
                        cd0.t.ypx = [];
                        for(let j = 0; j < len; j++) {
                            cd0.t.xpx[j] = _xA.c2p(x[j]);
                            cd0.t.ypx[j] = _yA.c2p(y[j]);
                        }
                    }

                    if(s._module.name === 'splom') {
                        if(!seenSplom[trace.uid]) {
                            seenSplom[trace.uid] = true;
                        }
                    }
                }
            }
            const selection = _doSelect(_selectionTesters, _searchTraces);

            allSelections = allSelections.concat(selection);
            allSearchTraces = allSearchTraces.concat(_searchTraces);
        }
    }

    const eventData: any = {points: allSelections};
    updateSelectedState(gd, allSearchTraces, eventData);

    const clickmode = fullLayout.clickmode;
    const sendEvents = clickmode.indexOf('event') > -1 && mayEmitSelected;

    if(
        !plotinfo && // get called from plot_api & plots
        mayEmitSelected
    ) {
        const activePolygons = getLayoutPolygons(gd, true);

        if(activePolygons.length) {
            const xref = (activePolygons[0] as any).xref;
            const yref = (activePolygons[0] as any).yref;
            if(xref && yref) {
                const poly = castMultiPolygon(activePolygons);

                const fillRangeItems = makeFillRangeItems([
                    getFromId(gd, xref, 'x'),
                    getFromId(gd, yref, 'y')
                ]);

                fillRangeItems(eventData, poly);
            }
        }

        if(gd._fullLayout._noEmitSelectedAtStart) {
            gd._fullLayout._noEmitSelectedAtStart = false;
        } else {
            if(sendEvents) emitSelected(gd, eventData);
        }

        fullLayout._reselect = false;
    }

    if(
        !plotinfo && // get called from plot_api & plots
        fullLayout._deselect
    ) {
        const deselect = fullLayout._deselect;
        xRef = deselect.xref;
        yRef = deselect.yref;

        if(!subplotSelected(xRef, yRef, allSearchTraces)) {
            deselectSubplot(gd, xRef, yRef, searchTraces);
        }

        if(sendEvents) {
            if(eventData.points.length) {
                emitSelected(gd, eventData);
            } else {
                emitDeselect(gd);
            }
        }

        fullLayout._deselect = false;
    }

    return {
        eventData: eventData,
        selectionTesters: selectionTesters
    };
}

function epmtySplomSelectionBatch(gd: GraphDiv) {
    const cd = gd.calcdata;
    if(!cd) return;

    for(let i = 0; i < cd.length; i++) {
        const cd0 = cd[i][0];
        const trace = cd0.trace;
        const splomScenes = gd._fullLayout._splomScenes;
        if(splomScenes) {
            const scene = splomScenes[trace.uid];
            if(scene) {
                scene.selectBatch = [];
            }
        }
    }
}

function subplotSelected(xRef: any, yRef: any, searchTraces?: any) {
    for(let i = 0; i < searchTraces.length; i++) {
        const s = searchTraces[i];
        if(
            (s.xaxis && s.xaxis._id === xRef) &&
            (s.yaxis && s.yaxis._id === yRef)
        ) {
            return true;
        }
    }
    return false;
}

function deselectSubplot(gd: GraphDiv, xRef: any, yRef: any, searchTraces: any) {
    searchTraces = determineSearchTraces(
        gd,
        [getFromId(gd, xRef, 'x')],
        [getFromId(gd, yRef, 'y')],
        xRef + yRef
    );

    for(let k = 0; k < searchTraces.length; k++) {
        const searchInfo = searchTraces[k];
        searchInfo._module.selectPoints(searchInfo, false);
    }

    updateSelectedState(gd, searchTraces);
}

function addTester(layoutPolygons: any, xRef: any, yRef: any, selectionTesters: any) {
    let mergedPolygons;

    for(let i = 0; i < layoutPolygons.length; i++) {
        const currentPolygon = layoutPolygons[i];
        if(xRef !== currentPolygon.xref || yRef !== currentPolygon.yref) continue;

        if(mergedPolygons) {
            const subtract = !!currentPolygon.subtract;
            mergedPolygons = mergePolygons(mergedPolygons, currentPolygon, subtract);
            selectionTesters = multiTester(mergedPolygons);
        } else {
            mergedPolygons = [currentPolygon];
            selectionTesters = polygonTester(currentPolygon);
        }
    }

    return selectionTesters;
}

function getLayoutPolygons(gd: GraphDiv, onlyActiveOnes?: any) {
    const allPolygons: any[] = [];

    const fullLayout = gd._fullLayout;
    const allSelections = fullLayout.selections;
    const len = allSelections.length;

    for(let i = 0; i < len; i++) {
        if(onlyActiveOnes && i !== fullLayout._activeSelectionIndex) continue;

        const selection = allSelections[i];
        if(!selection) continue;

        const xref = selection.xref;
        const yref = selection.yref;

        const xaxis = getFromId(gd, xref, 'x');
        const yaxis = getFromId(gd, yref, 'y');

        let xmin, xmax, ymin, ymax;

        let polygon: any;
        if(selection.type === 'rect') {
            polygon = [];

            const x0 = convert(xaxis, selection.x0);
            const x1 = convert(xaxis, selection.x1);
            const y0 = convert(yaxis, selection.y0);
            const y1 = convert(yaxis, selection.y1);
            polygon = [[x0, y0], [x0, y1], [x1, y1], [x1, y0]];

            xmin = Math.min(x0, x1);
            xmax = Math.max(x0, x1);
            ymin = Math.min(y0, y1);
            ymax = Math.max(y0, y1);

            polygon.xmin = xmin;
            polygon.xmax = xmax;
            polygon.ymin = ymin;
            polygon.ymax = ymax;

            polygon.xref = xref;
            polygon.yref = yref;

            polygon.subtract = false;
            polygon.isRect = true;

            allPolygons.push(polygon);
        } else if(selection.type === 'path') {
            const segments = selection.path.split('Z');

            const multiPolygons: any[] = [];
            for(let j = 0; j < segments.length; j++) {
                let path = segments[j];
                if(!path) continue;
                path += 'Z';

                const allX = shapeHelpers.extractPathCoords(path, shapeConstants.paramIsX, 'raw');
                const allY = shapeHelpers.extractPathCoords(path, shapeConstants.paramIsY, 'raw');

                xmin = Infinity;
                xmax = -Infinity;
                ymin = Infinity;
                ymax = -Infinity;

                polygon = [];

                for(let k = 0; k < allX.length; k++) {
                    const x = convert(xaxis, allX[k]);
                    const y = convert(yaxis, allY[k]);

                    polygon.push([x, y]);

                    xmin = Math.min(x, xmin);
                    xmax = Math.max(x, xmax);
                    ymin = Math.min(y, ymin);
                    ymax = Math.max(y, ymax);
                }

                polygon.xmin = xmin;
                polygon.xmax = xmax;
                polygon.ymin = ymin;
                polygon.ymax = ymax;

                polygon.xref = xref;
                polygon.yref = yref;
                polygon.subtract = getSubtract(polygon, multiPolygons);

                multiPolygons.push(polygon);
                allPolygons.push(polygon);
            }
        }
    }

    return allPolygons;
}

function getSubtract(polygon: any, previousPolygons: any) {
    let subtract = false;
    for(let i = 0; i < previousPolygons.length; i++) {
        const previousPolygon = previousPolygons[i];

        // find out if a point of polygon is inside previous polygons
        for(let k = 0; k < polygon.length; k++) {
            if(pointInPolygon(polygon[k], previousPolygon)) {
                subtract = !subtract;
                break;
            }
        }
    }
    return subtract;
}

function convert(ax: FullAxis, d: any) {
    if(ax.type === 'date') d = d.replace('_', ' ');
    return ax.type === 'log' ? ax.c2p(d) : ax.r2p(d, null, ax.calendar);
}

function castMultiPolygon(allPolygons: any) {
    const len = allPolygons.length;

    // descibe multi polygons in one polygon
    let p: any[] = [];
    for(let i = 0; i < len; i++) {
        const polygon = allPolygons[i];
        p = p.concat(polygon);

        // add starting vertex to close
        // which indicates next polygon
        p = p.concat([(polygon[0] as any)]);
    }

    return computeRectAndRanges(p);
}

function computeRectAndRanges(poly: any) {
    poly.isRect = poly.length === 5 &&
        poly[0][0] === poly[4][0] &&
        poly[0][1] === poly[4][1] &&
        (
            poly[0][0] === poly[1][0] &&
            poly[2][0] === poly[3][0] &&
            poly[0][1] === poly[3][1] &&
            poly[1][1] === poly[2][1]
        ) ||
        (
            poly[0][1] === poly[1][1] &&
            poly[2][1] === poly[3][1] &&
            poly[0][0] === poly[3][0] &&
            poly[1][0] === poly[2][0]
        );

    if(poly.isRect) {
        poly.xmin = Math.min(poly[0][0], poly[2][0]);
        poly.xmax = Math.max(poly[0][0], poly[2][0]);
        poly.ymin = Math.min(poly[0][1], poly[2][1]);
        poly.ymax = Math.max(poly[0][1], poly[2][1]);
    }

    return poly;
}

function makeFillRangeItems(allAxes: any) {
    return function(eventData: any, poly: any) {
        let range;
        let lassoPoints;

        for(let i = 0; i < allAxes.length; i++) {
            const ax = allAxes[i];
            const id = ax._id;
            const axLetter = id.charAt(0);

            if(poly.isRect) {
                if(!range) range = {};
                const min = poly[axLetter + 'min'];
                const max = poly[axLetter + 'max'];

                if(min !== undefined && max !== undefined) {
                    (range as any)[id] = [
                        p2r(ax, min),
                        p2r(ax, max)
                    ].sort(ascending);
                }
            } else {
                if(!lassoPoints) lassoPoints = {};
                (lassoPoints as any)[id] = poly.map(axValue(ax));
            }
        }

        if(range) {
            eventData.range = range;
        }

        if(lassoPoints) {
            eventData.lassoPoints = lassoPoints;
        }
    };
}

function getFillRangeItems(dragOptions: any) {
    const plotinfo = dragOptions.plotinfo;

    return (
        plotinfo.fillRangeItems || // allow subplots (i.e. geo, mapbox, map, sankey) to override fillRangeItems routine
        makeFillRangeItems(dragOptions.xaxes.concat(dragOptions.yaxes))
    );
}

function emitSelecting(gd: GraphDiv, eventData: any) {
    gd.emit('plotly_selecting', eventData);
}

function emitSelected(gd: GraphDiv, eventData: any) {
    if(eventData) {
        eventData.selections = (gd.layout || {}).selections || [];
    }

    gd.emit('plotly_selected', eventData);
}

function emitDeselect(gd: GraphDiv) {
    gd.emit('plotly_deselect', null);
}

export default {
    reselect: reselect,
    prepSelect: prepSelect,
    clearOutline: clearOutline,
    clearSelectionsCache: clearSelectionsCache,
    selectOnClick: selectOnClick
};
