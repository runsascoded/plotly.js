import { select } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import { constrain, ensureSingle, ensureSingleById, identity, isBottomAnchor, isCenterAnchor, isMiddleAnchor, isRightAnchor, log, syncOrAsync, templateString } from '../../lib/index.js';
import { autoMargin, previousPromises } from '../../plots/plots.js';
import Registry from '../../registry.js';
import Events from '../../lib/events.js';
import dragElement from '../dragelement/index.js';
import { bBox, font, getTranslate, setClipUrl, setRect, setTranslate } from '../drawing/index.js';
import Color from '../color/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import handleClick from './handle_click.js';
import constants from './constants.js';
import alignmentConstants from '../../constants/alignment.js';
import getLegendData from './get_legend_data.js';
import style from './style.js';
import helpers from './helpers.js';
import type { GraphDiv, FullLayout } from '../../../types/core';
const LINE_SPACING = alignmentConstants.LINE_SPACING;
const FROM_TL = alignmentConstants.FROM_TL;
const FROM_BR = alignmentConstants.FROM_BR;

const MAIN_TITLE = 1;

const LEGEND_PATTERN = /^legend[0-9]*$/;

export default function draw(gd: GraphDiv, opts?: any): void {
    if(opts) {
        drawOne(gd, opts);
    } else {
        const fullLayout = gd._fullLayout;
        const newLegends = fullLayout._legends;

        // remove old legends that won't stay on the graph
        const oldLegends = fullLayout._infolayer.selectAll('[class^="legend"]');

        oldLegends.each(function(this: any) {
            const el = select(this);
            const classes = el.attr('class');
            const cls = classes.split(' ')[0];
            if(cls.match(LEGEND_PATTERN) && newLegends.indexOf(cls) === -1) {
                el.remove();
            }
        });

        // draw/update new legends
        for(let i = 0; i < newLegends.length; i++) {
            const legendId = newLegends[i];
            const legendObj = gd._fullLayout[legendId];
            drawOne(gd, legendObj);
        }
    }
}

// After legend dimensions are calculated the title can be aligned horizontally left, center, right
function horizontalAlignTitle(titleEl: any, legendObj: any, bw: number): void {
    if((legendObj.title.side !== 'top center') && (legendObj.title.side !== 'top right')) return;

    const titleFont = legendObj.title.font;
    const lineHeight = titleFont.size * LINE_SPACING;
    let titleOffset = 0;
    const textNode = titleEl.node();

    const width = bBox(textNode).width;  // width of the title text

    if(legendObj.title.side === 'top center') {
        titleOffset = 0.5 * (legendObj._width - 2 * bw - 2 * constants.titlePad - width);
    } else if(legendObj.title.side === 'top right') {
        titleOffset = legendObj._width - 2 * bw - 2 * constants.titlePad - width;
    }

    svgTextUtils.positionText(titleEl,
        bw + constants.titlePad + titleOffset,
        bw + lineHeight
    );
}

