import * as d3Hierarchy from 'd3-hierarchy';
import flipTree from '../treemap/flip_tree.js';

export default function partition(entry: any, size: number[], opts: any) {
    var flipX = opts.flipX;
    var flipY = opts.flipY;
    var swapXY = opts.orientation === 'h';
    var maxDepth = opts.maxDepth;

    var newWidth = size[0];
    var newHeight = size[1];
    if(maxDepth) {
        newWidth = (entry.height + 1) * size[0] / Math.min(entry.height + 1, maxDepth);
        newHeight = (entry.height + 1) * size[1] / Math.min(entry.height + 1, maxDepth);
    }

    var result = d3Hierarchy
        .partition()
        .padding(opts.pad.inner)
        .size(
            swapXY ? [size[1], newWidth] : [size[0], newHeight]
        )(entry);

    if(swapXY || flipX || flipY) {
        flipTree(result, size, {
            swapXY: swapXY,
            flipX: flipX,
            flipY: flipY
        });
    }
    return result;
}
