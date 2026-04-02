import dragHelpers from '../../dragelement/helpers.js';
import handleOutline from '../../shapes/handle_outline.js';
import helpers from '../../shapes/draw_newshape/helpers.js';
const selectMode = dragHelpers.selectMode;

const clearOutline = handleOutline.clearOutline;

const readPaths = helpers.readPaths;
const writePaths = helpers.writePaths;
const fixDatesForPaths = helpers.fixDatesForPaths;

export default function newSelections(outlines: any, dragOptions: any) {
    if(!outlines.length) return;
    const e = outlines[0][0]; // pick first
    if(!e) return;
    const d = e.getAttribute('d');

    const gd = dragOptions.gd;
    const newStyle = gd._fullLayout.newselection;

    const plotinfo = dragOptions.plotinfo;
    const xaxis = plotinfo.xaxis;
    const yaxis = plotinfo.yaxis;

    const isActiveSelection = dragOptions.isActiveSelection;
    let dragmode = dragOptions.dragmode;

    const selections = (gd.layout || {}).selections || [];

    if(!selectMode(dragmode) && isActiveSelection !== undefined) {
        const id = gd._fullLayout._activeSelectionIndex;
        if(id < selections.length) {
            switch(gd._fullLayout.selections[id].type) {
                case 'rect':
                    dragmode = 'select';
                    break;
                case 'path':
                    dragmode = 'lasso';
                    break;
            }
        }
    }

    const polygons = readPaths(d, gd, plotinfo, isActiveSelection);

    const newSelection: any = {
        xref: xaxis._id,
        yref: yaxis._id,

        opacity: newStyle.opacity,
        line: {
            color: newStyle.line.color,
            width: newStyle.line.width,
            dash: newStyle.line.dash
        }
    };

    let cell;
    // rect can be in one cell
    // only define cell if there is single cell
    if(polygons.length === 1) cell = polygons[0];

    if(
        cell &&
        cell.length === 5 && // ensure we only have 4 corners for a rect
        dragmode === 'select'
    ) {
        newSelection.type = 'rect';
        newSelection.x0 = cell[0][1];
        newSelection.y0 = cell[0][2];
        newSelection.x1 = cell[2][1];
        newSelection.y1 = cell[2][2];
    } else {
        newSelection.type = 'path';
        if(xaxis && yaxis) fixDatesForPaths(polygons, xaxis, yaxis);
        newSelection.path = writePaths(polygons);
        cell = null;
    }

    clearOutline(gd);

    const editHelpers = dragOptions.editHelpers;
    const modifyItem = (editHelpers || {}).modifyItem;

    const allSelections: any[] = [];
    for(let q = 0; q < selections.length; q++) {
        const beforeEdit = gd._fullLayout.selections[q];
        if(!beforeEdit) {
            allSelections[q] = beforeEdit;
            continue;
        }

        allSelections[q] = beforeEdit._input;

        if(
            isActiveSelection !== undefined &&
            q === gd._fullLayout._activeSelectionIndex
        ) {
            const afterEdit = newSelection;

            switch(beforeEdit.type) {
                case 'rect':
                    modifyItem('x0', afterEdit.x0);
                    modifyItem('x1', afterEdit.x1);
                    modifyItem('y0', afterEdit.y0);
                    modifyItem('y1', afterEdit.y1);
                    break;

                case 'path':
                    modifyItem('path', afterEdit.path);
                    break;
            }
        }
    }

    if(isActiveSelection === undefined) {
        allSelections.push(newSelection); // add new selection
        return allSelections;
    }

    return editHelpers ? editHelpers.getUpdateObj() : {};
}