function drawOne(gd: GraphDiv, opts: any): any {
    const legendObj = opts || {};

    const fullLayout = gd._fullLayout;
    const legendId = getId(legendObj);

    let clipId, layer;

    const inHover = legendObj._inHover;
    if(inHover) {
        layer = legendObj.layer;
        clipId = 'hover';
    } else {
        layer = fullLayout._infolayer;
        clipId = legendId;
    }
    if(!layer) return;
    clipId += fullLayout._uid;

    if(!gd._legendMouseDownTime) gd._legendMouseDownTime = 0;

    let legendData: any;
    if(!inHover) {
        const calcdata = (gd.calcdata || []).slice();

        const shapes = fullLayout.shapes || [];
        for(let i = 0; i < shapes.length; i++) {
            const shape = shapes[i];
            if(!shape.showlegend) continue;

            const shapeLegend = {
                _isShape: true,
                _fullInput: shape,
                index: shape._index,
                name: shape.name || shape.label.text || ('shape ' + shape._index),
                legend: shape.legend,
                legendgroup: shape.legendgroup,
                legendgrouptitle: shape.legendgrouptitle,
                legendrank: shape.legendrank,
                legendwidth: shape.legendwidth,
                showlegend: shape.showlegend,
                visible: shape.visible,
                opacity: shape.opacity,
                mode: shape.type === 'line' ? 'lines' : 'markers',
                line: shape.line,
                marker: {
                    line: shape.line,
                    color: shape.fillcolor,
                    size: 12,
                    symbol:
                        shape.type === 'rect' ? 'square' :
                        shape.type === 'circle' ? 'circle' :
                        // case of path
                        'hexagon2'
                },
            };

            calcdata.push([{ trace: shapeLegend }] as any);
        }

        legendData = fullLayout.showlegend && getLegendData(calcdata, legendObj, fullLayout._legends.length > 1);
    } else {
        if(!legendObj.entries) return;
        legendData = getLegendData(legendObj.entries, legendObj);
    }

    const hiddenSlices = fullLayout.hiddenlabels || [];

    if(!inHover && (!fullLayout.showlegend || !legendData.length)) {
        layer.selectAll('.' + legendId).remove();
        fullLayout._topdefs.select('#' + clipId).remove();
        return (autoMargin as any)(gd, legendId);
    }

    const legend = ensureSingle(layer, 'g', legendId, function(s: any) {
        if(!inHover) s.attr('pointer-events', 'all');
    });

    const clipPath = ensureSingleById(fullLayout._topdefs, 'clipPath', clipId, function(s: any) {
        s.append('rect');
    });

    const bg = ensureSingle(legend, 'rect', 'bg', function(s: any) {
        s.attr('shape-rendering', 'crispEdges');
    });
    bg.call(Color.stroke, legendObj.bordercolor)
        .call(Color.fill, legendObj.bgcolor)
        .style('stroke-width', legendObj.borderwidth + 'px');

    const scrollBox = ensureSingle(legend, 'g', 'scrollbox');

    const title = legendObj.title;
    legendObj._titleWidth = 0;
    legendObj._titleHeight = 0;
    let titleEl: any;
    if(title.text) {
        titleEl = ensureSingle(scrollBox, 'text', legendId + 'titletext');
        titleEl.attr('text-anchor', 'start')
            .call(font, title.font)
            .text(title.text);

        textLayout(titleEl, scrollBox, gd, legendObj, MAIN_TITLE); // handle mathjax or multi-line text and compute title height
    } else {
        scrollBox.selectAll('.' + legendId + 'titletext').remove();
    }

    const scrollBar = ensureSingle(legend, 'rect', 'scrollbar', function(s: any) {
        s.attr('rx', constants.scrollBarEnterAttrs.rx)
         .attr('ry', constants.scrollBarEnterAttrs.ry)
         .attr('width', constants.scrollBarEnterAttrs.width)
         .attr('height', constants.scrollBarEnterAttrs.height)
         .call(Color.fill, constants.scrollBarColor);
    });

    const groupsJoin = scrollBox.selectAll('g.groups').data(legendData);
    groupsJoin.exit().remove();
    const groups = groupsJoin.enter().append('g').attr('class', 'groups').merge(groupsJoin);

    const tracesJoin = groups.selectAll('g.traces').data(identity);
    tracesJoin.exit().remove();
    const traces = tracesJoin.enter().append('g').attr('class', 'traces').merge(tracesJoin);

    traces.style('opacity', function(d: any) {
        const trace = d[0].trace;
        if(Registry.traceIs(trace, 'pie-like')) {
            return hiddenSlices.indexOf(d[0].label) !== -1 ? 0.5 : 1;
        } else {
            return trace.visible === 'legendonly' ? 0.5 : 1;
        }
    })
    .each(function(this: any) { select(this).call(drawTexts, gd, legendObj); })
    .call(style, gd, legendObj)
    .each(function(this: any) { if(!inHover) select(this).call(setupTraceToggle, gd, legendId); });

    syncOrAsync([
        previousPromises,
        function() { return computeLegendDimensions(gd, groups, traces, legendObj); },
        function() {
            const gs = fullLayout._size;
            const bw = legendObj.borderwidth;
            const isPaperX = legendObj.xref === 'paper';
            const isPaperY = legendObj.yref === 'paper';

            // re-calculate title position after legend width is derived. To allow for horizontal alignment
            if(title.text) {
                horizontalAlignTitle(titleEl, legendObj, bw);
            }

            if(!inHover) {
                let lx, ly;

                if(isPaperX) {
                    lx = gs.l + gs.w * legendObj.x - (FROM_TL as any)[getXanchor(legendObj)] * legendObj._width;
                } else {
                    lx = fullLayout.width! * legendObj.x - (FROM_TL as any)[getXanchor(legendObj)] * legendObj._width;
                }

                if(isPaperY) {
                    ly = gs.t + gs.h * (1 - legendObj.y) - (FROM_TL as any)[getYanchor(legendObj)] * legendObj._effHeight;
                } else {
                    ly = fullLayout.height! * (1 - legendObj.y) - (FROM_TL as any)[getYanchor(legendObj)] * legendObj._effHeight;
                }

                const expMargin = expandMargin(gd, legendId, lx, ly);

                // IF expandMargin return a Promise (which is truthy),
                // we're under a doAutoMargin redraw, so we don't have to
                // draw the remaining pieces below
                if(expMargin) return;

                if(fullLayout.margin!.autoexpand) {
                    const lx0 = lx;
                    const ly0 = ly;

                    lx = isPaperX ? constrain(lx, 0, fullLayout.width! - legendObj._width) : lx0;
                    ly = isPaperY ? constrain(ly, 0, fullLayout.height! - legendObj._effHeight) : ly0;

                    if(lx !== lx0) {
                        log('Constrain ' + legendId + '.x to make legend fit inside graph');
                    }
                    if(ly !== ly0) {
                        log('Constrain ' + legendId + '.y to make legend fit inside graph');
                    }
                }

                // Set size and position of all the elements that make up a legend:
                // legend, background and border, scroll box and scroll bar as well as title
                setTranslate(legend, lx, ly);
            }

            // to be safe, remove previous listeners
            scrollBar.on('.drag', null);
            legend.on('wheel', null);

            if(inHover || legendObj._height <= legendObj._maxHeight || gd._context.staticPlot) {
                // if scrollbar should not be shown.
                let height = legendObj._effHeight;

                // if unified hover, let it be its full size
                if(inHover) height = legendObj._height;

                bg
                    .attr('width', legendObj._width - bw)
                    .attr('height', height - bw)
                    .attr('x', bw / 2)
                    .attr('y', bw / 2);

                setTranslate(scrollBox, 0, 0);

                clipPath.select('rect')
                    .attr('width', legendObj._width - 2 * bw)
                    .attr('height', height - 2 * bw)
                    .attr('x', bw)
                    .attr('y', bw);

                setClipUrl(scrollBox, clipId, gd);

                setRect(scrollBar, 0, 0, 0, 0);
                delete legendObj._scrollY;
            } else {
                const scrollBarHeight = Math.max(constants.scrollBarMinHeight,
                    legendObj._effHeight * legendObj._effHeight / legendObj._height);
                const scrollBarYMax = legendObj._effHeight -
                    scrollBarHeight -
                    2 * constants.scrollBarMargin;
                const scrollBoxYMax = legendObj._height - legendObj._effHeight;
                const scrollRatio = scrollBarYMax / scrollBoxYMax;

                let scrollBoxY = Math.min(legendObj._scrollY || 0, scrollBoxYMax);

                // increase the background and clip-path width
                // by the scrollbar width and margin
                bg
                    .attr('width', legendObj._width -
                        2 * bw +
                        constants.scrollBarWidth +
                        constants.scrollBarMargin)
                    .attr('height', legendObj._effHeight - bw)
                    .attr('x', bw / 2)
                    .attr('y', bw / 2);

                clipPath.select('rect')
                    .attr('width', legendObj._width -
                        2 * bw +
                        constants.scrollBarWidth +
                        constants.scrollBarMargin)
                    .attr('height', legendObj._effHeight - 2 * bw)
                    .attr('x', bw)
                    .attr('y', bw + scrollBoxY);

                setClipUrl(scrollBox, clipId, gd);

                scrollHandler(scrollBoxY, scrollBarHeight, scrollRatio);

                // scroll legend by mousewheel or touchpad swipe up/down
                legend.on('wheel', function(event: any) {
                    scrollBoxY = constrain(
                        legendObj._scrollY +
                            ((event.deltaY / scrollBoxYMax) * scrollBarYMax),
                        0, scrollBoxYMax);
                    scrollHandler(scrollBoxY, scrollBarHeight, scrollRatio);
                    if(scrollBoxY !== 0 && scrollBoxY !== scrollBoxYMax) {
                        event.preventDefault();
                    }
                });

                let eventY0: any, eventY1, scrollBoxY0: any;

                const getScrollBarDragY = (scrollBoxY0: any, eventY0: any, eventY1: any) => {
                    const y = ((eventY1 - eventY0) / scrollRatio) + scrollBoxY0;
                    return constrain(y, 0, scrollBoxYMax);
                };

                const getNaturalDragY = (scrollBoxY0: any, eventY0: any, eventY1: any) => {
                    const y = ((eventY0 - eventY1) / scrollRatio) + scrollBoxY0;
                    return constrain(y, 0, scrollBoxYMax);
                };

                // scroll legend by dragging scrollBAR
                const scrollBarDrag = d3Drag()
                .on('start', function(event: any) {
                    const e = event.sourceEvent;
                    if(e.type === 'touchstart') {
                        eventY0 = e.changedTouches[0].clientY;
                    } else {
                        eventY0 = e.clientY;
                    }
                    scrollBoxY0 = scrollBoxY;
                })
                .on('drag', function(event: any) {
                    const e = event.sourceEvent;
                    if(e.buttons === 2 || e.ctrlKey) return;
                    if(e.type === 'touchmove') {
                        eventY1 = e.changedTouches[0].clientY;
                    } else {
                        eventY1 = e.clientY;
                    }
                    scrollBoxY = getScrollBarDragY(scrollBoxY0, eventY0, eventY1);
                    scrollHandler(scrollBoxY, scrollBarHeight, scrollRatio);
                });
                scrollBar.call(scrollBarDrag);

                // scroll legend by touch-dragging scrollBOX
                const scrollBoxTouchDrag = d3Drag()
                .on('start', function(event: any) {
                    const e = event.sourceEvent;
                    if(e.type === 'touchstart') {
                        eventY0 = e.changedTouches[0].clientY;
                        scrollBoxY0 = scrollBoxY;
                    }
                })
                .on('drag', function(event: any) {
                    const e = event.sourceEvent;
                    if(e.type === 'touchmove') {
                        eventY1 = e.changedTouches[0].clientY;
                        scrollBoxY = getNaturalDragY(scrollBoxY0, eventY0, eventY1);
                        scrollHandler(scrollBoxY, scrollBarHeight, scrollRatio);
                    }
                });
                scrollBox.call(scrollBoxTouchDrag);
            }

            function scrollHandler(scrollBoxY: any, scrollBarHeight: any, scrollRatio: any) {
                legendObj._scrollY = gd._fullLayout[legendId]._scrollY = scrollBoxY;
                setTranslate(scrollBox, 0, -scrollBoxY);

                setRect(
                    scrollBar,
                    legendObj._width,
                    constants.scrollBarMargin + scrollBoxY * scrollRatio,
                    constants.scrollBarWidth,
                    scrollBarHeight
                );
                clipPath.select('rect').attr('y', bw + scrollBoxY);
            }

            if(gd._context.edits.legendPosition) {
                let xf: any, yf: any, x0: any, y0: any;

                legend.classed('cursor-move', true);

                dragElement.init({
                    element: legend.node(),
                    gd: gd,
                    prepFn: function(e: any) {
                        if(e.target === scrollBar.node()) {
                            return;
                        }
                        const transform = getTranslate(legend);
                        x0 = transform.x;
                        y0 = transform.y;
                    },
                    moveFn: function(dx: any, dy: any) {
                        if(x0 !== undefined && y0 !== undefined) {
                            const newX = x0 + dx;
                            const newY = y0 + dy;

                            setTranslate(legend, newX, newY);
                            xf = dragElement.align(newX, legendObj._width, gs.l, gs.l + gs.w, legendObj.xanchor);
                            yf = dragElement.align(newY + legendObj._height, -legendObj._height, gs.t + gs.h, gs.t, legendObj.yanchor);
                        }
                    },
                    doneFn: function() {
                        if(xf !== undefined && yf !== undefined) {
                            const obj: any = {};
                            obj[legendId + '.x'] = xf;
                            obj[legendId + '.y'] = yf;
                            Registry.call('_guiRelayout', gd, obj);
                        }
                    },
                    clickFn: function(numClicks: number, e: any) {
                        const clickedTrace = layer.selectAll('g.traces').filter(function(this: any) {
                            const bbox = this.getBoundingClientRect();
                            return (
                                e.clientX >= bbox.left && e.clientX <= bbox.right &&
                                e.clientY >= bbox.top && e.clientY <= bbox.bottom
                            );
                        });
                        if(clickedTrace.size() > 0) {
                            clickOrDoubleClick(gd, legend, clickedTrace, numClicks, e);
                        }
                    }
                });
            }
        }], gd);
}

