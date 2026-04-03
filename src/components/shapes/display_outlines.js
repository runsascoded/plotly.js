import Lib from '../../lib/index.js';
import dragElement from '../dragelement/index.js';
import dragHelpers from '../dragelement/helpers.js';
import { _guiRelayout, relayout } from '../../plot_api/plot_api.js';
import Color from '../color/index.js';
import constants from './draw_newshape/constants.js';
import handleOutline from './handle_outline.js';
import helpers from './draw_newshape/helpers.js';
import _newshapes from './draw_newshape/newshapes.js';
const { newShapes, createShapeObj } = _newshapes;
import newSelections from '../selections/draw_newselection/newselections.js';
import drawLabel from './display_labels.js';
const strTranslate = Lib.strTranslate;
const drawMode = dragHelpers.drawMode;
const selectMode = dragHelpers.selectMode;
const i000 = constants.i000;
const i090 = constants.i090;
const i180 = constants.i180;
const i270 = constants.i270;
const clearOutlineControllers = handleOutline.clearOutlineControllers;
const pointsOnRectangle = helpers.pointsOnRectangle;
const pointsOnEllipse = helpers.pointsOnEllipse;
const writePaths = helpers.writePaths;
export default function displayOutlines(polygons, outlines, dragOptions, nCalls) {
    if (!nCalls)
        nCalls = 0;
    const gd = dragOptions.gd;
    function redraw() {
        // recursive call
        displayOutlines(polygons, outlines, dragOptions, nCalls++);
        if (pointsOnEllipse(polygons[0]) || dragOptions.hasText) {
            update({ redrawing: true });
        }
    }
    function update(opts) {
        let updateObject = {};
        if (dragOptions.isActiveShape !== undefined) {
            dragOptions.isActiveShape = false; // i.e. to disable shape controllers
            updateObject = newShapes(outlines, dragOptions);
        }
        if (dragOptions.isActiveSelection !== undefined) {
            dragOptions.isActiveSelection = false; // i.e. to disable selection controllers
            updateObject = newSelections(outlines, dragOptions);
            gd._fullLayout._reselect = true;
        }
        if (Object.keys(updateObject).length) {
            ((opts || {}).redrawing ? relayout : _guiRelayout)(gd, updateObject);
        }
    }
    const fullLayout = gd._fullLayout;
    const zoomLayer = fullLayout._zoomlayer;
    const dragmode = dragOptions.dragmode;
    const isDrawMode = drawMode(dragmode);
    const isSelectMode = selectMode(dragmode);
    if (isDrawMode || isSelectMode) {
        gd._fullLayout._outlining = true;
    }
    clearOutlineControllers(gd);
    // make outline
    outlines.attr('d', writePaths(polygons));
    // add controllers
    let vertexDragOptions;
    let groupDragOptions;
    let indexI; // cell index
    let indexJ; // vertex or cell-controller index
    let copyPolygons;
    if (!nCalls && (dragOptions.isActiveShape ||
        dragOptions.isActiveSelection)) {
        copyPolygons = recordPositions([], polygons);
        const g = zoomLayer.append('g').attr('class', 'outline-controllers');
        addVertexControllers(g);
        addGroupControllers();
    }
    // draw label
    if (isDrawMode && dragOptions.hasText) {
        const shapeGroup = zoomLayer.select('.label-temp');
        const shapeOptions = createShapeObj(outlines, dragOptions, dragOptions.dragmode);
        drawLabel(gd, 'label-temp', shapeOptions, shapeGroup);
    }
    function startDragVertex(evt) {
        indexI = +evt.srcElement.getAttribute('data-i');
        indexJ = +evt.srcElement.getAttribute('data-j');
        vertexDragOptions[indexI][indexJ].moveFn = moveVertexController;
    }
    function moveVertexController(dx, dy) {
        if (!polygons.length)
            return;
        const x0 = copyPolygons[indexI][indexJ][1];
        const y0 = copyPolygons[indexI][indexJ][2];
        const cell = polygons[indexI];
        const len = cell.length;
        if (pointsOnRectangle(cell)) {
            let _dx = dx;
            let _dy = dy;
            if (dragOptions.isActiveSelection) {
                // handle an edge contoller for rect selections
                const nextPoint = getNextPoint(cell, indexJ);
                if (nextPoint[1] === cell[indexJ][1]) { // a vertical edge
                    _dy = 0;
                }
                else { // a horizontal edge
                    _dx = 0;
                }
            }
            for (let q = 0; q < len; q++) {
                if (q === indexJ)
                    continue;
                // move other corners of rectangle
                const pos = cell[q];
                if (pos[1] === cell[indexJ][1]) {
                    pos[1] = x0 + _dx;
                }
                if (pos[2] === cell[indexJ][2]) {
                    pos[2] = y0 + _dy;
                }
            }
            // move the corner
            cell[indexJ][1] = x0 + _dx;
            cell[indexJ][2] = y0 + _dy;
            if (!pointsOnRectangle(cell)) {
                // reject result to rectangles with ensure areas
                for (let j = 0; j < len; j++) {
                    for (let k = 0; k < cell[j].length; k++) {
                        cell[j][k] = copyPolygons[indexI][j][k];
                    }
                }
            }
        }
        else { // other polylines
            cell[indexJ][1] = x0 + dx;
            cell[indexJ][2] = y0 + dy;
        }
        redraw();
    }
    function endDragVertexController() {
        update();
    }
    function removeVertex() {
        if (!polygons.length)
            return;
        if (!polygons[indexI])
            return;
        if (!polygons[indexI].length)
            return;
        const newPolygon = [];
        for (let j = 0; j < polygons[indexI].length; j++) {
            if (j !== indexJ) {
                newPolygon.push(polygons[indexI][j]);
            }
        }
        if (newPolygon.length > 1 && !(newPolygon.length === 2 && newPolygon[1][0] === 'Z')) {
            if (indexJ === 0) {
                newPolygon[0][0] = 'M';
            }
            polygons[indexI] = newPolygon;
            redraw();
            update();
        }
    }
    function clickVertexController(numClicks, evt) {
        if (numClicks === 2) {
            indexI = +evt.srcElement.getAttribute('data-i');
            indexJ = +evt.srcElement.getAttribute('data-j');
            const cell = polygons[indexI];
            if (!pointsOnRectangle(cell) &&
                !pointsOnEllipse(cell)) {
                removeVertex();
            }
        }
    }
    function addVertexControllers(g) {
        vertexDragOptions = [];
        for (let i = 0; i < polygons.length; i++) {
            const cell = polygons[i];
            const onRect = pointsOnRectangle(cell);
            const onEllipse = !onRect && pointsOnEllipse(cell);
            vertexDragOptions[i] = [];
            const len = cell.length;
            for (let j = 0; j < len; j++) {
                if (cell[j][0] === 'Z')
                    continue;
                if (onEllipse &&
                    j !== i000 &&
                    j !== i090 &&
                    j !== i180 &&
                    j !== i270) {
                    continue;
                }
                const rectSelection = onRect && dragOptions.isActiveSelection;
                let nextPoint;
                if (rectSelection)
                    nextPoint = getNextPoint(cell, j);
                const x = cell[j][1];
                const y = cell[j][2];
                const vertex = g.append(rectSelection ? 'rect' : 'circle')
                    .attr('data-i', i)
                    .attr('data-j', j)
                    .style('fill', Color.background)
                    .style('stroke', Color.defaultLine)
                    .style('stroke-width', 1)
                    .style('shape-rendering', 'crispEdges');
                if (rectSelection) {
                    // convert a vertex controller to an edge controller for rect selections
                    const dx = nextPoint[1] - x;
                    const dy = nextPoint[2] - y;
                    const width = dy ? 5 : Math.max(Math.min(25, Math.abs(dx) - 5), 5);
                    const height = dx ? 5 : Math.max(Math.min(25, Math.abs(dy) - 5), 5);
                    vertex.classed(dy ? 'cursor-ew-resize' : 'cursor-ns-resize', true)
                        .attr('width', width)
                        .attr('height', height)
                        .attr('x', x - width / 2)
                        .attr('y', y - height / 2)
                        .attr('transform', strTranslate(dx / 2, dy / 2));
                }
                else {
                    vertex.classed('cursor-grab', true)
                        .attr('r', 5)
                        .attr('cx', x)
                        .attr('cy', y);
                }
                vertexDragOptions[i][j] = {
                    element: vertex.node(),
                    gd: gd,
                    prepFn: startDragVertex,
                    doneFn: endDragVertexController,
                    clickFn: clickVertexController
                };
                dragElement.init(vertexDragOptions[i][j]);
            }
        }
    }
    function moveGroup(dx, dy) {
        if (!polygons.length)
            return;
        for (let i = 0; i < polygons.length; i++) {
            for (let j = 0; j < polygons[i].length; j++) {
                for (let k = 0; k + 2 < polygons[i][j].length; k += 2) {
                    polygons[i][j][k + 1] = copyPolygons[i][j][k + 1] + dx;
                    polygons[i][j][k + 2] = copyPolygons[i][j][k + 2] + dy;
                }
            }
        }
    }
    function moveGroupController(dx, dy) {
        moveGroup(dx, dy);
        redraw();
    }
    function startDragGroupController(evt) {
        indexI = +evt.srcElement.getAttribute('data-i');
        if (!indexI)
            indexI = 0; // ensure non-existing move button get zero index
        groupDragOptions[indexI].moveFn = moveGroupController;
    }
    function endDragGroupController() {
        update();
    }
    function clickGroupController(numClicks) {
        if (numClicks === 2) {
            eraseActiveSelection(gd);
        }
    }
    function addGroupControllers() {
        groupDragOptions = [];
        if (!polygons.length)
            return;
        const i = 0;
        groupDragOptions[i] = {
            element: outlines[0][0],
            gd: gd,
            prepFn: startDragGroupController,
            doneFn: endDragGroupController,
            clickFn: clickGroupController
        };
        dragElement.init(groupDragOptions[i]);
    }
}
function recordPositions(polygonsOut, polygonsIn) {
    for (let i = 0; i < polygonsIn.length; i++) {
        const cell = polygonsIn[i];
        polygonsOut[i] = [];
        for (let j = 0; j < cell.length; j++) {
            polygonsOut[i][j] = [];
            for (let k = 0; k < cell[j].length; k++) {
                polygonsOut[i][j][k] = cell[j][k];
            }
        }
    }
    return polygonsOut;
}
function getNextPoint(cell, j) {
    const x = cell[j][1];
    const y = cell[j][2];
    const len = cell.length;
    let nextJ, nextX, nextY;
    nextJ = (j + 1) % len;
    nextX = cell[nextJ][1];
    nextY = cell[nextJ][2];
    // avoid potential double points (closing points)
    if (nextX === x && nextY === y) {
        nextJ = (j + 2) % len;
        nextX = cell[nextJ][1];
        nextY = cell[nextJ][2];
    }
    return [nextJ, nextX, nextY];
}
function eraseActiveSelection(gd) {
    // Do not allow removal of selections on other dragmodes.
    // This ensures the user could still double click to
    // deselect all trace.selectedpoints,
    // if that's what they wanted.
    // Also double click to zoom back won't result in
    // any surprising selection removal.
    if (!selectMode(gd._fullLayout.dragmode))
        return;
    clearOutlineControllers(gd);
    const id = gd._fullLayout._activeSelectionIndex;
    const selections = (gd.layout || {}).selections || [];
    if (id < selections.length) {
        const list = [];
        for (let q = 0; q < selections.length; q++) {
            if (q !== id) {
                list.push(selections[q]);
            }
        }
        delete gd._fullLayout._activeSelectionIndex;
        const erasedSelection = gd._fullLayout.selections[id];
        gd._fullLayout._deselect = {
            xref: erasedSelection.xref,
            yref: erasedSelection.yref
        };
        _guiRelayout(gd, {
            selections: list
        });
    }
}
