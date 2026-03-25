import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import setCursor from '../../lib/setcursor.js';
import pieHelpers from '../pie/helpers.js';

export var findEntryWithLevel = function(hierarchy, level) {
    var out;
    if(level) {
        hierarchy.eachAfter(function(pt) {
            if(getPtId(pt) === level) {
                return out = pt.copy();
            }
        });
    }
    return out || hierarchy;
};

export var findEntryWithChild = function(hierarchy, childId) {
    var out;
    hierarchy.eachAfter(function(pt) {
        var children = pt.children || [];
        for(var i = 0; i < children.length; i++) {
            var child = children[i];
            if(getPtId(child) === childId) {
                return out = pt.copy();
            }
        }
    });
    return out || hierarchy;
};

export var isEntry = function(pt) {
    return !pt.parent;
};

export var isLeaf = function(pt) {
    return !pt.children;
};

export var getPtId = function(pt) {
    return pt.data.data.id;
};

export var getPtLabel = function(pt) {
    return pt.data.data.label;
};

export var getValue = function(d) {
    return d.value;
};

export var isHierarchyRoot = function(pt) {
    return getParentId(pt) === '';
};

export var setSliceCursor = function(sliceTop, gd, opts) {
    var hide = opts.isTransitioning;
    if(!hide) {
        var pt = sliceTop.datum();
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
    var onPathbar = (opts || {}).onPathbar;

    var cdi = pt.data.data;
    var ptNumber = cdi.i;

    var customColor = Lib.castOption(trace, ptNumber,
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

export var getInsideTextFontKey = function(keyStr, trace, pt, layoutFont, opts) {
    var onPathbar = (opts || {}).onPathbar;
    var cont = onPathbar ? 'pathbar.textfont' : 'insidetextfont';
    var ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, cont + '.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
};

export var getOutsideTextFontKey = function(keyStr, trace, pt, layoutFont) {
    var ptNumber = pt.data.data.i;

    return (
        Lib.castOption(trace, ptNumber, 'outsidetextfont.' + keyStr) ||
        Lib.castOption(trace, ptNumber, 'textfont.' + keyStr) ||
        layoutFont.size
    );
};

export var isOutsideText = function(trace, pt) {
    return !trace._hasColorscale && isHierarchyRoot(pt);
};

export var determineTextFont = function(trace, pt, layoutFont, opts) {
    return isOutsideText(trace, pt) ?
        determineOutsideTextFont(trace, pt, layoutFont) :
        determineInsideTextFont(trace, pt, layoutFont, opts);
};

export var hasTransition = function(transitionOpts) {
    // We could optimize hasTransition per trace,
    // as sunburst, treemap & icicle have no cross-trace logic!
    return !!(transitionOpts && transitionOpts.duration > 0);
};

export var getMaxDepth = function(trace) {
    return trace.maxdepth >= 0 ? trace.maxdepth : Infinity;
};

export var isHeader = function(pt, trace) { // it is only used in treemap.
    return !(isLeaf(pt) || pt.depth === trace._maxDepth - 1);
};

function getParentId(pt) {
    return pt.data.data.pid;
}

export var getParent = function(hierarchy, pt) {
    return findEntryWithLevel(hierarchy, getParentId(pt));
};

export var listPath = function(d, keyStr) {
    var parent = d.parent;
    if(!parent) return [];
    var list = keyStr ? [parent.data[keyStr]] : [parent];
    return listPath(parent, keyStr).concat(list);
};

export var getPath = function(d) {
    return listPath(d, 'label').join('/') + '/';
};

export var formatValue = pieHelpers.formatPieValue;

export var formatPercent = function(v, separators) {
    var tx = Lib.formatPercent(v, 0); // use funnel(area) version
    if(tx === '0%') tx = pieHelpers.formatPiePercent(v, separators); // use pie version
    return tx;
};

export default { findEntryWithLevel, findEntryWithChild, isEntry, isLeaf, getPtId, getPtLabel, getValue, isHierarchyRoot, setSliceCursor, getInsideTextFontKey, getOutsideTextFontKey, isOutsideText, determineTextFont, hasTransition, getMaxDepth, isHeader, getParent, listPath, getPath, formatValue, formatPercent };