function getTraceWidth(d: any, legendObj: any, textGap: number, isGrouped?: boolean): number {
    const legendItem = d[0];
    const legendWidth = legendItem.width;
    const mode = legendObj.entrywidthmode;

    const traceLegendWidth = legendItem.trace.legendwidth || legendObj.entrywidth;

    if(mode === 'fraction') return legendObj._maxWidth * traceLegendWidth;

    return textGap + (traceLegendWidth || legendWidth);
}

function clickOrDoubleClick(gd: GraphDiv, legend: any, legendItem: any, numClicks: number, evt: any): void {
    const trace = legendItem.data()[0][0].trace;
    const evtData: any = {
        event: evt,
        node: legendItem.node(),
        curveNumber: trace.index,
        expandedIndex: trace.index,
        data: gd.data,
        layout: gd.layout,
        frames: gd._transitionData!._frames,
        config: gd._context,
        fullData: gd._fullData,
        fullLayout: gd._fullLayout
    };

    if(trace._group) {
        evtData.group = trace._group;
    }
    if(Registry.traceIs(trace, 'pie-like')) {
        evtData.label = legendItem.datum()[0].label;
    }
    const clickVal = Events.triggerHandler(gd, 'plotly_legendclick', evtData);
    if(numClicks === 1) {
        if(clickVal === false) return;
        legend._clickTimeout = setTimeout(function() {
            if(!gd._fullLayout) return;
            handleClick(legendItem, gd, numClicks);
        }, gd._context.doubleClickDelay);
    } else if(numClicks === 2) {
        if(legend._clickTimeout) clearTimeout(legend._clickTimeout);
        gd._legendMouseDownTime = 0;

        const dblClickVal = Events.triggerHandler(gd, 'plotly_legenddoubleclick', evtData);
        // Activate default double click behaviour only when both single click and double click values are not false
        if(dblClickVal !== false && clickVal !== false) handleClick(legendItem, gd, numClicks);
    }
}

