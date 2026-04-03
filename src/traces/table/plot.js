import c from './constants.js';
import { select } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
import { drag as d3Drag } from 'd3-drag';
import Lib from '../../lib/index.js';
import gup from '../../lib/gup.js';
import { font as drawingFont, setClipUrl } from '../../components/drawing/index.js';
import svgUtil from '../../lib/svg_text_utils.js';
import _index from '../../lib/index.js';
const { raiseToTop, strTranslate, cancelTransition: cancelEeaseColumn } = _index;
import prepareData from './data_preparation_helper.js';
import splitData from './data_split_helpers.js';
import Color from '../../components/color/index.js';
const numberFormat = Lib.numberFormat;
export default function plot(gd, wrappedTraceHolders) {
    const dynamic = !gd._context.staticPlot;
    const table = gd._fullLayout._paper.selectAll('.' + c.cn.table)
        .data(wrappedTraceHolders.map((wrappedTraceHolder) => {
        const traceHolder = gup.unwrap(wrappedTraceHolder);
        const trace = traceHolder.trace;
        return prepareData(gd, trace);
    }), gup.keyFun);
    table.exit().remove();
    const tableEnter = table.enter()
        .append('g')
        .classed(c.cn.table, true)
        .attr('overflow', 'visible')
        .style('box-sizing', 'content-box')
        .style('position', 'absolute')
        .style('left', 0)
        .style('overflow', 'visible')
        .style('shape-rendering', 'crispEdges')
        .style('pointer-events', 'all');
    const tableMerged = table.merge(tableEnter);
    tableMerged
        .attr('width', function (d) { return d.width + d.size.l + d.size.r; })
        .attr('height', function (d) { return d.height + d.size.t + d.size.b; })
        .attr('transform', function (d) {
        return strTranslate(d.translateX, d.translateY);
    });
    const tableControlView = tableMerged.selectAll('.' + c.cn.tableControlView)
        .data(gup.repeat, gup.keyFun);
    const cvEnter = tableControlView.enter()
        .append('g')
        .classed(c.cn.tableControlView, true)
        .style('box-sizing', 'content-box');
    if (dynamic) {
        const wheelEvent = 'onwheel' in document ? 'wheel' : 'mousewheel';
        cvEnter
            .on('mousemove', function (event, d) {
            tableControlView
                .filter((dd) => d === dd)
                .call(renderScrollbarKit, gd);
        })
            .on(wheelEvent, function (event, d) {
            if (d.scrollbarState.wheeling)
                return;
            d.scrollbarState.wheeling = true;
            const newY = d.scrollY + event.deltaY;
            const noChange = makeDragRow(gd, tableControlView, null, newY)(d);
            if (!noChange) {
                event.stopPropagation();
                event.preventDefault();
            }
            d.scrollbarState.wheeling = false;
        })
            .call(renderScrollbarKit, gd, true);
    }
    const tableControlViewMerged = tableControlView.merge(cvEnter);
    tableControlViewMerged
        .attr('transform', function (d) { return strTranslate(d.size.l, d.size.t); });
    // scrollBackground merely ensures that mouse events are captured even on crazy fast scrollwheeling
    // otherwise rendering glitches may occur
    const scrollBackground = tableControlViewMerged.selectAll('.' + c.cn.scrollBackground)
        .data(gup.repeat, gup.keyFun);
    const scrollBackgroundEnter = scrollBackground.enter()
        .append('rect')
        .classed(c.cn.scrollBackground, true)
        .attr('fill', 'none');
    scrollBackground.merge(scrollBackgroundEnter)
        .attr('width', function (d) { return d.width; })
        .attr('height', function (d) { return d.height; });
    tableControlViewMerged.each(function (d) {
        setClipUrl(select(this), scrollAreaBottomClipKey(gd, d), gd);
    });
    const yColumnJoin = tableControlViewMerged.selectAll('.' + c.cn.yColumn)
        .data(function (vm) { return vm.columns; }, gup.keyFun);
    const yColumnEnter = yColumnJoin.enter()
        .append('g')
        .classed(c.cn.yColumn, true);
    yColumnJoin.exit().remove();
    const yColumn = yColumnJoin.merge(yColumnEnter);
    yColumn.attr('transform', function (d) { return strTranslate(d.x, 0); });
    if (dynamic) {
        yColumn.call(d3Drag()
            .origin(function (d) {
            const movedColumn = select(this);
            easeColumn(movedColumn, d, -c.uplift);
            raiseToTop(this);
            d.calcdata.columnDragInProgress = true;
            // @ts-expect-error renderScrollbarKit accepts variable args
            renderScrollbarKit(tableControlView.filter((dd) => d.calcdata.key === dd.key), gd);
            return d;
        })
            .on('drag', function (event, d) {
            const movedColumn = select(this);
            const getter = (dd) => { return (d === dd ? event.x : dd.x) + dd.columnWidth / 2; };
            d.x = Math.max(-c.overdrag, Math.min(d.calcdata.width + c.overdrag - d.columnWidth, event.x));
            const sortableColumns = flatData(yColumn).filter((dd) => dd.calcdata.key === d.calcdata.key);
            const newOrder = sortableColumns.sort((a, b) => getter(a) - getter(b));
            newOrder.forEach((dd, i) => {
                dd.xIndex = i;
                dd.x = d === dd ? dd.x : dd.xScale(dd);
            });
            yColumn.filter((dd) => d !== dd)
                .transition()
                .ease(c.transitionEase)
                .duration(c.transitionDuration)
                .attr('transform', function (d) { return strTranslate(d.x, 0); });
            movedColumn
                .call(cancelEeaseColumn)
                .attr('transform', strTranslate(d.x, -c.uplift));
        })
            .on('end', function (event, d) {
            const movedColumn = select(this);
            const p = d.calcdata;
            d.x = d.xScale(d);
            d.calcdata.columnDragInProgress = false;
            easeColumn(movedColumn, d, 0);
            columnMoved(gd, p, p.columns.map((dd) => dd.xIndex));
        }));
    }
    yColumn.each(function (d) {
        setClipUrl(select(this), columnBoundaryClipKey(gd, d), gd);
    });
    const columnBlock = yColumn.selectAll('.' + c.cn.columnBlock)
        .data(splitData.splitToPanels, gup.keyFun);
    const columnBlockEnter = columnBlock.enter()
        .append('g')
        .classed(c.cn.columnBlock, true)
        .attr('id', function (d) { return d.key; });
    const columnBlockMerged = columnBlock.merge(columnBlockEnter);
    columnBlockMerged
        .style('cursor', function (d) {
        return d.dragHandle ? 'ew-resize' : d.calcdata.scrollbarState.barWiggleRoom ? 'ns-resize' : 'default';
    });
    const headerColumnBlock = columnBlockMerged.filter(headerBlock);
    const cellsColumnBlock = columnBlockMerged.filter(cellsBlock);
    if (dynamic) {
        cellsColumnBlock.call(d3Drag()
            .origin(function (d) {
            event.stopPropagation();
            return d;
        })
            // @ts-expect-error makeDragRow accepts variable args
            .on('drag', makeDragRow(gd, tableControlView, -1))
            .on('end', function (event) {
            // fixme emit plotly notification
        }));
    }
    // initial rendering: header is rendered first, as it may may have async LaTeX (show header first)
    // but blocks are _entered_ the way they are due to painter's algo (header on top)
    renderColumnCellTree(gd, tableControlViewMerged, headerColumnBlock, columnBlockMerged);
    renderColumnCellTree(gd, tableControlViewMerged, cellsColumnBlock, columnBlockMerged);
    const scrollAreaClip = tableControlViewMerged.selectAll('.' + c.cn.scrollAreaClip)
        .data(gup.repeat, gup.keyFun);
    const scrollAreaClipEnter = scrollAreaClip.enter()
        .append('clipPath')
        .classed(c.cn.scrollAreaClip, true)
        .attr('id', function (d) { return scrollAreaBottomClipKey(gd, d); });
    const scrollAreaClipRect = scrollAreaClip.merge(scrollAreaClipEnter).selectAll('.' + c.cn.scrollAreaClipRect)
        .data(gup.repeat, gup.keyFun);
    const scrollAreaClipRectEnter = scrollAreaClipRect.enter()
        .append('rect')
        .classed(c.cn.scrollAreaClipRect, true)
        .attr('x', -c.overdrag)
        .attr('y', -c.uplift)
        .attr('fill', 'none');
    scrollAreaClipRect.merge(scrollAreaClipRectEnter)
        .attr('width', function (d) { return d.width + 2 * c.overdrag; })
        .attr('height', function (d) { return d.height + c.uplift; });
    const columnBoundary = yColumn.selectAll('.' + c.cn.columnBoundary)
        .data(gup.repeat, gup.keyFun);
    columnBoundary.enter()
        .append('g')
        .classed(c.cn.columnBoundary, true);
    const columnBoundaryClippath = yColumn.selectAll('.' + c.cn.columnBoundaryClippath)
        .data(gup.repeat, gup.keyFun);
    // SVG spec doesn't mandate wrapping into a <defs> and doesn't seem to cause a speed difference
    const columnBoundaryClippathEnter = columnBoundaryClippath.enter()
        .append('clipPath')
        .classed(c.cn.columnBoundaryClippath, true);
    const columnBoundaryClippathMerged = columnBoundaryClippath.merge(columnBoundaryClippathEnter);
    columnBoundaryClippathMerged
        .attr('id', function (d) { return columnBoundaryClipKey(gd, d); });
    const columnBoundaryRect = columnBoundaryClippathMerged.selectAll('.' + c.cn.columnBoundaryRect)
        .data(gup.repeat, gup.keyFun);
    const columnBoundaryRectEnter = columnBoundaryRect.enter()
        .append('rect')
        .classed(c.cn.columnBoundaryRect, true)
        .attr('fill', 'none');
    columnBoundaryRect.merge(columnBoundaryRectEnter)
        .attr('width', function (d) { return d.columnWidth + 2 * roundHalfWidth(d); })
        .attr('height', function (d) { return d.calcdata.height + 2 * roundHalfWidth(d) + c.uplift; })
        .attr('x', function (d) { return -roundHalfWidth(d); })
        .attr('y', function (d) { return -roundHalfWidth(d); });
    updateBlockYPosition(null, cellsColumnBlock, tableControlViewMerged);
}
function roundHalfWidth(d) {
    return Math.ceil(d.calcdata.maxLineWidth / 2);
}
function scrollAreaBottomClipKey(gd, d) {
    return 'clip' + gd._fullLayout._uid + '_scrollAreaBottomClip_' + d.key;
}
function columnBoundaryClipKey(gd, d) {
    return 'clip' + gd._fullLayout._uid + '_columnBoundaryClippath_' + d.calcdata.key + '_' + d.specIndex;
}
function flatData(selection) {
    return [].concat.apply([], selection.map((g) => g))
        .map((g) => g.__data__);
}
function renderScrollbarKit(tableControlView, gd, bypassVisibleBar) {
    function calcTotalHeight(d) {
        const blocks = d.rowBlocks;
        return firstRowAnchor(blocks, blocks.length - 1) + (blocks.length ? rowsHeight(blocks[blocks.length - 1], Infinity) : 1);
    }
    const scrollbarKit = tableControlView.selectAll('.' + c.cn.scrollbarKit)
        .data(gup.repeat, gup.keyFun);
    const scrollbarKitEnter = scrollbarKit.enter()
        .append('g')
        .classed(c.cn.scrollbarKit, true)
        .style('shape-rendering', 'geometricPrecision');
    const scrollbarKitMerged = scrollbarKit.merge(scrollbarKitEnter);
    scrollbarKitMerged
        .each(function (d) {
        const s = d.scrollbarState;
        s.totalHeight = calcTotalHeight(d);
        s.scrollableAreaHeight = d.groupHeight - headerHeight(d);
        s.currentlyVisibleHeight = Math.min(s.totalHeight, s.scrollableAreaHeight);
        s.ratio = s.currentlyVisibleHeight / s.totalHeight;
        s.barLength = Math.max(s.ratio * s.currentlyVisibleHeight, c.goldenRatio * c.scrollbarWidth);
        s.barWiggleRoom = s.currentlyVisibleHeight - s.barLength;
        s.wiggleRoom = Math.max(0, s.totalHeight - s.scrollableAreaHeight);
        s.topY = s.barWiggleRoom === 0 ? 0 : (d.scrollY / s.wiggleRoom) * s.barWiggleRoom;
        s.bottomY = s.topY + s.barLength;
        s.dragMultiplier = s.wiggleRoom / s.barWiggleRoom;
    })
        .attr('transform', function (d) {
        const xPosition = d.width + c.scrollbarWidth / 2 + c.scrollbarOffset;
        return strTranslate(xPosition, headerHeight(d));
    });
    const scrollbar = scrollbarKitMerged.selectAll('.' + c.cn.scrollbar)
        .data(gup.repeat, gup.keyFun);
    const scrollbarEnter = scrollbar.enter()
        .append('g')
        .classed(c.cn.scrollbar, true);
    const scrollbarMerged = scrollbar.merge(scrollbarEnter);
    const scrollbarSlider = scrollbarMerged.selectAll('.' + c.cn.scrollbarSlider)
        .data(gup.repeat, gup.keyFun);
    const scrollbarSliderEnter = scrollbarSlider.enter()
        .append('g')
        .classed(c.cn.scrollbarSlider, true);
    const scrollbarSliderMerged = scrollbarSlider.merge(scrollbarSliderEnter);
    scrollbarSliderMerged
        .attr('transform', function (d) {
        return strTranslate(0, d.scrollbarState.topY || 0);
    });
    const scrollbarGlyph = scrollbarSliderMerged.selectAll('.' + c.cn.scrollbarGlyph)
        .data(gup.repeat, gup.keyFun);
    const scrollbarGlyphEnter = scrollbarGlyph.enter()
        .append('line')
        .classed(c.cn.scrollbarGlyph, true)
        .attr('stroke', 'black')
        .attr('stroke-width', c.scrollbarWidth)
        .attr('stroke-linecap', 'round')
        .attr('y1', c.scrollbarWidth / 2);
    const scrollbarGlyphMerged = scrollbarGlyph.merge(scrollbarGlyphEnter);
    scrollbarGlyphMerged
        .attr('y2', function (d) {
        return d.scrollbarState.barLength - c.scrollbarWidth / 2;
    })
        .attr('stroke-opacity', function (d) {
        return d.columnDragInProgress || !d.scrollbarState.barWiggleRoom || bypassVisibleBar ? 0 : 0.4;
    });
    // cancel transition: possible pending (also, delayed) transition
    scrollbarGlyphMerged
        .transition().delay(0).duration(0);
    scrollbarGlyphMerged
        .transition().delay(c.scrollbarHideDelay).duration(c.scrollbarHideDuration)
        .attr('stroke-opacity', 0);
    const scrollbarCaptureZone = scrollbarMerged.selectAll('.' + c.cn.scrollbarCaptureZone)
        .data(gup.repeat, gup.keyFun);
    const scrollbarCaptureZoneEnter = scrollbarCaptureZone.enter()
        .append('line')
        .classed(c.cn.scrollbarCaptureZone, true)
        .attr('stroke', 'white')
        .attr('stroke-opacity', 0.01) // some browser might get rid of a 0 opacity element
        .attr('stroke-width', c.scrollbarCaptureWidth)
        .attr('stroke-linecap', 'butt')
        .attr('y1', 0)
        .on('mousedown', function (event, d) {
        const y = event.y;
        const bbox = this.getBoundingClientRect();
        const s = d.scrollbarState;
        const pixelVal = y - bbox.top;
        const inverseScale = scaleLinear().domain([0, s.scrollableAreaHeight]).range([0, s.totalHeight]).clamp(true);
        if (!(s.topY <= pixelVal && pixelVal <= s.bottomY)) {
            makeDragRow(gd, tableControlView, null, inverseScale(pixelVal - s.barLength / 2))(d);
        }
    })
        .call(d3Drag()
        .origin(function (d) {
        event.stopPropagation();
        d.scrollbarState.scrollbarScrollInProgress = true;
        return d;
    })
        // @ts-expect-error makeDragRow accepts variable args
        .on('drag', makeDragRow(gd, tableControlView))
        .on('end', function (event) {
        // fixme emit Plotly event
    }));
    scrollbarCaptureZone.merge(scrollbarCaptureZoneEnter)
        .attr('y2', function (d) {
        return d.scrollbarState.scrollableAreaHeight;
    });
    // Remove scroll glyph and capture zone on static plots
    // as they don't render properly when converted to PDF
    // in the Chrome PDF viewer
    // https://github.com/plotly/streambed/issues/11618
    if (gd._context.staticPlot) {
        scrollbarGlyphMerged.remove();
        scrollbarCaptureZone.merge(scrollbarCaptureZoneEnter).remove();
    }
}
function renderColumnCellTree(gd, tableControlView, columnBlock, allColumnBlock) {
    // fixme this perf hotspot
    // this is performance critical code as scrolling calls it on every revolver switch
    // it appears sufficiently fast but there are plenty of low-hanging fruits for performance optimization
    const columnCells = renderColumnCells(columnBlock);
    const columnCell = renderColumnCell(columnCells);
    supplyStylingValues(columnCell);
    const cellRect = renderCellRect(columnCell);
    sizeAndStyleRect(cellRect);
    const cellTextHolder = renderCellTextHolder(columnCell);
    const cellText = renderCellText(cellTextHolder);
    setFont(cellText);
    populateCellText(cellText, tableControlView, allColumnBlock, gd);
    // doing this at the end when text, and text stlying are set
    setCellHeightAndPositionY(columnCell);
}
function renderColumnCells(columnBlock) {
    const columnCells = columnBlock.selectAll('.' + c.cn.columnCells)
        .data(gup.repeat, gup.keyFun);
    const columnCellsEnter = columnCells.enter()
        .append('g')
        .classed(c.cn.columnCells, true);
    columnCells.exit()
        .remove();
    return columnCells.merge(columnCellsEnter);
}
function renderColumnCell(columnCells) {
    const columnCell = columnCells.selectAll('.' + c.cn.columnCell)
        .data(splitData.splitToCells, function (d) { return d.keyWithinBlock; });
    const columnCellEnter = columnCell.enter()
        .append('g')
        .classed(c.cn.columnCell, true);
    columnCell.exit()
        .remove();
    return columnCell.merge(columnCellEnter);
}
function renderCellRect(columnCell) {
    const cellRect = columnCell.selectAll('.' + c.cn.cellRect)
        .data(gup.repeat, function (d) { return d.keyWithinBlock; });
    const cellRectEnter = cellRect.enter()
        .append('rect')
        .classed(c.cn.cellRect, true);
    return cellRect.merge(cellRectEnter);
}
function renderCellText(cellTextHolder) {
    const cellText = cellTextHolder.selectAll('.' + c.cn.cellText)
        .data(gup.repeat, function (d) { return d.keyWithinBlock; });
    const cellTextEnter = cellText.enter()
        .append('text')
        .classed(c.cn.cellText, true)
        .style('cursor', function () { return 'auto'; })
        .on('mousedown', function (event) { event.stopPropagation(); });
    return cellText.merge(cellTextEnter);
}
function renderCellTextHolder(columnCell) {
    const cellTextHolder = columnCell.selectAll('.' + c.cn.cellTextHolder)
        .data(gup.repeat, function (d) { return d.keyWithinBlock; });
    const cellTextHolderEnter = cellTextHolder.enter()
        .append('g')
        .classed(c.cn.cellTextHolder, true)
        .style('shape-rendering', 'geometricPrecision');
    return cellTextHolder.merge(cellTextHolderEnter);
}
function supplyStylingValues(columnCell) {
    columnCell
        .each(function (d, i) {
        const spec = d.calcdata.cells.font;
        const col = d.column.specIndex;
        const font = {
            size: gridPick(spec.size, col, i),
            color: gridPick(spec.color, col, i),
            family: gridPick(spec.family, col, i),
            weight: gridPick(spec.weight, col, i),
            style: gridPick(spec.style, col, i),
            variant: gridPick(spec.variant, col, i),
            textcase: gridPick(spec.textcase, col, i),
            lineposition: gridPick(spec.lineposition, col, i),
            shadow: gridPick(spec.shadow, col, i),
        };
        d.rowNumber = d.key;
        d.align = gridPick(d.calcdata.cells.align, col, i);
        d.cellBorderWidth = gridPick(d.calcdata.cells.line.width, col, i);
        d.font = font;
    });
}
function setFont(cellText) {
    cellText
        .each(function (d) {
        drawingFont(select(this), d.font);
    });
}
function sizeAndStyleRect(cellRect) {
    cellRect
        .attr('width', function (d) { return d.column.columnWidth; })
        .attr('stroke-width', function (d) { return d.cellBorderWidth; })
        .each(function (d) {
        const atomicSelection = select(this);
        Color.stroke(atomicSelection, gridPick(d.calcdata.cells.line.color, d.column.specIndex, d.rowNumber));
        Color.fill(atomicSelection, gridPick(d.calcdata.cells.fill.color, d.column.specIndex, d.rowNumber));
    });
}
function populateCellText(cellText, tableControlView, allColumnBlock, gd) {
    cellText
        .text(function (d) {
        const col = d.column.specIndex;
        const row = d.rowNumber;
        const userSuppliedContent = d.value;
        const stringSupplied = (typeof userSuppliedContent === 'string');
        const hasBreaks = stringSupplied && userSuppliedContent.match(/<br>/i);
        const userBrokenText = !stringSupplied || hasBreaks;
        d.mayHaveMarkup = stringSupplied && userSuppliedContent.match(/[<&>]/);
        const latex = isLatex(userSuppliedContent);
        d.latex = latex;
        const prefix = latex ? '' : gridPick(d.calcdata.cells.prefix, col, row) || '';
        const suffix = latex ? '' : gridPick(d.calcdata.cells.suffix, col, row) || '';
        const format = latex ? null : gridPick(d.calcdata.cells.format, col, row) || null;
        const prefixSuffixedText = prefix + (format ? numberFormat(format)(d.value) : d.value) + suffix;
        let hasWrapSplitCharacter;
        d.wrappingNeeded = !d.wrapped && !userBrokenText && !latex && (hasWrapSplitCharacter = hasWrapCharacter(prefixSuffixedText));
        d.cellHeightMayIncrease = hasBreaks || latex || d.mayHaveMarkup || (hasWrapSplitCharacter === void (0) ? hasWrapCharacter(prefixSuffixedText) : hasWrapSplitCharacter);
        d.needsConvertToTspans = d.mayHaveMarkup || d.wrappingNeeded || d.latex;
        let textToRender;
        if (d.wrappingNeeded) {
            const hrefPreservedText = c.wrapSplitCharacter === ' ' ? prefixSuffixedText.replace(/<a href=/ig, '<a_href=') : prefixSuffixedText;
            const fragments = hrefPreservedText.split(c.wrapSplitCharacter);
            const hrefRestoredFragments = c.wrapSplitCharacter === ' ' ? fragments.map((frag) => frag.replace(/<a_href=/ig, '<a href=')) : fragments;
            d.fragments = hrefRestoredFragments.map((f) => ({ text: f, width: null }));
            d.fragments.push({ fragment: c.wrapSpacer, width: null });
            textToRender = hrefRestoredFragments.join(c.lineBreaker) + c.lineBreaker + c.wrapSpacer;
        }
        else {
            delete d.fragments;
            textToRender = prefixSuffixedText;
        }
        return textToRender;
    })
        .attr('dy', function (d) {
        return d.needsConvertToTspans ? 0 : '0.75em';
    })
        .each(function (d) {
        const element = this;
        const selection = select(element);
        // finalize what's in the DOM
        const renderCallback = d.wrappingNeeded ? wrapTextMaker : updateYPositionMaker;
        if (d.needsConvertToTspans) {
            svgUtil.convertToTspans(selection, gd, renderCallback(allColumnBlock, element, tableControlView, gd, d));
        }
        else {
            select(element.parentNode)
                // basic cell adjustment - compliance with `cellPad`
                // @ts-expect-error strTranslate call pattern
                .attr('transform', function (d) { return strTranslate(xPosition(d), c.cellPad); })
                .attr('text-anchor', function (d) {
                return {
                    left: 'start',
                    center: 'middle',
                    right: 'end'
                }[d.align];
            });
        }
    });
}
function isLatex(content) {
    return typeof content === 'string' && content.match(c.latexCheck);
}
function hasWrapCharacter(text) { return text.indexOf(c.wrapSplitCharacter) !== -1; }
function columnMoved(gd, calcdata, indices) {
    const o = calcdata.gdColumnsOriginalOrder;
    calcdata.gdColumns.sort((a, b) => indices[o.indexOf(a)] - indices[o.indexOf(b)]);
    calcdata.columnorder = indices;
    // TODO: there's no data here, but also this reordering is not reflected
    // in gd.data or even gd._fullData.
    // For now I will not attempt to persist this in _preGUI
    gd.emit('plotly_restyle');
}
function gridPick(spec, col, row) {
    if (Lib.isArrayOrTypedArray(spec)) {
        const column = spec[Math.min(col, spec.length - 1)];
        if (Lib.isArrayOrTypedArray(column)) {
            return column[Math.min(row, column.length - 1)];
        }
        else {
            return column;
        }
    }
    else {
        return spec;
    }
}
function easeColumn(selection, d, y) {
    selection
        .transition()
        .ease(c.releaseTransitionEase)
        .duration(c.releaseTransitionDuration)
        .attr('transform', strTranslate(d.x, y));
}
function cellsBlock(d) { return d.type === 'cells'; }
function headerBlock(d) { return d.type === 'header'; }
/**
 * Revolver panel and cell contents layouting
 */
