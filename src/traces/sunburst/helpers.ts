import type { GraphDiv } from '../../../types/core';
import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import setCursor from '../../lib/setcursor.js';
import pieHelpers from '../pie/helpers.js';

export function findEntryWithLevel(hierarchy: any, level: any) {
    let out;
    if(level) {
        hierarchy.eachAfter(function(pt: any) {
            if(getPtId(pt) === level) {
                return out = pt.copy();
            }
        });
    }
    return out || hierarchy;
}

export function findEntryWithChild(hierarchy: any, childId: any) {
    let out;
    hierarchy.eachAfter(function(pt: any) {
        const children = pt.children || [];
        for(let i = 0; i < children.length; i++) {
            const child = children[i];
            if(getPtId(child) === childId) {
                return out = pt.copy();
            }
        }
    });
    return out || hierarchy;
}

export function isEntry(pt: any) {
    return !pt.parent;
}

export function isLeaf(pt: any) {
    return !pt.children;
}

export function getPtId(pt: any) {
    return pt.data.data.id;
}

export function getPtLabel(pt: any) {
    return pt.data.data.label;
}

export function getValue(d: any) {
    return d.value;
}

export function isHierarchyRoot(pt: any) {
    return getParentId(pt) === '';
}

export function setSliceCursor(sliceTop: any, gd: any, opts: any) {
    let hide = opts.isTransitioning;
    if(!hide) {
        const pt = sliceTop.datum();
        hide = (
            (opts.hideOnRoot && isHierarchyRoot(pt)) ||
            (opts.hideOnLeaves && isLeaf(pt))
        );
    }
    setCursor(sliceTop, (hide ? null : 'pointer' as any));
}

function determineOutsideTextFont(trace: any, pt: any, layoutFont: any) {
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

function determineInsideTextFont(trace: any, pt: any, layoutFont: any, opts: any) {
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

export function getInsideTextFontKey(keyStr: any, trace: any, pt: any, layoutFont: any, opts: any) {
    const onPathbar = (opts || {}).onPathbar;
    const cont = onPathbar ? 'pathbar.textfont' : 'insidetextfont';
    const ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, cont + '.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
}

export function getOutsideTextFontKey(keyStr: any, trace: any, pt: any, layoutFont: any) {
    const ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, 'outsidetextfont.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
}

export function isOutsideText(trace: any, pt: any) {
    return !trace._hasColorscale && isHierarchyRoot(pt);
}

export function determineTextFont(trace: any, pt: any, layoutFont: any, opts: any) {
    return isOutsideText(trace, pt) ?
        determineOutsideTextFont(trace, pt, layoutFont) :
        determineInsideTextFont(trace, pt, layoutFont, opts);
}

export function hasTransition(transitionOpts: any) {
    // We could optimize hasTransition per trace,
    // as sunburst, treemap & icicle have no cross-trace logic!
    return !!(transitionOpts && transitionOpts.duration > 0);
}

export function getMaxDepth(trace: any) {
    return trace.maxdepth >= 0 ? trace.maxdepth : Infinity;
}

export function isHeader(pt: any, trace: any) { // it is only used in treemap.
    return !(isLeaf(pt) || pt.depth === trace._maxDepth - 1);
}

function getParentId(pt: any) {
    return pt.data.data.pid;
}

export function getParent(hierarchy: any, pt: any) {
    return findEntryWithLevel(hierarchy, getParentId(pt));
}

export function listPath(d: any, keyStr: any): any {
    const parent = d.parent;
    if(!parent) return [];
    const list = keyStr ? [parent.data[keyStr]] : [parent];
    return listPath(parent, keyStr).concat(list);
}

export function getPath(d: any) {
    return listPath(d, 'label').join('/') + '/';
}

export const formatValue = pieHelpers.formatPieValue;

export function formatPercent(v: any, separators: any) {
    let tx = Lib.formatPercent(v, 0); // use funnel(area) version
    if(tx === '0%') tx = pieHelpers.formatPiePercent(v, separators); // use pie version
    return tx;
}

export default { findEntryWithLevel, findEntryWithChild, isEntry, isLeaf, getPtId, getPtLabel, getValue, isHierarchyRoot, setSliceCursor, getInsideTextFontKey, getOutsideTextFontKey, isOutsideText, determineTextFont, hasTransition, getMaxDepth, isHeader, getParent, listPath, getPath, formatValue, formatPercent };