function drawTexts(g: any, gd: GraphDiv, legendObj: any): void {
    const legendId = getId(legendObj);
    const legendItem = g.data()[0][0];
    const trace = legendItem.trace;
    const isPieLike = Registry.traceIs(trace, 'pie-like');
    const isEditable = !legendObj._inHover && gd._context.edits.legendText && !isPieLike;
    const maxNameLength = legendObj._maxNameLength;

    let name, textFont;
    if(legendItem.groupTitle) {
        name = legendItem.groupTitle.text;
        textFont = legendItem.groupTitle.font;
    } else {
        textFont = legendObj.font;
        if(!legendObj.entries) {
            name = isPieLike ? legendItem.label : trace.name;
            if(trace._meta) {
                name = templateString(name, trace._meta);
            }
        } else {
            name = legendItem.text;
        }
    }

    const textEl = ensureSingle(g, 'text', legendId + 'text');

    textEl.attr('text-anchor', 'start')
        .call(font, textFont)
        .text(isEditable ? ensureLength(name, maxNameLength) : name);

    const textGap = legendObj.indentation + legendObj.itemwidth + constants.itemGap * 2;
    svgTextUtils.positionText(textEl, textGap, 0);

    if(isEditable) {
        textEl.call(svgTextUtils.makeEditable, {gd: gd, text: name})
            .call(textLayout, g, gd, legendObj)
            .on('edit', function(this: any, event: any) {
                const newName = event;
                this.text(ensureLength(newName, maxNameLength))
                    .call(textLayout, g, gd, legendObj);

                const fullInput = legendItem.trace._fullInput || {};
                const update: any = {};

                update.name = newName;

                if(fullInput._isShape) {
                    return Registry.call('_guiRelayout', gd, 'shapes[' + trace.index + '].name', update.name);
                } else {
                    return Registry.call('_guiRestyle', gd, update, trace.index);
                }
            });
    } else {
        textLayout(textEl, g, gd, legendObj);
    }
}