function headerHeight(d) {
    const headerBlocks = d.rowBlocks.length ? d.rowBlocks[0].auxiliaryBlocks : [];
    return headerBlocks.reduce((p, n) => p + rowsHeight(n, Infinity), 0);
}
function findPagesAndCacheHeights(blocks, scrollY, scrollHeight) {
    const pages = [];
    let pTop = 0;
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
        const block = blocks[blockIndex];
        const blockRows = block.rows;
        let rowsHeight = 0;
        for (let i = 0; i < blockRows.length; i++) {
            rowsHeight += blockRows[i].rowHeight;
        }
        // caching allRowsHeight on the block - it's safe as this function is always called from within the code part
        // that handles increases to row heights
        block.allRowsHeight = rowsHeight;
        const pBottom = pTop + rowsHeight;
        const windowTop = scrollY;
        const windowBottom = windowTop + scrollHeight;
        if (windowTop < pBottom && windowBottom > pTop) {
            pages.push(blockIndex);
        }
        pTop += rowsHeight;
        // consider this nice final optimization; put it in `for` condition - caveat, currently the
        // block.allRowsHeight relies on being invalidated, so enabling this opt may not be safe
        // if(pages.length > 1) break;
    }
    return pages;
}
function updateBlockYPosition(gd, cellsColumnBlock, tableControlView) {
    const d = flatData(cellsColumnBlock)[0];
    if (d === undefined)
        return;
    const blocks = d.rowBlocks;
    const calcdata = d.calcdata;
    const bottom = firstRowAnchor(blocks, blocks.length);
    const scrollHeight = d.calcdata.groupHeight - headerHeight(d);
    const scrollY = calcdata.scrollY = Math.max(0, Math.min(bottom - scrollHeight, calcdata.scrollY));
    const pages = findPagesAndCacheHeights(blocks, scrollY, scrollHeight);
    if (pages.length === 1) {
        if (pages[0] === blocks.length - 1) {
            pages.unshift(pages[0] - 1);
        }
        else {
            pages.push(pages[0] + 1);
        }
    }
    // make phased out page jump by 2 while leaving stationary page intact
    if (pages[0] % 2) {
        pages.reverse();
    }
    cellsColumnBlock
        .each(function (d, i) {
        // these values will also be needed when a block is translated again due to growing cell height
        d.page = pages[i];
        d.scrollY = scrollY;
    });
    cellsColumnBlock
        .attr('transform', function (d) {
        const yTranslate = firstRowAnchor(d.rowBlocks, d.page) - d.scrollY;
        return strTranslate(0, yTranslate);
    });
    // conditionally rerendering panel 0 and 1
    if (gd) {
        conditionalPanelRerender(gd, tableControlView, cellsColumnBlock, pages, d.prevPages, d, 0);
        conditionalPanelRerender(gd, tableControlView, cellsColumnBlock, pages, d.prevPages, d, 1);
        // @ts-expect-error renderScrollbarKit accepts variable args
        renderScrollbarKit(tableControlView, gd);
    }
}
function makeDragRow(gd, allTableControlView, optionalMultiplier, optionalPosition) {
    return function dragRow(eventD) {
        // may come from whichever DOM event target: drag, wheel, bar... eventD corresponds to event target
        const d = eventD.calcdata ? eventD.calcdata : eventD;
        const tableControlView = allTableControlView.filter((dd) => d.key === dd.key);
        const multiplier = optionalMultiplier || d.scrollbarState.dragMultiplier;
        const initialScrollY = d.scrollY;
        d.scrollY = optionalPosition === void (0) ? d.scrollY + multiplier * event.dy : optionalPosition;
        const cellsColumnBlock = tableControlView.selectAll('.' + c.cn.yColumn).selectAll('.' + c.cn.columnBlock).filter(cellsBlock);
        updateBlockYPosition(gd, cellsColumnBlock, tableControlView);
        // return false if we've "used" the scroll, ie it did something,
        // so the event shouldn't bubble (if appropriate)
        return d.scrollY === initialScrollY;
    };
}
function conditionalPanelRerender(gd, tableControlView, cellsColumnBlock, pages, prevPages, d, revolverIndex) {
    const shouldComponentUpdate = pages[revolverIndex] !== prevPages[revolverIndex];
    if (shouldComponentUpdate) {
        clearTimeout(d.currentRepaint[revolverIndex]);
        d.currentRepaint[revolverIndex] = setTimeout(function () {
            // setTimeout might lag rendering but yields a smoother scroll, because fast scrolling makes
            // some repaints invisible ie. wasteful (DOM work blocks the main thread)
            const toRerender = cellsColumnBlock.filter((d, i) => i === revolverIndex && pages[i] !== prevPages[i]);
            renderColumnCellTree(gd, tableControlView, toRerender, cellsColumnBlock);
            prevPages[revolverIndex] = pages[revolverIndex];
        });
    }
}
function wrapTextMaker(columnBlock, element, tableControlView, gd) {
    return function wrapText() {
        const cellTextHolder = select(element.parentNode);
        cellTextHolder
            .each(function (d) {
            const fragments = d.fragments;
            cellTextHolder.selectAll('tspan.line').each(function (dd, i) {
                fragments[i].width = this.getComputedTextLength();
            });
            // last element is only for measuring the separator character, so it's ignored:
            const separatorLength = fragments[fragments.length - 1].width;
            const rest = fragments.slice(0, -1);
            let currentRow = [];
            let currentAddition, currentAdditionLength;
            let currentRowLength = 0;
            const rowLengthLimit = d.column.columnWidth - 2 * c.cellPad;
            d.value = '';
            while (rest.length) {
                currentAddition = rest.shift();
                currentAdditionLength = currentAddition.width + separatorLength;
                if (currentRowLength + currentAdditionLength > rowLengthLimit) {
                    d.value += currentRow.join(c.wrapSpacer) + c.lineBreaker;
                    currentRow = [];
                    currentRowLength = 0;
                }
                currentRow.push(currentAddition.text);
                currentRowLength += currentAdditionLength;
            }
            if (currentRowLength) {
                d.value += currentRow.join(c.wrapSpacer);
            }
            d.wrapped = true;
        });
        // the pre-wrapped text was rendered only for the text measurements
        cellTextHolder.selectAll('tspan.line').remove();
        // resupply text, now wrapped
        populateCellText(cellTextHolder.select('.' + c.cn.cellText), tableControlView, columnBlock, gd);
        select(element.parentNode.parentNode).call(setCellHeightAndPositionY);
    };
}
function updateYPositionMaker(columnBlock, element, tableControlView, gd, d) {
    return function updateYPosition() {
        if (d.settledY)
            return;
        const cellTextHolder = select(element.parentNode);
        const l = getBlock(d);
        const rowIndex = d.key - l.firstRowIndex;
        const declaredRowHeight = l.rows[rowIndex].rowHeight;
        const requiredHeight = d.cellHeightMayIncrease ? element.parentNode.getBoundingClientRect().height + 2 * c.cellPad : declaredRowHeight;
        const finalHeight = Math.max(requiredHeight, declaredRowHeight);
        const increase = finalHeight - l.rows[rowIndex].rowHeight;
        if (increase) {
            // current row height increased
            l.rows[rowIndex].rowHeight = finalHeight;
            columnBlock
                .selectAll('.' + c.cn.columnCell)
                .call(setCellHeightAndPositionY);
            updateBlockYPosition(null, columnBlock.filter(cellsBlock), 0);
            // if d.column.type === 'header', then the scrollbar has to be pushed downward to the scrollable area
            // if d.column.type === 'cells', it can still be relevant if total scrolling content height is less than the
            //                               scrollable window, as increases to row heights may need scrollbar updates
            renderScrollbarKit(tableControlView, gd, true);
        }
        cellTextHolder
            .attr('transform', function () {
            // this code block is only invoked for items where d.cellHeightMayIncrease is truthy
            const element = this;
            const columnCellElement = element.parentNode;
            const box = columnCellElement.getBoundingClientRect();
            const rectBox = select(element.parentNode).select('.' + c.cn.cellRect).node().getBoundingClientRect();
            const currentTransform = element.transform.baseVal.consolidate();
            const yPosition = rectBox.top - box.top + (currentTransform ? currentTransform.matrix.f : c.cellPad);
            return strTranslate(xPosition(d, select(element.parentNode).select('.' + c.cn.cellTextHolder).node().getBoundingClientRect().width), yPosition);
        });
        d.settledY = true;
    };
}
function xPosition(d, optionalWidth) {
    switch (d.align) {
        case 'left': return c.cellPad;
        case 'right': return d.column.columnWidth - (optionalWidth || 0) - c.cellPad;
        case 'center': return (d.column.columnWidth - (optionalWidth || 0)) / 2;
        default: return c.cellPad;
    }
}
function setCellHeightAndPositionY(columnCell) {
    columnCell
        .attr('transform', function (d) {
        const headerHeight = d.rowBlocks[0].auxiliaryBlocks.reduce((p, n) => p + rowsHeight(n, Infinity), 0);
        const l = getBlock(d);
        const rowAnchor = rowsHeight(l, d.key);
        const yOffset = rowAnchor + headerHeight;
        return strTranslate(0, yOffset);
    })
        .selectAll('.' + c.cn.cellRect)
        .attr('height', function (d) { return getRow(getBlock(d), d.key).rowHeight; });
}
function firstRowAnchor(blocks, page) {
    let total = 0;
    for (let i = page - 1; i >= 0; i--) {
        total += allRowsHeight(blocks[i]);
    }
    return total;
}
function rowsHeight(rowBlock, key) {
    let total = 0;
    for (let i = 0; i < rowBlock.rows.length && rowBlock.rows[i].rowIndex < key; i++) {
        total += rowBlock.rows[i].rowHeight;
    }
    return total;
}
function allRowsHeight(rowBlock) {
    const cached = rowBlock.allRowsHeight;
    if (cached !== void (0)) {
        return cached;
    }
    let total = 0;
    for (let i = 0; i < rowBlock.rows.length; i++) {
        total += rowBlock.rows[i].rowHeight;
    }
    rowBlock.allRowsHeight = total;
    return total;
}
function getBlock(d) { return d.rowBlocks[d.page]; }
function getRow(l, i) { return l.rows[i - l.firstRowIndex]; }
