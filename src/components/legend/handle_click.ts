import type { GraphDiv } from '../../../types/core';
import Registry from '../../registry.js';
import { _, notifier, pushUnique } from '../../lib/index.js';

let SHOWISOLATETIP = true;

export default function handleClick(g: any, gd: GraphDiv, numClicks: number): any {
    const fullLayout = gd._fullLayout;

    if(gd._dragged || gd._editing) return;

    const itemClick = fullLayout.legend!.itemclick;
    const itemDoubleClick = fullLayout.legend!.itemdoubleclick;
    const groupClick = fullLayout.legend!.groupclick;

    if(numClicks === 1 && itemClick === 'toggle' && itemDoubleClick === 'toggleothers' &&
        SHOWISOLATETIP && gd.data && gd._context.showTips
    ) {
        notifier(_(gd, 'Double-click on legend to isolate one trace'), 'long');
        SHOWISOLATETIP = false;
    } else {
        SHOWISOLATETIP = false;
    }

    let mode: any;
    if(numClicks === 1) mode = itemClick;
    else if(numClicks === 2) mode = itemDoubleClick;
    if(!mode) return;

    const toggleGroup = groupClick === 'togglegroup';

    const hiddenSlices = fullLayout.hiddenlabels ?
        fullLayout.hiddenlabels.slice() :
        [];

    const legendItem = g.data()[0][0];
    if(legendItem.groupTitle && legendItem.noClick) return;

    const fullData = gd._fullData;
    const shapesWithLegend = (fullLayout.shapes || []).filter(function(d: any) { return d.showlegend; });
    const allLegendItems = fullData.concat(shapesWithLegend);

    let fullTrace = legendItem.trace;
    if(fullTrace._isShape) {
        fullTrace = fullTrace._fullInput;
    }

    const legendgroup = fullTrace.legendgroup;

    let i: number, j: number, kcont: any, key: string, keys: string[], val: any;
    const dataUpdate: any = {};
    const dataIndices: number[] = [];
    const carrs: any[] = [];
    const carrIdx: number[] = [];

    function insertDataUpdate(traceIndex: number, value: any): number {
        let attrIndex = dataIndices.indexOf(traceIndex);
        let valueArray = dataUpdate.visible;
        if(!valueArray) {
            valueArray = dataUpdate.visible = [];
        }

        if(dataIndices.indexOf(traceIndex) === -1) {
            dataIndices.push(traceIndex);
            attrIndex = dataIndices.length - 1;
        }

        valueArray[attrIndex] = value;

        return attrIndex;
    }

    const updatedShapes = (fullLayout.shapes || []).map(function(d: any) {
        return d._input;
    });

    let shapesUpdated = false;

    function insertShapesUpdate(shapeIndex: number, value: any): void {
        updatedShapes[shapeIndex].visible = value;
        shapesUpdated = true;
    }

    function setVisibility(fullTrace: any, visibility: any): void {
        if(legendItem.groupTitle && !toggleGroup) return;

        const fullInput = fullTrace._fullInput || fullTrace;
        const isShape = fullInput._isShape;
        let index = fullInput.index;
        if(index === undefined) index = fullInput._index;

        // false -> false (not possible since will not be visible in legend)
        // true -> legendonly
        // legendonly -> true
        const nextVisibility = fullInput.visible === false ? false : visibility;

        if(isShape) {
            insertShapesUpdate(index, nextVisibility);
        } else {
            insertDataUpdate(index, nextVisibility);
        }
    }

    const thisLegend = fullTrace.legend;

    const fullInput = fullTrace._fullInput;
    const isShape = fullInput && fullInput._isShape;

    if(!isShape && Registry.traceIs(fullTrace, 'pie-like')) {
        const thisLabel = legendItem.label;
        const thisLabelIndex = hiddenSlices.indexOf(thisLabel);

        if(mode === 'toggle') {
            if(thisLabelIndex === -1) hiddenSlices.push(thisLabel);
            else hiddenSlices.splice(thisLabelIndex, 1);
        } else if(mode === 'toggleothers') {
            let changed = thisLabelIndex !== -1;
            const unhideList: any[] = [];
            for(i = 0; i < gd.calcdata.length; i++) {
                const cdi = gd.calcdata[i];
                for(j = 0; j < cdi.length; j++) {
                    const d = cdi[j];
                    const dLabel = d.label;

                    // ensure we toggle slices that are in this legend)
                    if(thisLegend === cdi[0].trace.legend) {
                        if(thisLabel !== dLabel) {
                            if(hiddenSlices.indexOf(dLabel) === -1) changed = true;
                            pushUnique(hiddenSlices, dLabel);
                            unhideList.push(dLabel);
                        }
                    }
                }
            }

            if(!changed) {
                for(let q = 0; q < unhideList.length; q++) {
                    const pos = hiddenSlices.indexOf(unhideList[q]);
                    if(pos !== -1) {
                        hiddenSlices.splice(pos, 1);
                    }
                }
            }
        }

        Registry.call('_guiRelayout', gd, 'hiddenlabels', hiddenSlices);
    } else {
        const hasLegendgroup = legendgroup && legendgroup.length;
        const traceIndicesInGroup: number[] = [];
        let tracei: any;
        if(hasLegendgroup) {
            for(i = 0; i < allLegendItems.length; i++) {
                tracei = allLegendItems[i];
                if(!tracei.visible) continue;
                if(tracei.legendgroup === legendgroup) {
                    traceIndicesInGroup.push(i);
                }
            }
        }

        if(mode === 'toggle') {
            let nextVisibility: any;

            switch(fullTrace.visible) {
                case true:
                    nextVisibility = 'legendonly';
                    break;
                case false:
                    nextVisibility = false;
                    break;
                case 'legendonly':
                    nextVisibility = true;
                    break;
            }

            if(hasLegendgroup) {
                if(toggleGroup) {
                    for(i = 0; i < allLegendItems.length; i++) {
                        const item = allLegendItems[i];
                        if(item.visible !== false && item.legendgroup === legendgroup) {
                            setVisibility(item, nextVisibility);
                        }
                    }
                } else {
                    setVisibility(fullTrace, nextVisibility);
                }
            } else {
                setVisibility(fullTrace, nextVisibility);
            }
        } else if(mode === 'toggleothers') {
            // Compute the clicked index. expandedIndex does what we want for expanded traces
            // but also culls hidden traces. That means we have some work to do.
            let isClicked: boolean, isInGroup: boolean, notInLegend: boolean, otherState: any, _item: any;
            let isIsolated = true;
            for(i = 0; i < allLegendItems.length; i++) {
                _item = allLegendItems[i];
                isClicked = _item === fullTrace;
                notInLegend = _item.showlegend !== true;
                if(isClicked || notInLegend) continue;

                isInGroup = (hasLegendgroup && _item.legendgroup === legendgroup);

                if(!isInGroup && _item.legend === thisLegend && _item.visible === true && !Registry.traceIs(_item, 'notLegendIsolatable')) {
                    isIsolated = false;
                    break;
                }
            }

            for(i = 0; i < allLegendItems.length; i++) {
                _item = allLegendItems[i];

                // False is sticky; we don't change it. Also ensure we don't change states of itmes in other legend
                if(_item.visible === false || _item.legend !== thisLegend) continue;

                if(Registry.traceIs(_item, 'notLegendIsolatable')) {
                    continue;
                }

                switch(fullTrace.visible) {
                    case 'legendonly':
                        setVisibility(_item, true);
                        break;
                    case true:
                        otherState = isIsolated ? true : 'legendonly';
                        isClicked = _item === fullTrace;
                        // N.B. consider traces that have a set legendgroup as toggleable
                        notInLegend = (_item.showlegend !== true && !_item.legendgroup);
                        isInGroup = isClicked || (hasLegendgroup && _item.legendgroup === legendgroup);
                        setVisibility(_item, (isInGroup || notInLegend) ? true : otherState);
                        break;
                }
            }
        }

        for(i = 0; i < carrs.length; i++) {
            kcont = carrs[i];
            if(!kcont) continue;
            const update = kcont.constructUpdate();

            const updateKeys = Object.keys(update);
            for(j = 0; j < updateKeys.length; j++) {
                key = updateKeys[j];
                val = dataUpdate[key] = dataUpdate[key] || [];
                val[carrIdx[i]] = update[key];
            }
        }

        // The length of the value arrays should be equal and any unspecified
        // values should be explicitly undefined for them to get properly culled
        // as updates and not accidentally reset to the default value. This fills
        // out sparse arrays with the required number of undefined values:
        keys = Object.keys(dataUpdate);
        for(i = 0; i < keys.length; i++) {
            key = keys[i];
            for(j = 0; j < dataIndices.length; j++) {
                // Use hasOwnProperty to protect against falsy values:
                if(!dataUpdate[key].hasOwnProperty(j)) {
                    dataUpdate[key][j] = undefined;
                }
            }
        }

        if(shapesUpdated) {
            Registry.call('_guiUpdate', gd, dataUpdate, {shapes: updatedShapes}, dataIndices);
        } else {
            Registry.call('_guiRestyle', gd, dataUpdate, dataIndices);
        }
    }
}