/*
 * Make sure we have a reasonably clickable region.
 * If this string is missing or very short, pad it with spaces out to at least
 * 4 characters, up to the max length of other labels, on the assumption that
 * most characters are wider than spaces so a string of spaces will usually be
 * no wider than the real labels.
 */
function ensureLength(str: string, maxLength: number): string {
    const targetLength = Math.max(4, maxLength);
    if(str && str.trim().length >= targetLength / 2) return str;
    str = str || '';
    for(let i = targetLength - str.length; i > 0; i--) str += ' ';
    return str;
}

function setupTraceToggle(g: any, gd: GraphDiv, legendId: string): void {
    const doubleClickDelay = gd._context.doubleClickDelay;
    let newMouseDownTime;
    let numClicks = 1;

    const traceToggle = ensureSingle(g, 'rect', legendId + 'toggle', function(s: any) {
        if(!gd._context.staticPlot) {
            s.style('cursor', 'pointer').attr('pointer-events', 'all');
        }
        s.call(Color.fill, 'rgba(0,0,0,0)');
    });

    if(gd._context.staticPlot) return;

    traceToggle.on('mousedown', function(event: any) {
        newMouseDownTime = (new Date()).getTime();
        if(newMouseDownTime - gd._legendMouseDownTime! < doubleClickDelay) {
            // in a click train
            numClicks += 1;
        } else {
            // new click train
            numClicks = 1;
            gd._legendMouseDownTime = newMouseDownTime;
        }
    });
    traceToggle.on('mouseup', function(event: any) {
        if(gd._dragged || gd._editing) return;
        const legend = gd._fullLayout[legendId];

        if((new Date()).getTime() - gd._legendMouseDownTime! > doubleClickDelay) {
            numClicks = Math.max(numClicks - 1, 1);
        }

        clickOrDoubleClick(gd, legend, g, numClicks, event);
    });
}

function textLayout(s: any, g: any, gd: GraphDiv, legendObj: any, aTitle?: number): void {
    if(legendObj._inHover) s.attr('data-notex', true); // do not process MathJax for unified hover
    svgTextUtils.convertToTspans(s, gd, function() {
        computeTextDimensions(g, gd, legendObj, aTitle);
    });
}

