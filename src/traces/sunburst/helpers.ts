import type { GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import setCursor from '../../lib/setcursor.js';
import pieHelpers from '../pie/helpers.js';

export const findEntryWithLevel = function(hierarchy, level) {
    let out;
    if(level) {
        hierarchy.eachAfter(function(pt) {
            if(getPtId(pt) === level) {
                return out = pt.copy();
            }
        });
    }
    return out || hierarchy;
};

export const findEntryWithChild = function(hierarchy, childId) {
    let out;
    hierarchy.eachAfter(function(pt) {
        const children = pt.children || [];
        for(let i = 0; i < children.length; i++) {
            const child = children[i];
            if(getPtId(child) === childId) {
                return out = pt.copy();
            }
        }
    });
    return out || hierarchy;
};

export const isEntry = function(pt) {
    return !pt.parent;
};

export const isLeaf = function(pt) {
    return !pt.children;
};

export const getPtId = function(pt) {
    return pt.data.data.id;
};

export const getPtLabel = function(pt) {
    return pt.data.data.label;
};

export const getValue = function(d) {
    return d.value;
};

export const isHierarchyRoot = function(pt) {
    return getParentId(pt) === '';
};

export const setSliceCursor = function(sliceTop, gd, opts) {
    let hide = opts.isTransitioning;
    if(!hide) {
        const pt = sliceTop.datum();
        hide = (
            (opts.hideOnRoot && isHierarchyRoot(pt)) ||
            (opts.hideOnLeaves && isLeaf(pt))
        );
    }
    setCursor(sliceTop, hide ? null : 'pointer');
};

function determineOutsideTextFont(trace, pt, layoutFont) {
    return {
        color: getOutsideTextFontKey('color', trace, pt, layoutFont),
        family: getOutsideTextFontKey('family', trace, pt, layoutFont),
        size: getOutsideTextFontKey('size', trace, pt, layoutFont),
        weight: getOutsideTextFontKey('weight', trace, pt, layoutFont),
        style: getOutsideTextFontKey('style', trace, pt, layoutFont),
        variant: getOutsideTextFontKey('variant', trace, pt, layoutFont),
        textcase: getOutsideTextFontKey('textcase', trace, pt, layoutFont),
        lineposition: getOutsideTextFontKey('lineposition', trace, pt, layoutFont),
        shadow: getOutsideTextFontKey('shadow', trace, pt, layoutFont),
    };
}

function determineInsideTextFont(trace, pt, layoutFont, opts) {
    const onPathbar = (opts || {}).onPathbar;

    const cdi = pt.data.data;
    const ptNumber = cdi.i;

    let customColor = Lib.castOption(trace, ptNumber,
        (onPathbar ? 'pathbar.textfont' : 'insidetextfont') + '.color'
    );

    if(!customColor && trace._input.textfont) {
        // Why not simply using trace.textfont? Because if not set, it
        // defaults to layout.font which has a default color. But if
        // textfont.color and insidetextfont.color don't supply a value,
        // a contrasting color shall be used.
        customColor = Lib.castOption(trace._input, ptNumber, 'textfont.color');
    }

    return {
        color: customColor || Color.contrast(cdi.color),
        family: getInsideTextFontKey('family', trace, pt, layoutFont, opts),
        size: getInsideTextFontKey('size', trace, pt, layoutFont, opts),
        weight: getInsideTextFontKey('weight', trace, pt, layoutFont, opts),
        style: getInsideTextFontKey('style', trace, pt, layoutFont, opts),
        variant: getInsideTextFontKey('variant', trace, pt, layoutFont, opts),
        textcase: getInsideTextFontKey('textcase', trace, pt, layoutFont, opts),
        lineposition: getInsideTextFontKey('lineposition', trace, pt, layoutFont, opts),
        shadow: getInsideTextFontKey('shadow', trace, pt, layoutFont, opts),
    };
}

export const getInsideTextFontKey = function(keyStr, trace, pt, layoutFont, opts) {
    const onPathbar = (opts || {}).onPathbar;
    const cont = onPathbar ? 'pathbar.textfont' : 'insidetextfont';
    const ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, cont + '.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
};

export const getOutsideTextFontKey = function(keyStr, trace, pt, layoutFont) {
    const ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, 'outsidetextfont.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
};

export const isOutsideText = function(trace, pt) {
    return !trace._hasColorscale && isHierarchyRoot(pt);
};

export const determineTextFont = function(trace, pt, layoutFont, opts) {
    return isOutsideText(trace, pt) ?
        determineOutsideTextFont(trace, pt, layoutFont) :
        determineInsideTextFont(trace, pt, layoutFont, opts);
};

export const hasTransition = function(transitionOpts) {
    // We could optimize hasTransition per trace,
    // as sunburst, treemap & icicle have no cross-trace logic!
    return !!(transitionOpts && transitionOpts.duration > 0);
};

export const getMaxDepth = function(trace) {
    return trace.maxdepth >= 0 ? trace.maxdepth : Infinity;
};

export const isHeader = function(pt, trace) { // it is only used in treemap.
    return !(isLeaf(pt) || pt.depth === trace._maxDepth - 1);
};

function getParentId(pt) {
    return pt.data.data.pid;
}

export const getParent = function(hierarchy, pt) {
    return findEntryWithLevel(hierarchy, getParentId(pt));
};

export const listPath = function(d, keyStr) {
    const parent = d.parent;
    if(!parent) return [];
    const list = keyStr ? [parent.data[keyStr]] : [parent];
    return listPath(parent, keyStr).concat(list);
};

export const getPath = function(d) {
    return listPath(d, 'label').join('/') + '/';
};

export const formatValue = pieHelpers.formatPieValue;

export const formatPercent = function(v, separators) {
    let tx = Lib.formatPercent(v, 0); // use funnel(area) version
    if(tx === '0%') tx = pieHelpers.formatPiePercent(v, separators); // use pie version
    return tx;
};

export default { findEntryWithLevel, findEntryWithChild, isEntry, isLeaf, getPtId, getPtLabel, getValue, isHierarchyRoot, setSliceCursor, getInsideTextFontKey, getOutsideTextFontKey, isOutsideText, determineTextFont, hasTransition, getMaxDepth, isHeader, getParent, listPath, getPath, formatValue, formatPercent };
