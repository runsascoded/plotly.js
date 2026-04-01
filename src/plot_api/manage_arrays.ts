import isPlainObject from '../lib/is_plain_object.js';
import noop from '../lib/noop.js';
import Loggers from '../lib/loggers.js';
import { sorterAsc } from '../lib/search.js';
import Registry from '../registry.js';
import _req0 from './container_array_match.js';
export var containerArrayMatch = _req0;

export var isAddVal = function isAddVal(val?: any): any {
    return val === 'add' || isPlainObject(val);
};

export var isRemoveVal = function isRemoveVal(val?: any): boolean {
    return val === null || val === 'remove';
};

export var applyContainerArrayChanges = function applyContainerArrayChanges(gd?: any, np?: any, edits?: any, flags?: any, _nestedProperty?: any): boolean {
    var componentType = np.astr;
    var supplyComponentDefaults = Registry.getComponentMethod(componentType, 'supplyLayoutDefaults');
    var draw = Registry.getComponentMethod(componentType, 'draw');
    var drawOne = Registry.getComponentMethod(componentType, 'drawOne');
    var replotLater = flags.replot || flags.recalc || (supplyComponentDefaults === noop) || (draw === noop);
    var layout = gd.layout;
    var fullLayout = gd._fullLayout;

    if(edits['']) {
        if(Object.keys(edits).length > 1) {
            Loggers.warn('Full array edits are incompatible with other edits',
                componentType);
        }

        var fullVal = edits[''][''];

        if(isRemoveVal(fullVal)) np.set(null);
        else if(Array.isArray(fullVal)) np.set(fullVal);
        else {
            Loggers.warn('Unrecognized full array edit value', componentType, fullVal);
            return true;
        }

        if(replotLater) return false;

        supplyComponentDefaults(layout, fullLayout);
        draw(gd);
        return true;
    }

    var componentNums = Object.keys(edits).map(Number).sort(sorterAsc);
    var componentArrayIn = np.get();
    var componentArray = componentArrayIn || [];
    // componentArrayFull is used just to keep splices in line between
    // full and input arrays, so private keys can be copied over after
    // redoing supplyDefaults
    // TODO: this assumes componentArray is in gd.layout - which will not be
    // true after we extend this to restyle
    var componentArrayFull = _nestedProperty(fullLayout, componentType).get();

    var deletes = [];
    var firstIndexChange = -1;
    var maxIndex = componentArray.length;
    var i;
    var j;
    var componentNum;
    var objEdits;
    var objKeys;
    var objVal;
    var adding, prefix;

    // first make the add and edit changes
    for(i = 0; i < componentNums.length; i++) {
        componentNum = componentNums[i];
        objEdits = edits[componentNum];
        objKeys = Object.keys(objEdits);
        objVal = objEdits[''],
        adding = isAddVal(objVal);

        if(componentNum < 0 || componentNum > componentArray.length - (adding ? 0 : 1)) {
            Loggers.warn('index out of range', componentType, componentNum);
            continue;
        }

        if(objVal !== undefined) {
            if(objKeys.length > 1) {
                Loggers.warn(
                    'Insertion & removal are incompatible with edits to the same index.',
                    componentType, componentNum);
            }

            if(isRemoveVal(objVal)) {
                deletes.push(componentNum);
            } else if(adding) {
                if(objVal === 'add') objVal = {};
                componentArray.splice(componentNum, 0, objVal);
                if(componentArrayFull) componentArrayFull.splice(componentNum, 0, {});
            } else {
                Loggers.warn('Unrecognized full object edit value',
                    componentType, componentNum, objVal);
            }

            if(firstIndexChange === -1) firstIndexChange = componentNum;
        } else {
            for(j = 0; j < objKeys.length; j++) {
                prefix = componentType + '[' + componentNum + '].';
                _nestedProperty(componentArray[componentNum], objKeys[j], prefix)
                    .set(objEdits[objKeys[j]]);
            }
        }
    }

    // now do deletes
    for(i = deletes.length - 1; i >= 0; i--) {
        componentArray.splice(deletes[i], 1);
        // TODO: this drops private keys that had been stored in componentArrayFull
        // does this have any ill effects?
        if(componentArrayFull) componentArrayFull.splice(deletes[i], 1);
    }

    if(!componentArray.length) np.set(null);
    else if(!componentArrayIn) np.set(componentArray);

    if(replotLater) return false;

    supplyComponentDefaults(layout, fullLayout);

    // finally draw all the components we need to
    // if we added or removed any, redraw all after it
    if(drawOne !== noop) {
        var indicesToDraw;
        if(firstIndexChange === -1) {
            // there's no re-indexing to do, so only redraw components that changed
            indicesToDraw = componentNums;
        } else {
            // in case the component array was shortened, we still need do call
            // drawOne on the latter items so they get properly removed
            maxIndex = Math.max(componentArray.length, maxIndex);
            indicesToDraw = [];
            for(i = 0; i < componentNums.length; i++) {
                componentNum = componentNums[i];
                if(componentNum >= firstIndexChange) break;
                indicesToDraw.push(componentNum);
            }
            for(i = firstIndexChange; i < maxIndex; i++) {
                indicesToDraw.push(i);
            }
        }
        for(i = 0; i < indicesToDraw.length; i++) {
            drawOne(gd, indicesToDraw[i]);
        }
    } else draw(gd);

    return true;
};

export default { containerArrayMatch, isAddVal, isRemoveVal, applyContainerArrayChanges };