function computeTextDimensions(g: any, gd: GraphDiv, legendObj: any, aTitle?: number): void {
    const legendItem = g.data()[0][0];
    let showlegend = legendItem && legendItem.trace.showlegend;
    if (Array.isArray(showlegend)) {
        showlegend = showlegend[legendItem.i] !== false;
    }
    if(!legendObj._inHover && legendItem && !showlegend) {
        g.remove();
        return;
    }

    const mathjaxGroup = g.select('g[class*=math-group]');
    const mathjaxNode = mathjaxGroup.node();

    const legendId = getId(legendObj);
    if(!legendObj) {
        legendObj = gd._fullLayout[legendId];
    }
    const bw = legendObj.borderwidth;
    let itemFont;
    if(aTitle === MAIN_TITLE) {
        itemFont = legendObj.title.font;
    } else if(legendItem.groupTitle) {
        itemFont = legendItem.groupTitle.font;
    } else {
        itemFont = legendObj.font;
    }
    const lineHeight = itemFont.size * LINE_SPACING;
    let height, width;

    if(mathjaxNode) {
        const mathjaxBB = bBox(mathjaxNode);

        height = mathjaxBB.height;
        width = mathjaxBB.width;

        if(aTitle === MAIN_TITLE) {
            setTranslate(mathjaxGroup, bw, bw + height * 0.75);
        } else { // legend item
            setTranslate(mathjaxGroup, 0, height * 0.25);
        }
    } else {
        const cls = '.' + legendId + (
            aTitle === MAIN_TITLE ? 'title' : ''
        ) + 'text';

        const textEl = g.select(cls);

        const textLines = svgTextUtils.lineCount(textEl);
        const textNode = textEl.node();

        height = lineHeight * textLines;
        width = textNode ? bBox(textNode).width : 0;

        // approximation to height offset to center the font
        // to avoid getBoundingClientRect
        if(aTitle === MAIN_TITLE) {
            if(legendObj.title.side === 'left') {
                // add extra space between legend title and itmes
                width += constants.itemGap * 2;
            }

            svgTextUtils.positionText(textEl,
                bw + constants.titlePad,
                bw + lineHeight
            );
        } else { // legend item
            let x = constants.itemGap * 2 + legendObj.indentation + legendObj.itemwidth;
            if(legendItem.groupTitle) {
                x = constants.itemGap;
                width -= legendObj.indentation + legendObj.itemwidth;
            }

            svgTextUtils.positionText(textEl,
                x,
                -lineHeight * ((textLines - 1) / 2 - 0.3)
            );
        }
    }

    if(aTitle === MAIN_TITLE) {
        legendObj._titleWidth = width;
        legendObj._titleHeight = height;
    } else { // legend item
        legendItem.lineHeight = lineHeight;
        legendItem.height = Math.max(height, 16) + 3;
        legendItem.width = width;
    }
}

function getTitleSize(legendObj: any): [number, number] {
    let w = 0;
    let h = 0;

    const side = legendObj.title.side;
    if(side) {
        if(side.indexOf('left') !== -1) {
            w = legendObj._titleWidth;
        }
        if(side.indexOf('top') !== -1) {
            h = legendObj._titleHeight;
        }
    }

    return [w, h];
}

/*
 * Computes in fullLayout[legendId]:
 *
 *  - _height: legend height including items past scrollbox height
 *  - _maxHeight: maximum legend height before scrollbox is required
 *  - _effHeight: legend height w/ or w/o scrollbox
 *
 *  - _width: legend width
 *  - _maxWidth (for orientation:h only): maximum width before starting new row
 */
