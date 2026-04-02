import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import Axes from '../../plots/cartesian/axes.js';
import { readPaths } from './draw_newshape/helpers.js';
import displayOutlines from './display_outlines.js';
import drawLabel from './display_labels.js';
import _handle_outline from './handle_outline.js';
const { clearOutlineControllers } = _handle_outline;
import Color from '../color/index.js';
import { dashLine, setClipUrl } from '../drawing/index.js';
import { arrayEditor } from '../../plot_api/plot_template.js';
import dragElement from '../dragelement/index.js';
import setCursor from '../../lib/setcursor.js';
import constants from './constants.js';
import helpers from './helpers.js';
const getPathString = helpers.getPathString;

export default {
    draw: draw,
    drawOne: drawOne,
    eraseActiveShape: eraseActiveShape,
    drawLabel: drawLabel,
};

function draw(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;

    // Remove previous shapes before drawing new in shapes in fullLayout.shapes
    fullLayout._shapeUpperLayer.selectAll('path').remove();
    fullLayout._shapeLowerLayer.selectAll('path').remove();
    fullLayout._shapeUpperLayer.selectAll('text').remove();
    fullLayout._shapeLowerLayer.selectAll('text').remove();

    for(const k in fullLayout._plots) {
        const shapelayer = fullLayout._plots[k].shapelayer;
        if(shapelayer) {
            shapelayer.selectAll('path').remove();
            shapelayer.selectAll('text').remove();
        }
    }

    for(let i = 0; i < fullLayout.shapes!.length; i++) {
        if(fullLayout.shapes![i].visible === true) {
            drawOne(gd, i);
        }
    }

    // may need to resurrect this if we put text (LaTeX) in shapes
    // return Plots.previousPromises(gd);
}

function shouldSkipEdits(gd: GraphDiv) {
    return !!gd._fullLayout._outlining;
}

function couldHaveActiveShape(gd: GraphDiv) {
    // for now keep config.editable: true as it was before shape-drawing PR
    return !gd._context.edits.shapePosition;
}

function drawOne(gd: GraphDiv, index: any) {
    // remove the existing shape if there is one.
    // because indices can change, we need to look in all shape layers
    gd._fullLayout._paperdiv
        .selectAll('.shapelayer [data-index="' + index + '"]')
        .remove();

    const o = helpers.makeShapesOptionsAndPlotinfo(gd, index);
    const options = o.options;
    const plotinfo = o.plotinfo;

    // this shape is gone - quit now after deleting it
    // TODO: use d3 idioms instead of deleting and redrawing every time
    if(!options._input || options.visible !== true) return;

    if(options.layer === 'above') {
        drawShape(gd._fullLayout._shapeUpperLayer);
    } else if(options.xref === 'paper' || options.yref === 'paper') {
        drawShape(gd._fullLayout._shapeLowerLayer);
    } else if(options.layer === 'between') {
        drawShape(plotinfo.shapelayerBetween);
    } else {
        if(plotinfo._hadPlotinfo) {
            const mainPlot = plotinfo.mainplotinfo || plotinfo;
            drawShape(mainPlot.shapelayer);
        } else {
            // Fall back to _shapeLowerLayer in case the requested subplot doesn't exist.
            // This can happen if you reference the shape to an x / y axis combination
            // that doesn't have any data on it (and layer is below)
            drawShape(gd._fullLayout._shapeLowerLayer);
        }
    }

    function drawShape(shapeLayer: any) {
        const d = getPathString(gd, options);
        const attrs = {
            'data-index': index,
            'fill-rule': options.fillrule,
            d: d
        };

        let opacity = options.opacity;
        let fillColor = options.fillcolor;
        const lineColor = options.line.width ? options.line.color : 'rgba(0,0,0,0)';
        let lineWidth = options.line.width;
        let lineDash = options.line.dash;
        if(!lineWidth && options.editable === true) {
            // ensure invisible border to activate the shape
            lineWidth = 5;
            lineDash = 'solid';
        }

        const isOpen = d[d.length - 1] !== 'Z';

        const isActiveShape = couldHaveActiveShape(gd) &&
            options.editable && gd._fullLayout._activeShapeIndex === index;

        if(isActiveShape) {
            fillColor = isOpen ? 'rgba(0,0,0,0)' :
                gd._fullLayout.activeshape.fillcolor;

            opacity = gd._fullLayout.activeshape.opacity;
        }

        const shapeGroup = shapeLayer.append('g')
            .classed('shape-group', true)
            .attr({ 'data-index': index });

        const path = shapeGroup.append('path')
            .attr(attrs)
            .style('opacity', opacity)
            .call(Color.stroke, lineColor)
            .call(Color.fill, fillColor)
            .call(dashLine, lineDash, lineWidth);

        setClipPath(shapeGroup, gd, options);

        // Draw or clear the label
        drawLabel(gd, index, options, shapeGroup);

        let editHelpers;
        if(isActiveShape || gd._context.edits.shapePosition) editHelpers = arrayEditor(gd.layout, 'shapes', options);

        if(isActiveShape) {
            path.style({
                cursor: 'move',
            });

            const dragOptions = {
                element: path.node(),
                plotinfo: plotinfo,
                gd: gd,
                editHelpers: editHelpers,
                hasText: options.label.text || options.label.texttemplate,
                isActiveShape: true // i.e. to enable controllers
            };

            const polygons = readPaths(d, gd);
            // display polygons on the screen
            displayOutlines(polygons, path, dragOptions);
        } else {
            if(gd._context.edits.shapePosition) {
                setupDragElement(gd, path, options, index, shapeLayer, editHelpers);
            } else if(options.editable === true) {
                path.style('pointer-events',
                    (isOpen || Color.opacity(fillColor) * opacity <= 0.5) ? 'stroke' : 'all'
                );
            }
        }
        path.node().addEventListener('click', function() { return activateShape(gd, path); });
    }
}

