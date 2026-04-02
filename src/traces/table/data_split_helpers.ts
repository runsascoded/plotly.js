import { extendFlat } from '../../lib/extend.js';

export const splitToPanels = function(d: any) {
    const prevPages = [0, 0];
    const headerPanel = extendFlat({}, d, {
        key: 'header',
        type: 'header',
        page: 0,
        prevPages: prevPages,
        currentRepaint: [null, null],
        dragHandle: true,
        values: d.calcdata.headerCells.values[d.specIndex],
        rowBlocks: d.calcdata.headerRowBlocks,
        calcdata: extendFlat({}, d.calcdata, {cells: d.calcdata.headerCells})
    });
    const revolverPanel1 = extendFlat({}, d, {
        key: 'cells1',
        type: 'cells',
        page: 0,
        prevPages: prevPages,
        currentRepaint: [null, null],
        dragHandle: false,
        values: d.calcdata.cells.values[d.specIndex],
        rowBlocks: d.calcdata.rowBlocks
    });
    const revolverPanel2 = extendFlat({}, d, {
        key: 'cells2',
        type: 'cells',
        page: 1,
        prevPages: prevPages,
        currentRepaint: [null, null],
        dragHandle: false,
        values: d.calcdata.cells.values[d.specIndex],
        rowBlocks: d.calcdata.rowBlocks
    });
    // order due to SVG using painter's algo:
    return [revolverPanel1, revolverPanel2, headerPanel];
};

export const splitToCells = function(d: any) {
    const fromTo = rowFromTo(d);
    return (d.values || []).slice(fromTo[0], fromTo[1]).map(function(v: any, i: any) {
        // By keeping identical key, a DOM node removal, creation and addition is spared, important when visible
        // grid has a lot of elements (quadratic with xcol/ycol count).
        // But it has to be busted when `svgUtil.convertToTspans` is used as it reshapes cell subtrees asynchronously,
        // and by that time the user may have scrolled away, resulting in stale overwrites. The real solution will be
        // to turn `svgUtil.convertToTspans` into a cancelable request, in which case no key busting is needed.
        const buster = (typeof v === 'string') && v.match(/[<$&> ]/) ? '_keybuster_' + Math.random() : '';
        return {
            // keyWithinBlock: /*fromTo[0] + */i, // optimized future version - no busting
            // keyWithinBlock: fromTo[0] + i, // initial always-unoptimized version - janky scrolling with 5+ columns
            keyWithinBlock: i + buster, // current compromise: regular content is very fast; async content is possible
            key: fromTo[0] + i,
            column: d,
            calcdata: d.calcdata,
            page: d.page,
            rowBlocks: d.rowBlocks,
            value: v
        };
    });
};

function rowFromTo(d: any) {
    const rowBlock = d.rowBlocks[d.page];
    // fixme rowBlock truthiness check is due to ugly hack of placing 2nd panel as d.page = -1
    const rowFrom = rowBlock ? rowBlock.rows[0].rowIndex : 0;
    const rowTo = rowBlock ? rowFrom + rowBlock.rows.length : 0;
    return [rowFrom, rowTo];
}

export default { splitToPanels, splitToCells };