function computeLegendDimensions(gd: GraphDiv, groups: any, traces: any, legendObj: any): void {
    const fullLayout = gd._fullLayout;
    const legendId = getId(legendObj);
    if(!legendObj) {
        legendObj = fullLayout[legendId];
    }
    const gs = fullLayout._size;

    const isVertical = helpers.isVertical(legendObj);
    const isGrouped = helpers.isGrouped(legendObj);
    const isFraction = legendObj.entrywidthmode === 'fraction';

    const bw = legendObj.borderwidth;
    const bw2 = 2 * bw;
    const itemGap = constants.itemGap;
    const textGap = legendObj.indentation + legendObj.itemwidth + itemGap * 2;
    const endPad = 2 * (bw + itemGap);

    const yanchor = getYanchor(legendObj);
    const isBelowPlotArea = legendObj.y < 0 || (legendObj.y === 0 && yanchor === 'top');
    const isAbovePlotArea = legendObj.y > 1 || (legendObj.y === 1 && yanchor === 'bottom');

    const traceGroupGap = legendObj.tracegroupgap;
    const legendGroupWidths: any = {};

    const { orientation, yref } = legendObj;
    let { maxheight } = legendObj;
    const useFullLayoutHeight = isBelowPlotArea || isAbovePlotArea || orientation !== "v" || yref !== "paper"
    // Set default maxheight here since it depends on values passed in by user
    maxheight ||= useFullLayoutHeight ? 0.5 : 1;
    const heightToBeScaled = useFullLayoutHeight ? fullLayout.height : gs.h;
    legendObj._maxHeight = Math.max(maxheight > 1 ? maxheight : maxheight * heightToBeScaled!, 30);

    let toggleRectWidth = 0;
    legendObj._width = 0;
    legendObj._height = 0;
    const titleSize = getTitleSize(legendObj);

    if(isVertical) {
        traces.each(function(this: any, d: any) {
            const h = d[0].height;
            setTranslate(this,
                bw + titleSize[0],
                bw + titleSize[1] + legendObj._height + h / 2 + itemGap
            );
            legendObj._height += h;
            legendObj._width = Math.max(legendObj._width, d[0].width);
        });

        toggleRectWidth = textGap + legendObj._width;
        legendObj._width += itemGap + textGap + bw2;
        legendObj._height += endPad;

        if(isGrouped) {
            groups.each(function(this: any, d: any, i: number) {
                setTranslate(this, 0, i * legendObj.tracegroupgap);
            });
            legendObj._height += (legendObj._lgroupsLength - 1) * legendObj.tracegroupgap;
        }
    } else {
        const xanchor = getXanchor(legendObj);
        const isLeftOfPlotArea = legendObj.x < 0 || (legendObj.x === 0 && xanchor === 'right');
        const isRightOfPlotArea = legendObj.x > 1 || (legendObj.x === 1 && xanchor === 'left');
        const isBeyondPlotAreaY = isAbovePlotArea || isBelowPlotArea;
        const hw = fullLayout.width! / 2;

        // - if placed within x-margins, extend the width of the plot area
        // - else if below/above plot area and anchored in the margin, extend to opposite margin,
        // - otherwise give it the maximum potential margin-push value
        legendObj._maxWidth = Math.max(
            isLeftOfPlotArea ? ((isBeyondPlotAreaY && xanchor === 'left') ? gs.l + gs.w : hw) :
            isRightOfPlotArea ? ((isBeyondPlotAreaY && xanchor === 'right') ? gs.r + gs.w : hw) :
            gs.w,
        2 * textGap);
        let maxItemWidth = 0;
        let combinedItemWidth = 0;
        traces.each(function(this: any, d: any) {
            const w = getTraceWidth(d, legendObj, textGap);
            maxItemWidth = Math.max(maxItemWidth, w);
            combinedItemWidth += w;
        });

        toggleRectWidth = (null as any);
        let maxRowWidth = 0;

        if(isGrouped) {
            let maxGroupHeightInRow = 0;
            let groupOffsetX = 0;
            let groupOffsetY = 0;
            groups.each(function(this: any) {
                let maxWidthInGroup = 0;
                let offsetY = 0;
                select(this).selectAll('g.traces').each(function(this: any, d: any) {
                    const w = getTraceWidth(d, legendObj, textGap);
                    const h = d[0].height;

                    setTranslate(this,
                        titleSize[0],
                        titleSize[1] + bw + itemGap + h / 2 + offsetY
                    );
                    offsetY += h;
                    maxWidthInGroup = Math.max(maxWidthInGroup, w);
                    legendGroupWidths[d[0].trace.legendgroup] = maxWidthInGroup;
                });

                const next = maxWidthInGroup + itemGap;

                // horizontal_wrapping
                if(
                    // not on the first column already
                    groupOffsetX > 0 &&

                    // goes beyound limit
                    next + bw + groupOffsetX > legendObj._maxWidth
                ) {
                    maxRowWidth = Math.max(maxRowWidth, groupOffsetX);
                    groupOffsetX = 0;
                    groupOffsetY += maxGroupHeightInRow + traceGroupGap;
                    maxGroupHeightInRow = offsetY;
                } else {
                    maxGroupHeightInRow = Math.max(maxGroupHeightInRow, offsetY);
                }

                setTranslate(this, groupOffsetX, groupOffsetY);

                groupOffsetX += next;
            });

            legendObj._width = Math.max(maxRowWidth, groupOffsetX) + bw;
            legendObj._height = groupOffsetY + maxGroupHeightInRow + endPad;
        } else {
            const nTraces = traces.size();
            const oneRowLegend = (combinedItemWidth + bw2 + (nTraces - 1) * itemGap) < legendObj._maxWidth;

            let maxItemHeightInRow = 0;
            let offsetX = 0;
            let offsetY = 0;
            let rowWidth = 0;
            traces.each(function(this: any, d: any) {
                const h = d[0].height;
                const w = getTraceWidth(d, legendObj, textGap, isGrouped);
                let next = (oneRowLegend ? w : maxItemWidth);

                if(!isFraction) {
                    next += itemGap;
                }

                if((next + bw + offsetX - itemGap) >= legendObj._maxWidth) {
                    maxRowWidth = Math.max(maxRowWidth, rowWidth);
                    offsetX = 0;
                    offsetY += maxItemHeightInRow;
                    legendObj._height += maxItemHeightInRow;
                    maxItemHeightInRow = 0;
                }

                setTranslate(this,
                    titleSize[0] + bw + offsetX,
                    titleSize[1] + bw + offsetY + h / 2 + itemGap
                );

                rowWidth = offsetX + w + itemGap;
                offsetX += next;
                maxItemHeightInRow = Math.max(maxItemHeightInRow, h);
            });

            if(oneRowLegend) {
                legendObj._width = offsetX + bw2;
                legendObj._height = maxItemHeightInRow + endPad;
            } else {
                legendObj._width = Math.max(maxRowWidth, rowWidth) + bw2;
                legendObj._height += maxItemHeightInRow + endPad;
            }
        }
    }

    legendObj._width = Math.ceil(
        Math.max(
            legendObj._width + titleSize[0],
            legendObj._titleWidth + 2 * (bw + constants.titlePad)
        )
    );

    legendObj._height = Math.ceil(
        Math.max(
            legendObj._height + titleSize[1],
            legendObj._titleHeight + 2 * (bw + constants.itemGap)
        )
    );

    legendObj._effHeight = Math.min(legendObj._height, legendObj._maxHeight);

    const edits = gd._context.edits;
    const isEditable = edits.legendText || edits.legendPosition;
    traces.each(function(this: any, d: any) {
        const traceToggle = select(this).select('.' + legendId + 'toggle');
        const h = d[0].height;
        const legendgroup = d[0].trace.legendgroup;
        let traceWidth = getTraceWidth(d, legendObj, textGap);
        if(isGrouped && legendgroup !== '') {
            traceWidth = legendGroupWidths[legendgroup];
        }
        let w = isEditable ? textGap : (toggleRectWidth || traceWidth);
        if(!isVertical && !isFraction) {
            w += itemGap;
        }
        setRect(traceToggle, 0, -h / 2, w, h);
    });
}

