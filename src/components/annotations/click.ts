import type { GraphDiv, FullAxis } from '../../../types/core';
import Lib from '../../lib/index.js';
import Registry from '../../registry.js';
import { arrayEditor } from '../../plot_api/plot_template.js';

export default {
    hasClickToShow: hasClickToShow,
    onClick: onClick
};

/*
 * hasClickToShow: does the given hoverData have ANY annotations which will
 * turn ON if we click here? (used by hover events to set cursor)
 *
 * gd: graphDiv
 * hoverData: a hoverData array, as included with the *plotly_hover* or
 *     *plotly_click* events in the `points` attribute
 *
 * returns: boolean
 */
function hasClickToShow(gd: GraphDiv, hoverData: any) {
    const sets = getToggleSets(gd, hoverData);
    return sets.on.length > 0 || sets.explicitOff.length > 0;
}

/*
 * onClick: perform the toggling (via Plotly.update) implied by clicking
 * at this hoverData
 *
 * gd: graphDiv
 * hoverData: a hoverData array, as included with the *plotly_hover* or
 *     *plotly_click* events in the `points` attribute
 *
 * returns: Promise that the update is complete
 */
function onClick(gd: GraphDiv, hoverData: any) {
    const toggleSets = getToggleSets(gd, hoverData);
    const onSet = toggleSets.on;
    const offSet = toggleSets.off.concat(toggleSets.explicitOff);
    const update: any = {};
    const annotationsOut = gd._fullLayout.annotations;
    let i, editHelpers;

    if(!(onSet.length || offSet.length)) return;

    for(i = 0; i < onSet.length; i++) {
        editHelpers = arrayEditor(gd.layout, 'annotations', annotationsOut[onSet[i]]);
        editHelpers.modifyItem('visible', true);
        Lib.extendFlat(update, editHelpers.getUpdateObj());
    }

    for(i = 0; i < offSet.length; i++) {
        editHelpers = arrayEditor(gd.layout, 'annotations', annotationsOut[offSet[i]]);
        editHelpers.modifyItem('visible', false);
        Lib.extendFlat(update, editHelpers.getUpdateObj());
    }

    return Registry.call('update', gd, {}, update);
}

/*
 * getToggleSets: find the annotations which will turn on or off at this
 * hoverData
 *
 * gd: graphDiv
 * hoverData: a hoverData array, as included with the *plotly_hover* or
 *     *plotly_click* events in the `points` attribute
 *
 * returns: {
 *   on: Array (indices of annotations to turn on),
 *   off: Array (indices to turn off because you're not hovering on them),
 *   explicitOff: Array (indices to turn off because you *are* hovering on them)
 * }
 */
function getToggleSets(gd: GraphDiv, hoverData: any) {
    const annotations = gd._fullLayout.annotations;
    const onSet = [];
    const offSet = [];
    const explicitOffSet = [];
    const hoverLen = (hoverData || []).length;

    let i, j, anni, showMode, pointj, xa, ya, toggleType;

    for(i = 0; i < annotations.length; i++) {
        anni = annotations[i];
        showMode = anni.clicktoshow;

        if(showMode) {
            for(j = 0; j < hoverLen; j++) {
                pointj = hoverData[j];
                xa = pointj.xaxis;
                ya = pointj.yaxis;

                if(xa._id === anni.xref &&
                    ya._id === anni.yref &&
                    xa.d2r(pointj.x) === clickData2r(anni._xclick, xa) &&
                    ya.d2r(pointj.y) === clickData2r(anni._yclick, ya)
                ) {
                    // match! toggle this annotation
                    // regardless of its clicktoshow mode
                    // but if it's onout mode, off is implicit
                    if(anni.visible) {
                        if(showMode === 'onout') toggleType = offSet;
                        else toggleType = explicitOffSet;
                    } else {
                        toggleType = onSet;
                    }
                    toggleType.push(i);
                    break;
                }
            }

            if(j === hoverLen) {
                // no match - only turn this annotation OFF, and only if
                // showmode is 'onout'
                if(anni.visible && showMode === 'onout') offSet.push(i);
            }
        }
    }

    return {on: onSet, off: offSet, explicitOff: explicitOffSet};
}

// to handle log axes until v3
function clickData2r(d: any, ax: FullAxis) {
    return ax.type === 'log' ? ax.l2r(d) : ax.d2r(d);
}
