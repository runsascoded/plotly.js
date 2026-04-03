import c from './constants.js';
import { extendFlat } from '../../lib/extend.js';
import isNumeric from 'fast-isnumeric';
import { isTypedArray } from '../../lib/array.js';
import { isArrayOrTypedArray } from '../../lib/array.js';
export default function calc(gd, trace) {
    const cellsValues = squareStringMatrix(trace.cells.values);
    const slicer = (a) => {
        return a.slice(trace.header.values.length, a.length);
    };
    let headerValuesIn = squareStringMatrix(trace.header.values);
    if (headerValuesIn.length && !headerValuesIn[0].length) {
        headerValuesIn[0] = [''];
        headerValuesIn = squareStringMatrix(headerValuesIn);
    }
    const headerValues = headerValuesIn
        .concat(slicer(cellsValues).map(() => emptyStrings((headerValuesIn[0] || ['']).length)));
    const domain = trace.domain;
    const groupWidth = Math.floor(gd._fullLayout._size.w * (domain.x[1] - domain.x[0]));
    const groupHeight = Math.floor(gd._fullLayout._size.h * (domain.y[1] - domain.y[0]));
    const headerRowHeights = trace.header.values.length ?
        headerValues[0].map(() => trace.header.height) :
        [c.emptyHeaderHeight];
    const rowHeights = cellsValues.length ? cellsValues[0].map(() => trace.cells.height) : [];
    const headerHeight = headerRowHeights.reduce(sum, 0);
    const scrollHeight = groupHeight - headerHeight;
    const minimumFillHeight = scrollHeight + c.uplift;
    const anchorToRowBlock = makeAnchorToRowBlock(rowHeights, minimumFillHeight);
    const anchorToHeaderRowBlock = makeAnchorToRowBlock(headerRowHeights, headerHeight);
    const headerRowBlocks = makeRowBlock(anchorToHeaderRowBlock, []);
    const rowBlocks = makeRowBlock(anchorToRowBlock, headerRowBlocks);
    const uniqueKeys = {};
    let columnOrder = trace._fullInput.columnorder;
    if (isArrayOrTypedArray(columnOrder))
        columnOrder = Array.from(columnOrder);
    columnOrder = columnOrder.concat(slicer(cellsValues.map((d, i) => i)));
    let columnWidths = headerValues.map((d, i) => {
        const value = isArrayOrTypedArray(trace.columnwidth) ?
            trace.columnwidth[Math.min(i, trace.columnwidth.length - 1)] :
            trace.columnwidth;
        return isNumeric(value) ? Number(value) : 1;
    });
    const totalColumnWidths = columnWidths.reduce(sum, 0);
    // fit columns in the available vertical space as there's no vertical scrolling now
    columnWidths = columnWidths.map((d) => d / totalColumnWidths * groupWidth);
    const maxLineWidth = Math.max(arrayMax(trace.header.line.width), arrayMax(trace.cells.line.width));
    const calcdata = {
        // include staticPlot in the key so if it changes we delete and redraw
        key: trace.uid + gd._context.staticPlot,
        translateX: domain.x[0] * gd._fullLayout._size.w,
        translateY: gd._fullLayout._size.h * (1 - domain.y[1]),
        size: gd._fullLayout._size,
        width: groupWidth,
        maxLineWidth: maxLineWidth,
        height: groupHeight,
        columnOrder: columnOrder, // will be mutated on column move, todo use in callback
        groupHeight: groupHeight,
        rowBlocks: rowBlocks,
        headerRowBlocks: headerRowBlocks,
        scrollY: 0, // will be mutated on scroll
        cells: extendFlat({}, trace.cells, { values: cellsValues }),
        headerCells: extendFlat({}, trace.header, { values: headerValues }),
        gdColumns: headerValues.map((d) => d[0]),
        gdColumnsOriginalOrder: headerValues.map((d) => d[0]),
        prevPages: [0, 0],
        scrollbarState: { scrollbarScrollInProgress: false },
        columns: headerValues.map((label, i) => {
            const foundKey = uniqueKeys[label];
            uniqueKeys[label] = (foundKey || 0) + 1;
            const key = label + '__' + uniqueKeys[label];
            return {
                key: key,
                label: label,
                specIndex: i,
                xIndex: columnOrder[i],
                xScale: xScale,
                x: undefined, // initialized below
                calcdata: undefined, // initialized below
                columnWidth: columnWidths[i]
            };
        })
    };
    calcdata.columns.forEach((col) => {
        col.calcdata = calcdata;
        col.x = xScale(col);
    });
    return calcdata;
}
function arrayMax(maybeArray) {
    if (isArrayOrTypedArray(maybeArray)) {
        let max = 0;
        for (let i = 0; i < maybeArray.length; i++) {
            max = Math.max(max, arrayMax(maybeArray[i]));
        }
        return max;
    }
    return maybeArray;
}
function sum(a, b) { return a + b; }
// fill matrix in place to equal lengths
// and ensure it's uniformly 2D
function squareStringMatrix(matrixIn) {
    const matrix = matrixIn.slice();
    let minLen = Infinity;
    let maxLen = 0;
    let i;
    for (i = 0; i < matrix.length; i++) {
        if (isTypedArray(matrix[i]))
            matrix[i] = Array.from(matrix[i]);
        else if (!isArrayOrTypedArray(matrix[i]))
            matrix[i] = [matrix[i]];
        minLen = Math.min(minLen, matrix[i].length);
        maxLen = Math.max(maxLen, matrix[i].length);
    }
    if (minLen !== maxLen) {
        for (i = 0; i < matrix.length; i++) {
            const padLen = maxLen - matrix[i].length;
            if (padLen)
                matrix[i] = matrix[i].concat(emptyStrings(padLen));
        }
    }
    return matrix;
}
function emptyStrings(len) {
    const padArray = new Array(len);
    for (let j = 0; j < len; j++)
        padArray[j] = '';
    return padArray;
}
function xScale(d) {
    return d.calcdata.columns.reduce((prev, next) => next.xIndex < d.xIndex ? prev + next.columnWidth : prev, 0);
}
function makeRowBlock(anchorToRowBlock, auxiliary) {
    const blockAnchorKeys = Object.keys(anchorToRowBlock);
    return blockAnchorKeys.map((k) => extendFlat({}, anchorToRowBlock[k], { auxiliaryBlocks: auxiliary }));
}
function makeAnchorToRowBlock(rowHeights, minimumFillHeight) {
    const anchorToRowBlock = {};
    let currentRowHeight;
    let currentAnchor = 0;
    let currentBlockHeight = 0;
    let currentBlock = makeIdentity();
    let currentFirstRowIndex = 0;
    let blockCounter = 0;
    for (let i = 0; i < rowHeights.length; i++) {
        currentRowHeight = rowHeights[i];
        currentBlock.rows.push({
            rowIndex: i,
            rowHeight: currentRowHeight
        });
        currentBlockHeight += currentRowHeight;
        if (currentBlockHeight >= minimumFillHeight || i === rowHeights.length - 1) {
            anchorToRowBlock[currentAnchor] = currentBlock;
            currentBlock.key = blockCounter++;
            currentBlock.firstRowIndex = currentFirstRowIndex;
            currentBlock.lastRowIndex = i;
            currentBlock = makeIdentity();
            currentAnchor += currentBlockHeight;
            currentFirstRowIndex = i + 1;
            currentBlockHeight = 0;
        }
    }
    return anchorToRowBlock;
}
function makeIdentity() {
    return {
        firstRowIndex: null,
        lastRowIndex: null,
        rows: []
    };
}