function setClipPath(shapePath: any, gd: GraphDiv, shapeOptions: any) {
    // note that for layer="below" the clipAxes can be different from the
    // subplot we're drawing this in. This could cause problems if the shape
    // spans two subplots. See https://github.com/plotly/plotly.js/issues/1452
    //
    // if axis is 'paper' or an axis with " domain" appended, then there is no
    // clip axis
    const clipAxes = (shapeOptions.xref + shapeOptions.yref).replace(/paper/g, '').replace(/[xyz][0-9]* *domain/g, '');

    setClipUrl(
        shapePath,
        (clipAxes ? 'clip' + gd._fullLayout._uid + clipAxes : null as any),
        gd
    );
}

function setupDragElement(gd: GraphDiv, shapePath: any, shapeOptions: any, index: any, shapeLayer: any, editHelpers: any) {
    const MINWIDTH = 10;
    const MINHEIGHT = 10;

    const xPixelSized = shapeOptions.xsizemode === 'pixel';
    const yPixelSized = shapeOptions.ysizemode === 'pixel';
    const isLine = shapeOptions.type === 'line';
    const isPath = shapeOptions.type === 'path';

    const modifyItem = editHelpers.modifyItem;

    let x0: any, y0: any, x1: any, y1: any, xAnchor: any, yAnchor: any;
    let n0: any, s0: any, w0: any, e0: any, optN: any, optS: any, optW: any, optE: any;
    let pathIn: any;

    const shapeGroup = select(shapePath.node().parentNode);

    // setup conversion functions
    const xa = Axes.getFromId(gd, shapeOptions.xref);
    const xRefType = Axes.getRefType(shapeOptions.xref);
    const ya = Axes.getFromId(gd, shapeOptions.yref);
    const yRefType = Axes.getRefType(shapeOptions.yref);
    const shiftXStart = shapeOptions.x0shift;
    const shiftXEnd = shapeOptions.x1shift;
    const shiftYStart = shapeOptions.y0shift;
    const shiftYEnd = shapeOptions.y1shift;
    const x2p = function(v: any, shift?: any) {
        const dataToPixel = helpers.getDataToPixel(gd, xa, shift, false, xRefType);
        return dataToPixel(v);
    };
    const y2p = function(v: any, shift?: any) {
        const dataToPixel = helpers.getDataToPixel(gd, ya, shift, true, yRefType);
        return dataToPixel(v);
    };
    const p2x = helpers.getPixelToData(gd, xa, false, xRefType);
    const p2y = helpers.getPixelToData(gd, ya, true, yRefType);

    const sensoryElement = obtainSensoryElement();
    const dragOptions: any = {
        element: sensoryElement.node(),
        gd: gd,
        prepFn: startDrag,
        doneFn: endDrag,
        clickFn: abortDrag
    };
    let dragMode: any;

    dragElement.init(dragOptions);

    sensoryElement.node().onmousemove = updateDragMode;

    function obtainSensoryElement() {
        return isLine ? createLineDragHandles() : shapePath;
    }

    function createLineDragHandles() {
        const minSensoryWidth = 10;
        const sensoryWidth = Math.max(shapeOptions.line.width, minSensoryWidth);

        // Helper shapes group
        // Note that by setting the `data-index` attr, it is ensured that
        // the helper group is purged in this modules `draw` function
        const g = shapeLayer.append('g')
            .attr('data-index', index)
            .attr('drag-helper', true);

        // Helper path for moving
        g.append('path')
          .attr('d', shapePath.attr('d'))
          .style({
              cursor: 'move',
              'stroke-width': sensoryWidth,
              'stroke-opacity': '0' // ensure not visible
          });

        // Helper circles for resizing
        const circleStyle = {
            'fill-opacity': '0' // ensure not visible
        };
        const circleRadius = Math.max(sensoryWidth / 2, minSensoryWidth);

        g.append('circle')
          .attr({
              'data-line-point': 'start-point',
              cx: xPixelSized ? x2p(shapeOptions.xanchor) + shapeOptions.x0 : x2p(shapeOptions.x0, shiftXStart),
              cy: yPixelSized ? y2p(shapeOptions.yanchor) - shapeOptions.y0 : y2p(shapeOptions.y0, shiftYStart),
              r: circleRadius
          })
          .style(circleStyle)
          .classed('cursor-grab', true);

        g.append('circle')
          .attr({
              'data-line-point': 'end-point',
              cx: xPixelSized ? x2p(shapeOptions.xanchor) + shapeOptions.x1 : x2p(shapeOptions.x1, shiftXEnd),
              cy: yPixelSized ? y2p(shapeOptions.yanchor) - shapeOptions.y1 : y2p(shapeOptions.y1, shiftYEnd),
              r: circleRadius
          })
          .style(circleStyle)
          .classed('cursor-grab', true);

        return g;
    }

    function updateDragMode(evt: any) {
        if(shouldSkipEdits(gd)) {
            dragMode = null;
            return;
        }

        if(isLine) {
            if(evt.target.tagName === 'path') {
                dragMode = 'move';
            } else {
                dragMode = evt.target.attributes['data-line-point'].value === 'start-point' ?
                  'resize-over-start-point' : 'resize-over-end-point';
            }
        } else {
            // element might not be on screen at time of setup,
            // so obtain bounding box here
            const dragBBox = dragOptions.element.getBoundingClientRect();

            // choose 'move' or 'resize'
            // based on initial position of cursor within the drag element
            const w = dragBBox.right - dragBBox.left;
            const h = dragBBox.bottom - dragBBox.top;
            const x = evt.clientX - dragBBox.left;
            const y = evt.clientY - dragBBox.top;
            const cursor = (!isPath && w > MINWIDTH && h > MINHEIGHT && !evt.shiftKey) ?
                dragElement.getCursor(x / w, 1 - y / h) :
                'move';

            setCursor(shapePath, cursor);

            // possible values 'move', 'sw', 'w', 'se', 'e', 'ne', 'n', 'nw' and 'w'
            dragMode = cursor.split('-')[0];
        }
    }

    function startDrag(evt: any) {
        if(shouldSkipEdits(gd)) return;

        // setup update strings and initial values
        if(xPixelSized) {
            xAnchor = x2p(shapeOptions.xanchor);
        }
        if(yPixelSized) {
            yAnchor = y2p(shapeOptions.yanchor);
        }

        if(shapeOptions.type === 'path') {
            pathIn = shapeOptions.path;
        } else {
            x0 = xPixelSized ? shapeOptions.x0 : x2p(shapeOptions.x0);
            y0 = yPixelSized ? shapeOptions.y0 : y2p(shapeOptions.y0);
            x1 = xPixelSized ? shapeOptions.x1 : x2p(shapeOptions.x1);
            y1 = yPixelSized ? shapeOptions.y1 : y2p(shapeOptions.y1);
        }

        if(x0 < x1) {
            w0 = x0;
            optW = 'x0';
            e0 = x1;
            optE = 'x1';
        } else {
            w0 = x1;
            optW = 'x1';
            e0 = x0;
            optE = 'x0';
        }

        // For fixed size shapes take opposing direction of y-axis into account.
        // Hint: For data sized shapes this is done by the y2p function.
        if((!yPixelSized && y0 < y1) || (yPixelSized && y0 > y1)) {
            n0 = y0;
            optN = 'y0';
            s0 = y1;
            optS = 'y1';
        } else {
            n0 = y1;
            optN = 'y1';
            s0 = y0;
            optS = 'y0';
        }

        // setup dragMode and the corresponding handler
        updateDragMode(evt);
        renderVisualCues(shapeLayer, shapeOptions);
        deactivateClipPathTemporarily(shapePath, shapeOptions, gd);
        dragOptions.moveFn = (dragMode === 'move') ? moveShape : resizeShape;
        dragOptions.altKey = evt.altKey;
    }

    function endDrag() {
        if(shouldSkipEdits(gd)) return;

        setCursor(shapePath);
        removeVisualCues(shapeLayer);

        // Don't rely on clipPath being activated during re-layout
        setClipPath(shapePath, gd, shapeOptions);
        Registry.call('_guiRelayout', gd, editHelpers.getUpdateObj());
    }

    function abortDrag() {
        if(shouldSkipEdits(gd)) return;

        removeVisualCues(shapeLayer);
    }

    function moveShape(dx: any, dy: any) {
        if(shapeOptions.type === 'path') {
            const noOp = function(coord: any) { return coord; };
            let moveX = noOp;
            let moveY = noOp;

            if(xPixelSized) {
                modifyItem('xanchor', shapeOptions.xanchor = p2x(xAnchor + dx));
            } else {
                moveX = function moveX(x: any) { return p2x(x2p(x) + dx); };
                if(xa && xa.type === 'date') moveX = helpers.encodeDate(moveX);
            }

            if(yPixelSized) {
                modifyItem('yanchor', shapeOptions.yanchor = p2y(yAnchor + dy));
            } else {
                moveY = function moveY(y: any) { return p2y(y2p(y) + dy); };
                if(ya && ya.type === 'date') moveY = helpers.encodeDate(moveY);
            }

            modifyItem('path', shapeOptions.path = movePath(pathIn, moveX, moveY));
        } else {
            if(xPixelSized) {
                modifyItem('xanchor', shapeOptions.xanchor = p2x(xAnchor + dx));
            } else {
                modifyItem('x0', shapeOptions.x0 = p2x(x0 + dx));
                modifyItem('x1', shapeOptions.x1 = p2x(x1 + dx));
            }

            if(yPixelSized) {
                modifyItem('yanchor', shapeOptions.yanchor = p2y(yAnchor + dy));
            } else {
                modifyItem('y0', shapeOptions.y0 = p2y(y0 + dy));
                modifyItem('y1', shapeOptions.y1 = p2y(y1 + dy));
            }
        }

        shapePath.attr('d', getPathString(gd, shapeOptions));
        renderVisualCues(shapeLayer, shapeOptions);
        drawLabel(gd, index, shapeOptions, shapeGroup);
    }

    function resizeShape(dx: any, dy: any) {
        if(isPath) {
            // TODO: implement path resize, don't forget to update dragMode code
            const noOp = function(coord: any) { return coord; };
            let moveX = noOp;
            let moveY = noOp;

            if(xPixelSized) {
                modifyItem('xanchor', shapeOptions.xanchor = p2x(xAnchor + dx));
            } else {
                moveX = function moveX(x: any) { return p2x(x2p(x) + dx); };
                if(xa && xa.type === 'date') moveX = helpers.encodeDate(moveX);
            }

            if(yPixelSized) {
                modifyItem('yanchor', shapeOptions.yanchor = p2y(yAnchor + dy));
            } else {
                moveY = function moveY(y: any) { return p2y(y2p(y) + dy); };
                if(ya && ya.type === 'date') moveY = helpers.encodeDate(moveY);
            }

            modifyItem('path', shapeOptions.path = movePath(pathIn, moveX, moveY));
        } else if(isLine) {
            if(dragMode === 'resize-over-start-point') {
                const newX0 = x0 + dx;
                const newY0 = yPixelSized ? y0 - dy : y0 + dy;
                modifyItem('x0', shapeOptions.x0 = xPixelSized ? newX0 : p2x(newX0));
                modifyItem('y0', shapeOptions.y0 = yPixelSized ? newY0 : p2y(newY0));
            } else if(dragMode === 'resize-over-end-point') {
                const newX1 = x1 + dx;
                const newY1 = yPixelSized ? y1 - dy : y1 + dy;
                modifyItem('x1', shapeOptions.x1 = xPixelSized ? newX1 : p2x(newX1));
                modifyItem('y1', shapeOptions.y1 = yPixelSized ? newY1 : p2y(newY1));
            }
        } else {
            const has = function(str: any) { return dragMode.indexOf(str) !== -1; };
            const hasN = has('n');
            const hasS = has('s');
            const hasW = has('w');
            const hasE = has('e');

            let newN = hasN ? n0 + dy : n0;
            let newS = hasS ? s0 + dy : s0;
            const newW = hasW ? w0 + dx : w0;
            const newE = hasE ? e0 + dx : e0;

            if(yPixelSized) {
                // Do things in opposing direction for y-axis.
                // Hint: for data-sized shapes the reversal of axis direction is done in p2y.
                if(hasN) newN = n0 - dy;
                if(hasS) newS = s0 - dy;
            }

            // Update shape eventually. Again, be aware of the
            // opposing direction of the y-axis of fixed size shapes.
            if(
                (!yPixelSized && newS - newN > MINHEIGHT) ||
                (yPixelSized && newN - newS > MINHEIGHT)
            ) {
                modifyItem(optN, shapeOptions[optN] = yPixelSized ? newN : p2y(newN));
                modifyItem(optS, shapeOptions[optS] = yPixelSized ? newS : p2y(newS));
            }
            if(newE - newW > MINWIDTH) {
                modifyItem(optW, shapeOptions[optW] = xPixelSized ? newW : p2x(newW));
                modifyItem(optE, shapeOptions[optE] = xPixelSized ? newE : p2x(newE));
            }
        }

        shapePath.attr('d', getPathString(gd, shapeOptions));
        renderVisualCues(shapeLayer, shapeOptions);
        drawLabel(gd, index, shapeOptions, shapeGroup);
    }

    function renderVisualCues(shapeLayer: any, shapeOptions: any) {
        if(xPixelSized || yPixelSized) {
            renderAnchor();
        }

        function renderAnchor() {
            const isNotPath = shapeOptions.type !== 'path';

            // d3 join with dummy data to satisfy d3 data-binding
            const visualCues = shapeLayer.selectAll('.visual-cue').data([0]);

            // Enter
            const strokeWidth = 1;
            visualCues.enter()
              .append('path')
              .attr({
                  fill: '#fff',
                  'fill-rule': 'evenodd',
                  stroke: '#000',
                  'stroke-width': strokeWidth
              })
              .classed('visual-cue', true);

            // Update
            let posX = x2p(
              xPixelSized ?
                shapeOptions.xanchor :
                Lib.midRange(
                  isNotPath ?
                    [shapeOptions.x0, shapeOptions.x1] :
                    helpers.extractPathCoords(shapeOptions.path, constants.paramIsX))
            );
            let posY = y2p(
              yPixelSized ?
                shapeOptions.yanchor :
                Lib.midRange(
                  isNotPath ?
                    [shapeOptions.y0, shapeOptions.y1] :
                    helpers.extractPathCoords(shapeOptions.path, constants.paramIsY))
            );

            posX = helpers.roundPositionForSharpStrokeRendering(posX, strokeWidth);
            posY = helpers.roundPositionForSharpStrokeRendering(posY, strokeWidth);

            if(xPixelSized && yPixelSized) {
                const crossPath = 'M' + (posX - 1 - strokeWidth) + ',' + (posY - 1 - strokeWidth) +
                  'h-8v2h8 v8h2v-8 h8v-2h-8 v-8h-2 Z';
                visualCues.attr('d', crossPath);
            } else if(xPixelSized) {
                const vBarPath = 'M' + (posX - 1 - strokeWidth) + ',' + (posY - 9 - strokeWidth) +
                  'v18 h2 v-18 Z';
                visualCues.attr('d', vBarPath);
            } else {
                const hBarPath = 'M' + (posX - 9 - strokeWidth) + ',' + (posY - 1 - strokeWidth) +
                  'h18 v2 h-18 Z';
                visualCues.attr('d', hBarPath);
            }
        }
    }

    function removeVisualCues(shapeLayer: any) {
        shapeLayer.selectAll('.visual-cue').remove();
    }

    function deactivateClipPathTemporarily(shapePath: any, shapeOptions: any, gd: GraphDiv) {
        const xref = shapeOptions.xref;
        const yref = shapeOptions.yref;
        const xa = Axes.getFromId(gd, xref);
        const ya = Axes.getFromId(gd, yref);

        let clipAxes = '';
        if(xref !== 'paper' && !xa.autorange) clipAxes += xref;
        if(yref !== 'paper' && !ya.autorange) clipAxes += yref;

        setClipUrl(
            shapePath,
            (clipAxes ? 'clip' + gd._fullLayout._uid + clipAxes : null as any),
            gd
        );
    }
}

