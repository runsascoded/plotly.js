import type { GraphDiv } from '../../../types/core';
import { readPaths } from '../shapes/draw_newshape/helpers.js';
import displayOutlines from '../shapes/display_outlines.js';
import _handle_outline from '../shapes/handle_outline.js';
const { clearOutlineControllers } = _handle_outline;
import Color from '../color/index.js';
import { dashLine, setClipUrl } from '../drawing/index.js';
import { arrayEditor } from '../../plot_api/plot_template.js';
import helpers from '../shapes/helpers.js';
const getPathString = helpers.getPathString;

export default {
    draw: draw,
    drawOne: drawOne,
    activateLastSelection: activateLastSelection
};

function draw(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;

    clearOutlineControllers(gd);

    // Remove previous selections before drawing new selections in fullLayout.selections
    fullLayout._selectionLayer.selectAll('path').remove();

    for(const k in fullLayout._plots) {
        const selectionLayer = fullLayout._plots[k].selectionLayer;
        if(selectionLayer) selectionLayer.selectAll('path').remove();
    }

    for(let i = 0; i < fullLayout.selections.length; i++) {
        drawOne(gd, i);
    }
}

function couldHaveActiveSelection(gd: GraphDiv) {
    return gd._context.editSelection;
}

function drawOne(gd: GraphDiv, index: any) {
    // remove the existing selection if there is one.
    // because indices can change, we need to look in all selection layers
    gd._fullLayout._paperdiv
        .selectAll('.selectionlayer [data-index="' + index + '"]')
        .remove();

    const o = helpers.makeSelectionsOptionsAndPlotinfo(gd, index);
    const options = o.options;
    const plotinfo = o.plotinfo;

    // this selection is gone - quit now after deleting it
    // TODO: use d3 idioms instead of deleting and redrawing every time
    if(!options._input) return;

    drawSelection(gd._fullLayout._selectionLayer);

    function drawSelection(selectionLayer: any) {
        const d = getPathString(gd, options);
        const attrs = {
            'data-index': index,
            'fill-rule': 'evenodd',
            d: d
        };

        let opacity = options.opacity;
        let fillColor = 'rgba(0,0,0,0)';
        const lineColor = options.line.color || Color.contrast(gd._fullLayout.plot_bgcolor);
        let lineWidth = options.line.width;
        let lineDash = options.line.dash;
        if(!lineWidth) {
            // ensure invisible border to activate the selection
            lineWidth = 5;
            lineDash = 'solid';
        }

        const isActiveSelection = couldHaveActiveSelection(gd) &&
            gd._fullLayout._activeSelectionIndex === index;

        if(isActiveSelection) {
            fillColor = gd._fullLayout.activeselection.fillcolor;
            opacity = gd._fullLayout.activeselection.opacity;
        }

        const allPaths = [];
        for(let sensory = 1; sensory >= 0; sensory--) {
            const path = selectionLayer.append('path')
                .attr(attrs)
                .style('opacity', sensory ? 0.1 : opacity)
                .call(Color.stroke, lineColor)
                .call(Color.fill, fillColor)
                // make it easier to select senory background path
                .call(dashLine,
                    sensory ? 'solid' : lineDash,
                    sensory ? 4 + lineWidth : lineWidth
                );

            setClipPath(path, gd, options);

            if(isActiveSelection) {
                const editHelpers = arrayEditor(gd.layout, 'selections', options);

                path.style({
                    cursor: 'move',
                });

                const dragOptions = {
                    element: path.node(),
                    plotinfo: plotinfo,
                    gd: gd,
                    editHelpers: editHelpers,
                    isActiveSelection: true // i.e. to enable controllers
                };

                const polygons = readPaths(d, gd);
                // display polygons on the screen
                displayOutlines(polygons, path, dragOptions);
            } else {
                path.style('pointer-events', sensory ? 'all' : 'none');
            }

            allPaths[sensory] = path;
        }

        const forePath = allPaths[0];
        const backPath = allPaths[1];

        backPath.node().addEventListener('click', function() { return activateSelection(gd, forePath); });
    }
}

function setClipPath(selectionPath: any, gd: GraphDiv, selectionOptions: any) {
    const clipAxes = selectionOptions.xref + selectionOptions.yref;

    setClipUrl(
        selectionPath,
        'clip' + gd._fullLayout._uid + clipAxes,
        gd
    );
}

function activateSelection(gd: GraphDiv, path: any) {
    if(!couldHaveActiveSelection(gd)) return;

    const element = path.node();
    const id = +element.getAttribute('data-index');
    if(id >= 0) {
        // deactivate if already active
        if(id === gd._fullLayout._activeSelectionIndex) {
            deactivateSelection(gd);
            return;
        }

        gd._fullLayout._activeSelectionIndex = id;
        gd._fullLayout._deactivateSelection = deactivateSelection;
        draw(gd);
    }
}

function activateLastSelection(gd: GraphDiv) {
    if(!couldHaveActiveSelection(gd)) return;

    const id = gd._fullLayout.selections.length - 1;
    gd._fullLayout._activeSelectionIndex = id;
    gd._fullLayout._deactivateSelection = deactivateSelection;
    draw(gd);
}

function deactivateSelection(gd: GraphDiv) {
    if(!couldHaveActiveSelection(gd)) return;

    const id = gd._fullLayout._activeSelectionIndex;
    if(id >= 0) {
        clearOutlineControllers(gd);
        delete gd._fullLayout._activeSelectionIndex;
        draw(gd);
    }
}
