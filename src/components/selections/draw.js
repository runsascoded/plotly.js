import { readPaths } from '../shapes/draw_newshape/helpers.js';
import displayOutlines from '../shapes/display_outlines.js';
import _handle_outline from '../shapes/handle_outline.js';
const { clearOutlineControllers } = _handle_outline;
import Color from '../color/index.js';
import Drawing from '../drawing/index.js';
import { arrayEditor } from '../../plot_api/plot_template.js';
import helpers from '../shapes/helpers.js';
var getPathString = helpers.getPathString;

export default {
    draw: draw,
    drawOne: drawOne,
    activateLastSelection: activateLastSelection
};

function draw(gd) {
    var fullLayout = gd._fullLayout;

    clearOutlineControllers(gd);

    // Remove previous selections before drawing new selections in fullLayout.selections
    fullLayout._selectionLayer.selectAll('path').remove();

    for(var k in fullLayout._plots) {
        var selectionLayer = fullLayout._plots[k].selectionLayer;
        if(selectionLayer) selectionLayer.selectAll('path').remove();
    }

    for(var i = 0; i < fullLayout.selections.length; i++) {
        drawOne(gd, i);
    }
}

function couldHaveActiveSelection(gd) {
    return gd._context.editSelection;
}

function drawOne(gd, index) {
    // remove the existing selection if there is one.
    // because indices can change, we need to look in all selection layers
    gd._fullLayout._paperdiv
        .selectAll('.selectionlayer [data-index="' + index + '"]')
        .remove();

    var o = helpers.makeSelectionsOptionsAndPlotinfo(gd, index);
    var options = o.options;
    var plotinfo = o.plotinfo;

    // this selection is gone - quit now after deleting it
    // TODO: use d3 idioms instead of deleting and redrawing every time
    if(!options._input) return;

    drawSelection(gd._fullLayout._selectionLayer);

    function drawSelection(selectionLayer) {
        var d = getPathString(gd, options);
        var attrs = {
            'data-index': index,
            'fill-rule': 'evenodd',
            d: d
        };

        var opacity = options.opacity;
        var fillColor = 'rgba(0,0,0,0)';
        var lineColor = options.line.color || Color.contrast(gd._fullLayout.plot_bgcolor);
        var lineWidth = options.line.width;
        var lineDash = options.line.dash;
        if(!lineWidth) {
            // ensure invisible border to activate the selection
            lineWidth = 5;
            lineDash = 'solid';
        }

        var isActiveSelection = couldHaveActiveSelection(gd) &&
            gd._fullLayout._activeSelectionIndex === index;

        if(isActiveSelection) {
            fillColor = gd._fullLayout.activeselection.fillcolor;
            opacity = gd._fullLayout.activeselection.opacity;
        }

        var allPaths = [];
        for(var sensory = 1; sensory >= 0; sensory--) {
            var path = selectionLayer.append('path')
                .attr(attrs)
                .style('opacity', sensory ? 0.1 : opacity)
                .call(Color.stroke, lineColor)
                .call(Color.fill, fillColor)
                // make it easier to select senory background path
                .call(Drawing.dashLine,
                    sensory ? 'solid' : lineDash,
                    sensory ? 4 + lineWidth : lineWidth
                );

            setClipPath(path, gd, options);

            if(isActiveSelection) {
                var editHelpers = arrayEditor(gd.layout, 'selections', options);

                path.style({
                    cursor: 'move',
                });

                var dragOptions = {
                    element: path.node(),
                    plotinfo: plotinfo,
                    gd: gd,
                    editHelpers: editHelpers,
                    isActiveSelection: true // i.e. to enable controllers
                };

                var polygons = readPaths(d, gd);
                // display polygons on the screen
                displayOutlines(polygons, path, dragOptions);
            } else {
                path.style('pointer-events', sensory ? 'all' : 'none');
            }

            allPaths[sensory] = path;
        }

        var forePath = allPaths[0];
        var backPath = allPaths[1];

        backPath.node().addEventListener('click', function() { return activateSelection(gd, forePath); });
    }
}

function setClipPath(selectionPath, gd, selectionOptions) {
    var clipAxes = selectionOptions.xref + selectionOptions.yref;

    Drawing.setClipUrl(
        selectionPath,
        'clip' + gd._fullLayout._uid + clipAxes,
        gd
    );
}

function activateSelection(gd, path) {
    if(!couldHaveActiveSelection(gd)) return;

    var element = path.node();
    var id = +element.getAttribute('data-index');
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

function activateLastSelection(gd) {
    if(!couldHaveActiveSelection(gd)) return;

    var id = gd._fullLayout.selections.length - 1;
    gd._fullLayout._activeSelectionIndex = id;
    gd._fullLayout._deactivateSelection = deactivateSelection;
    draw(gd);
}

function deactivateSelection(gd) {
    if(!couldHaveActiveSelection(gd)) return;

    var id = gd._fullLayout._activeSelectionIndex;
    if(id >= 0) {
        clearOutlineControllers(gd);
        delete gd._fullLayout._activeSelectionIndex;
        draw(gd);
    }
}