function expandMargin(gd: GraphDiv, legendId: string, lx: number, ly: number): any {
    const fullLayout = gd._fullLayout;
    const legendObj = fullLayout[legendId];
    const xanchor = getXanchor(legendObj);
    const yanchor = getYanchor(legendObj);

    const isPaperX = legendObj.xref === 'paper';
    const isPaperY = legendObj.yref === 'paper';

    gd._fullLayout._reservedMargin[legendId] = {};
    const sideY = legendObj.y < 0.5 ? 'b' : 't';
    const sideX = legendObj.x < 0.5 ? 'l' : 'r';
    const possibleReservedMargins: any = {
        r: (fullLayout.width! - lx),
        l: lx + legendObj._width,
        b: (fullLayout.height! - ly),
        t: ly + legendObj._effHeight
    };

    if(isPaperX && isPaperY) {
        return autoMargin(gd, legendId, {
            x: legendObj.x,
            y: legendObj.y,
            l: legendObj._width * ((FROM_TL as any)[xanchor]),
            r: legendObj._width * ((FROM_BR as any)[xanchor]),
            b: legendObj._effHeight * ((FROM_BR as any)[yanchor]),
            t: legendObj._effHeight * ((FROM_TL as any)[yanchor])
        });
    } else if(isPaperX) {
        gd._fullLayout._reservedMargin[legendId][sideY] = possibleReservedMargins[sideY];
    } else if(isPaperY) {
        gd._fullLayout._reservedMargin[legendId][sideX] = possibleReservedMargins[sideX];
    } else {
        if(legendObj.orientation === 'v') {
            gd._fullLayout._reservedMargin[legendId][sideX] = possibleReservedMargins[sideX];
        } else {
            gd._fullLayout._reservedMargin[legendId][sideY] = possibleReservedMargins[sideY];
        }
    }
}

function getXanchor(legendObj: any): string {
    return isRightAnchor(legendObj) ? 'right' :
        isCenterAnchor(legendObj) ? 'center' :
        'left';
}

function getYanchor(legendObj: any): string {
    return isBottomAnchor(legendObj) ? 'bottom' :
        isMiddleAnchor(legendObj) ? 'middle' :
        'top';
}

function getId(legendObj: any): string {
    return legendObj._id || 'legend';
}
