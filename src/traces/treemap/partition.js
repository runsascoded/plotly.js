'use strict';

var d3Hierarchy = require('d3-hierarchy');
var flipTree = require('./flip_tree');

module.exports = function partition(entry, size, opts) {
    var flipX = opts.flipX;
    var flipY = opts.flipY;
    // For squarify, transpose is handled via a custom tiling function that
    // inverts the row direction decision. The swapXY coordinate approach
    // doesn't work for squarify because the algorithm's aspect-ratio-based
    // decisions cancel out perfectly when coordinates are swapped back.
    var swapXY = opts.packing === 'dice-slice' ||
        (opts.transpose && opts.packing !== 'squarify');

    var top = opts.pad[flipY ? 'bottom' : 'top'];
    var left = opts.pad[flipX ? 'right' : 'left'];
    var right = opts.pad[flipX ? 'left' : 'right'];
    var bottom = opts.pad[flipY ? 'top' : 'bottom'];

    var tmp;
    if(swapXY) {
        tmp = left;
        left = top;
        top = tmp;

        tmp = right;
        right = bottom;
        bottom = tmp;
    }

    var result = d3Hierarchy
        .treemap()
        .tile(getTilingMethod(opts.packing, opts.squarifyratio, opts.transpose))
        .paddingInner(opts.pad.inner)
        .paddingLeft(left)
        .paddingRight(right)
        .paddingTop(top)
        .paddingBottom(bottom)
        .size(
            swapXY ? [size[1], size[0]] : size
        )(entry);

    if(swapXY || flipX || flipY) {
        flipTree(result, size, {
            swapXY: swapXY,
            flipX: flipX,
            flipY: flipY
        });
    }
    return result;
};

function getTilingMethod(key, squarifyratio, transpose) {
    switch(key) {
        case 'squarify':
            if(transpose) {
                return transposedSquarify(squarifyratio);
            }
            return d3Hierarchy.treemapSquarify.ratio(squarifyratio);
        case 'binary':
            return d3Hierarchy.treemapBinary;
        case 'dice':
            return d3Hierarchy.treemapDice;
        case 'slice':
            return d3Hierarchy.treemapSlice;
        default: // i.e. 'slice-dice' | 'dice-slice'
            return d3Hierarchy.treemapSliceDice;
    }
}

// Custom squarify that inverts the row direction decision.
// Normal squarify uses `dice: dx < dy` (horizontal strips for tall rectangles).
// Transposed squarify uses `dice: dx >= dy` (horizontal strips for wide rectangles).
function transposedSquarifyRatio(ratio, parent, x0, y0, x1, y1) {
    var nodes = parent.children;
    var nodeValue;
    var i0 = 0;
    var i1 = 0;
    var n = nodes.length;
    var dx;
    var dy;
    var value = parent.value;
    var sumValue;
    var minValue;
    var maxValue;
    var newRatio;
    var minRatio;
    var alpha;
    var beta;
    var row;

    while(i0 < n) {
        dx = x1 - x0;
        dy = y1 - y0;

        do { sumValue = nodes[i1++].value; } while(!sumValue && i1 < n);
        minValue = maxValue = sumValue;
        // Use min instead of max so grouping optimizes for the transposed
        // strip direction (e.g. horizontal strips on a landscape rectangle
        // pack more items per row, maintaining good aspect ratios)
        alpha = Math.min(dy / dx, dx / dy) / (value * ratio);
        beta = sumValue * sumValue * alpha;
        minRatio = Math.max(maxValue / beta, beta / minValue);

        for(; i1 < n; ++i1) {
            sumValue += nodeValue = nodes[i1].value;
            if(nodeValue < minValue) minValue = nodeValue;
            if(nodeValue > maxValue) maxValue = nodeValue;
            beta = sumValue * sumValue * alpha;
            newRatio = Math.max(maxValue / beta, beta / minValue);
            if(newRatio > minRatio) { sumValue -= nodeValue; break; }
            minRatio = newRatio;
        }

        // Inverted dice decision: dx >= dy instead of dx < dy
        row = {value: sumValue, dice: dx >= dy, children: nodes.slice(i0, i1)};
        if(row.dice) d3Hierarchy.treemapDice(row, x0, y0, x1, value ? y0 += dy * sumValue / value : y1);
        else d3Hierarchy.treemapSlice(row, x0, y0, value ? x0 += dx * sumValue / value : x1, y1);
        value -= sumValue;
        i0 = i1;
    }
}

function transposedSquarify(squarifyratio) {
    function squarify(parent, x0, y0, x1, y1) {
        transposedSquarifyRatio(squarifyratio, parent, x0, y0, x1, y1);
    }
    return squarify;
}