function movePath(pathIn: any, moveX: any, moveY: any) {
    return pathIn.replace(constants.segmentRE, function(segment: any) {
        let paramNumber = 0;
        const segmentType = segment.charAt(0);
        const xParams = (constants.paramIsX as any)[segmentType];
        const yParams = (constants.paramIsY as any)[segmentType];
        const nParams = (constants.numParams as any)[segmentType];

        const paramString = segment.slice(1).replace(constants.paramRE, function(param: any) {
            if(paramNumber >= nParams) return param;

            if(xParams[paramNumber]) param = moveX(param);
            else if(yParams[paramNumber]) param = moveY(param);

            paramNumber++;

            return param;
        });

        return segmentType + paramString;
    });
}

function activateShape(gd: GraphDiv, path: any) {
    if(!couldHaveActiveShape(gd)) return;

    const element = path.node();
    const id = +element.getAttribute('data-index');
    if(id >= 0) {
        // deactivate if already active
        if(id === gd._fullLayout._activeShapeIndex) {
            deactivateShape(gd);
            return;
        }

        gd._fullLayout._activeShapeIndex = id;
        gd._fullLayout._deactivateShape = deactivateShape;
        draw(gd);
    }
}

function deactivateShape(gd: GraphDiv) {
    if(!couldHaveActiveShape(gd)) return;

    const id = gd._fullLayout._activeShapeIndex;
    if(id >= 0) {
        clearOutlineControllers(gd);
        delete gd._fullLayout._activeShapeIndex;
        draw(gd);
    }
}

function eraseActiveShape(gd: GraphDiv) {
    if(!couldHaveActiveShape(gd)) return;

    clearOutlineControllers(gd);

    const id = gd._fullLayout._activeShapeIndex;
    const shapes = (gd.layout || {}).shapes || [];
    if(id < shapes.length) {
        const list: any[] = [];
        for(let q = 0; q < shapes.length; q++) {
            if(q !== id) {
                list.push(shapes[q]);
            }
        }

        delete gd._fullLayout._activeShapeIndex;

        return Registry.call('_guiRelayout', gd, {
            shapes: list
        });
    }
}
