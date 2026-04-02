import { select } from 'd3-selection';
import type { FullAxis, FullLayout, GraphDiv } from '../../types/core';
import Registry from '../registry.js';
import { allowAutoMargin, autoMargin, doAutoMargin, previousPromises, style } from '../plots/plots.js';
import { ensureSingle, ensureSingleById, isBottomAnchor, isLeftAnchor, isMiddleAnchor, isRightAnchor, isTopAnchor, pushUnique, syncOrAsync } from '../lib/index.js';
import svgTextUtils from '../lib/svg_text_utils.js';
import clearGlCanvases from '../lib/clear_gl_canvases.js';
import Color from '../components/color/index.js';
import { bBox, crispRound, setClipUrl, setRect, setSize, setTranslate } from '../components/drawing/index.js';
import Titles from '../components/titles/index.js';
import Axes from '../plots/cartesian/axes.js';
import alignmentConstants from '../constants/alignment.js';
import axisConstraints from '../plots/cartesian/constraints.js';
import _autorange from '../plots/cartesian/autorange.js';
const { doAutoRange } = _autorange;
import _constants from '../plots/cartesian/constants.js';
const { zindexSeparator } = _constants;
const enforceAxisConstraints = axisConstraints.enforce;
const cleanAxisConstraints = axisConstraints.clean;

const SVG_TEXT_ANCHOR_START = 'start';
const SVG_TEXT_ANCHOR_MIDDLE = 'middle';
const SVG_TEXT_ANCHOR_END = 'end';

export const layoutStyles = function(gd: GraphDiv): any {
    return syncOrAsync([doAutoMargin, lsInner], gd);
};

function overlappingDomain(xDomain?: any, yDomain?: any, domains?: any): boolean {
    for(let i = 0; i < domains.length; i++) {
        const existingX = domains[i][0];
        const existingY = domains[i][1];

        if(existingX[0] >= xDomain[1] || existingX[1] <= xDomain[0]) {
            continue;
        }
        if(existingY[0] < yDomain[1] && existingY[1] > yDomain[0]) {
            return true;
        }
    }
    return false;
}

function lsInner(gd: GraphDiv): any {
    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;
    const pad = gs.p;
    const axList = Axes.list(gd, '', true);
    let i, subplot: any, plotinfo, ax, xa: any, ya: any;

    // Set the width and height of the paper div ('.svg-container') in
    // accordance with the users configuration and layout. 
    // If the plot is responsive and the user has not set a width/height, then
    // the width/height of the paper div is set to 100% to fill the parent
    // container. 
    // We can't leave the height or width unset because all of the contents of
    // the paper div are positioned absolutely (and will therefore not take up
    // any space).
    fullLayout._paperdiv.style({
        width: (gd._context.responsive && fullLayout.autosize && !gd._context._hasZeroWidth && !gd.layout.width) ? '100%' : fullLayout.width + 'px',
        height: (gd._context.responsive && fullLayout.autosize && !gd._context._hasZeroHeight && !gd.layout.height) ? '100%' : fullLayout.height + 'px'
    })
    .selectAll('.main-svg')
    .call(setSize, fullLayout.width, fullLayout.height);
    gd._context.setBackground(gd, (fullLayout.paper_bgcolor as any));

    drawMainTitle(gd);
    Registry.getComponentMethod('modebar', 'manage')(gd);

    // _has('cartesian') means SVG specifically
    if(!fullLayout._has('cartesian')) {
        return previousPromises(gd);
    }

    function getLinePosition(ax?: any, counterAx?: any, side?: any) {
        const lwHalf = ax._lw / 2;

        if(ax._id.charAt(0) === 'x') {
            if(!counterAx) return gs.t + gs.h * (1 - (ax.position || 0)) + (lwHalf % 1);
            else if(side === 'top') return counterAx._offset - pad - lwHalf;
            return counterAx._offset + counterAx._length + pad + lwHalf;
        }

        if(!counterAx) return gs.l + gs.w * (ax.position || 0) + (lwHalf % 1);
        else if(side === 'right') return counterAx._offset + counterAx._length + pad + lwHalf;
        return counterAx._offset - pad - lwHalf;
    }

    // some preparation of axis position info
    for(i = 0; i < axList.length; i++) {
        ax = axList[i];

        const counterAx: any = ax._anchorAxis;

        // clear axis line positions, to be set in the subplot loop below
        ax._linepositions = {};

        // stash crispRounded linewidth so we don't need to pass gd all over the place
        ax._lw = crispRound(gd, ax.linewidth, 1);

        // figure out the main axis line and main mirror line position.
        // it's easier to follow the logic if we handle these separately from
        // ax._linepositions, which are only used by mirror=allticks
        // for non-main-subplot ticks, and mirror=all(ticks)? for zero line
        // hiding logic
        ax._mainLinePosition = getLinePosition(ax, counterAx, ax.side);
        ax._mainMirrorPosition = (ax.mirror && counterAx) ?
            getLinePosition(ax, counterAx,
                (alignmentConstants.OPPOSITE_SIDE as any)[ax.side]) : null;
    }

    // figure out which backgrounds we need to draw,
    // and in which layers to put them
    const lowerBackgroundIDs: any[] = [];
    const backgroundIds: any[] = [];
    const lowerDomains: any[] = [];
    // no need to draw background when paper and plot color are the same color,
    // activate mode just for large splom (which benefit the most from this
    // optimization), but this could apply to all cartesian subplots.
    const noNeedForBg = (
        Color.opacity(fullLayout.paper_bgcolor) === 1 &&
        Color.opacity(fullLayout.plot_bgcolor) === 1 &&
        fullLayout.paper_bgcolor === fullLayout.plot_bgcolor
    );

    for(subplot in fullLayout._plots) {
        plotinfo = fullLayout._plots[subplot];

        if(plotinfo.mainplot) {
            // mainplot is a reference to the main plot this one is overlaid on
            // so if it exists, this is an overlaid plot and we don't need to
            // give it its own background
            if(plotinfo.bg) {
                plotinfo.bg.remove();
            }
            plotinfo.bg = undefined;
        } else {
            const xDomain = plotinfo.xaxis.domain;
            const yDomain = plotinfo.yaxis.domain;
            const plotgroup = plotinfo.plotgroup;

            if(overlappingDomain(xDomain, yDomain, lowerDomains) && subplot.indexOf(zindexSeparator) === -1) {
                const pgNode = plotgroup.node();
                const plotgroupBg = plotinfo.bg = ensureSingle(plotgroup, 'rect', 'bg');
                pgNode.insertBefore(plotgroupBg.node(), pgNode.childNodes[0]);
                backgroundIds.push(subplot);
            } else {
                plotgroup.select('rect.bg').remove();
                lowerDomains.push([xDomain, yDomain]);
                if(!noNeedForBg) {
                    lowerBackgroundIDs.push(subplot);
                    backgroundIds.push(subplot);
                }
            }
        }
    }

    // now create all the lower-layer backgrounds at once now that
    // we have the list of subplots that need them
    const lowerBackgrounds = fullLayout._bgLayer.selectAll('.bg')
        .data(lowerBackgroundIDs);

    lowerBackgrounds.enter().append('rect')
        .classed('bg', true);

    lowerBackgrounds.exit().remove();

    lowerBackgrounds.each(function(this: any, subplot: any) {
        fullLayout._plots[subplot].bg = select(this);
    });

    // style all backgrounds
    for(i = 0; i < backgroundIds.length; i++) {
        plotinfo = fullLayout._plots[backgroundIds[i]];
        xa = plotinfo.xaxis;
        ya = plotinfo.yaxis;

        if(plotinfo.bg && xa._offset !== undefined && ya._offset !== undefined) {
            plotinfo.bg
                .call(setRect,
                    xa._offset - pad, ya._offset - pad,
                    xa._length + 2 * pad, ya._length + 2 * pad)
                .call(Color.fill, fullLayout.plot_bgcolor)
                .style('stroke-width', 0);
        }
    }

    if(!fullLayout._hasOnlyLargeSploms) {
        for(subplot in fullLayout._plots) {
            plotinfo = fullLayout._plots[subplot];
            xa = plotinfo.xaxis;
            ya = plotinfo.yaxis;

            // Clip so that data only shows up on the plot area.
            const clipId = plotinfo.clipId = 'clip' + fullLayout._uid + subplot + 'plot';

            const plotClip = ensureSingleById(fullLayout._clips, 'clipPath', clipId, function(s: any) {
                s.classed('plotclip', true)
                    .append('rect');
            });

            plotinfo.clipRect = plotClip.select('rect').attr({
                width: xa._length,
                height: ya._length
            });

            setTranslate(plotinfo.plot, xa._offset, ya._offset);

            let plotClipId;
            let layerClipId;

            if(plotinfo._hasClipOnAxisFalse) {
                plotClipId = null;
                layerClipId = clipId;
            } else {
                plotClipId = clipId;
                layerClipId = null;
            }

            setClipUrl(plotinfo.plot, plotClipId as any, gd);

            // stash layer clipId value (null or same as clipId)
            // to DRY up setClipUrl calls on trace-module and trace layers
            // downstream
            plotinfo.layerClipId = layerClipId;
        }
    }

    let xLinesXLeft: any, xLinesXRight: any, xLinesYBottom, xLinesYTop,
        leftYLineWidth, rightYLineWidth;
    let yLinesYBottom: any, yLinesYTop: any, yLinesXLeft, yLinesXRight,
        connectYBottom, connectYTop;
    let extraSubplot;

    function xLinePath(y?: any) {
        return 'M' + xLinesXLeft + ',' + y + 'H' + xLinesXRight;
    }

    function xLinePathFree(y?: any) {
        return 'M' + xa._offset + ',' + y + 'h' + xa._length;
    }

    function yLinePath(x?: any) {
        return 'M' + x + ',' + yLinesYTop + 'V' + yLinesYBottom;
    }

    function yLinePathFree(x?: any) {
        if(ya._shift !== undefined) {
            x += ya._shift;
        }
        return 'M' + x + ',' + ya._offset + 'v' + ya._length;
    }

    function mainPath(ax?: any, pathFn?: any, pathFnFree?: any) {
        if(!ax.showline || subplot !== ax._mainSubplot) return '';
        if(!ax._anchorAxis) return pathFnFree(ax._mainLinePosition);
        let out = pathFn(ax._mainLinePosition);
        if(ax.mirror) out += pathFn(ax._mainMirrorPosition);
        return out;
    }

    for(subplot in fullLayout._plots) {
        plotinfo = fullLayout._plots[subplot];
        xa = plotinfo.xaxis;
        ya = plotinfo.yaxis;

        /*
         * x lines get longer where they meet y lines, to make a crisp corner.
         * The x lines get the padding (margin.pad) plus the y line width to
         * fill up the corner nicely. Free x lines are excluded - they always
         * span exactly the data area of the plot
         *
         *  | XXXXX
         *  | XXXXX
         *  |
         *  +------
         *     x1
         *    -----
         *     x2
         */
        let xPath = 'M0,0';
        if(shouldShowLinesOrTicks(xa, subplot)) {
            leftYLineWidth = findCounterAxisLineWidth(xa, 'left', ya, axList);
            xLinesXLeft = xa._offset - (leftYLineWidth ? (pad + leftYLineWidth) : 0);
            rightYLineWidth = findCounterAxisLineWidth(xa, 'right', ya, axList);
            xLinesXRight = xa._offset + xa._length + (rightYLineWidth ? (pad + rightYLineWidth) : 0);
            xLinesYBottom = getLinePosition(xa, ya, 'bottom');
            xLinesYTop = getLinePosition(xa, ya, 'top');

            // save axis line positions for extra ticks to reference
            // each subplot that gets ticks from "allticks" gets an entry:
            //    [left or bottom, right or top]
            extraSubplot = (!xa._anchorAxis || subplot !== xa._mainSubplot);
            if(extraSubplot && (xa.mirror === 'allticks' || xa.mirror === 'all')) {
                xa._linepositions[subplot] = [xLinesYBottom, xLinesYTop];
            }

            xPath = mainPath(xa, xLinePath, xLinePathFree);
            if(extraSubplot && xa.showline && (xa.mirror === 'all' || xa.mirror === 'allticks')) {
                xPath += xLinePath(xLinesYBottom) + xLinePath(xLinesYTop);
            }

            plotinfo.xlines
                .style('stroke-width', xa._lw + 'px')
                .call(Color.stroke, xa.showline ?
                    xa.linecolor : 'rgba(0,0,0,0)');
        }
        plotinfo.xlines.attr('d', xPath);

        /*
         * y lines that meet x axes get longer only by margin.pad, because
         * the x axes fill in the corner space. Free y axes, like free x axes,
         * always span exactly the data area of the plot
         *
         *   |   | XXXX
         * y2| y1| XXXX
         *   |   | XXXX
         *       |
         *       +-----
         */
        let yPath = 'M0,0';
        if(shouldShowLinesOrTicks(ya, subplot)) {
            connectYBottom = findCounterAxisLineWidth(ya, 'bottom', xa, axList);
            yLinesYBottom = ya._offset + ya._length + (connectYBottom ? pad : 0);
            connectYTop = findCounterAxisLineWidth(ya, 'top', xa, axList);
            yLinesYTop = ya._offset - (connectYTop ? pad : 0);
            yLinesXLeft = getLinePosition(ya, xa, 'left');
            yLinesXRight = getLinePosition(ya, xa, 'right');

            extraSubplot = (!ya._anchorAxis || subplot !== ya._mainSubplot);
            if(extraSubplot && (ya.mirror === 'allticks' || ya.mirror === 'all')) {
                ya._linepositions[subplot] = [yLinesXLeft, yLinesXRight];
            }

            yPath = mainPath(ya, yLinePath, yLinePathFree);
            if(extraSubplot && ya.showline && (ya.mirror === 'all' || ya.mirror === 'allticks')) {
                yPath += yLinePath(yLinesXLeft) + yLinePath(yLinesXRight);
            }

            plotinfo.ylines
                .style('stroke-width', ya._lw + 'px')
                .call(Color.stroke, ya.showline ?
                    ya.linecolor : 'rgba(0,0,0,0)');
        }
        plotinfo.ylines.attr('d', yPath);
    }

    Axes.makeClipPaths(gd);

    return previousPromises(gd);
}

function shouldShowLinesOrTicks(ax?: any, subplot?: any): any {
    return (ax.ticks || ax.showline) &&
        (subplot === ax._mainSubplot || ax.mirror === 'all' || ax.mirror === 'allticks');
}

/*
 * should we draw a line on counterAx at this side of ax?
 * It's assumed that counterAx is known to overlay the subplot we're working on
 * but it may not be its main axis.
 */
function shouldShowLineThisSide(ax?: any, side?: any, counterAx?: any): boolean {
    // does counterAx get a line at all?
    if(!counterAx.showline || !counterAx._lw) return false;

    // are we drawing *all* lines for counterAx?
    if(counterAx.mirror === 'all' || counterAx.mirror === 'allticks') return true;

    const anchorAx = counterAx._anchorAxis;

    // is this a free axis? free axes can only have a subplot side-line with all(ticks)? mirroring
    if(!anchorAx) return false;

    // in order to handle cases where the user forgot to anchor this axis correctly
    // (because its default anchor has the same domain on the relevant end)
    // check whether the relevant position is the same.
    const sideIndex = (alignmentConstants.FROM_BL as any)[side];
    if(counterAx.side === side) {
        return anchorAx.domain[sideIndex] === ax.domain[sideIndex];
    }
    return counterAx.mirror && anchorAx.domain[1 - sideIndex] === ax.domain[1 - sideIndex];
}

/*
 * Is there another axis intersecting `side` end of `ax`?
 * First look at `counterAx` (the axis for this subplot),
 * then at all other potential counteraxes on or overlaying this subplot.
 * Take the line width from the first one that has a line.
 */
function findCounterAxisLineWidth(ax?: any, side?: any, counterAx?: any, axList?: any): number {
    if(shouldShowLineThisSide(ax, side, counterAx)) {
        return counterAx._lw;
    }
    for(let i = 0; i < axList.length; i++) {
        const axi: any = axList[i];
        if(axi._mainAxis === counterAx._mainAxis && shouldShowLineThisSide(ax, side, axi)) {
            return axi._lw;
        }
    }
    return 0;
}

export const drawMainTitle = function(gd: GraphDiv): void {
    const title: any = gd._fullLayout.title;
    const fullLayout = gd._fullLayout;
    const textAnchor = getMainTitleTextAnchor(fullLayout);
    const dy = getMainTitleDy(fullLayout);
    const y = getMainTitleY(fullLayout, dy);
    const x = getMainTitleX(fullLayout, textAnchor);

    Titles.draw(gd, 'gtitle', {
        propContainer: fullLayout,
        propName: 'title.text',
        subtitlePropName: 'title.subtitle.text',
        placeholder: fullLayout._dfltTitle.plot,
        subtitlePlaceholder: fullLayout._dfltTitle.subtitle,
        attributes: ({
            x: x,
            y: y,
            'text-anchor': textAnchor,
            dy: dy
        }),
    });

    if(title.text && title.automargin) {
        const titleObj = select(gd).selectAll('.gtitle');
        const titleHeight = bBox(select(gd).selectAll('.g-gtitle').node()).height;
        const pushMargin = needsMarginPush(gd, title, titleHeight);
        if(pushMargin > 0) {
            applyTitleAutoMargin(gd, y, pushMargin, titleHeight);
            // Re-position the title once we know where it needs to be
            titleObj.attr({
                x: x,
                y: y,
                'text-anchor': textAnchor,
                dy: getMainTitleDyAdj(title.yanchor)
            }).call(svgTextUtils.positionText, x, y);

            const extraLines = (title.text.match(svgTextUtils.BR_TAG_ALL) || []).length;
            if(extraLines) {
                let delta = alignmentConstants.LINE_SPACING * extraLines + alignmentConstants.MID_SHIFT;
                if(title.y === 0) {
                    delta = -delta;
                }

                titleObj.selectAll('.line').each(function(this: any) {
                    const newDy = +(this.getAttribute('dy')).slice(0, -2) - delta + 'em';
                    this.setAttribute('dy', newDy);
                });
            }

            // If there is a subtitle
            const subtitleObj = select(gd).selectAll('.gtitle-subtitle');
            if(subtitleObj.node()) {
                // Get bottom edge of title bounding box
                const titleBB = titleObj.node().getBBox();
                const titleBottom = titleBB.y + titleBB.height;
                const subtitleY = titleBottom + Titles.SUBTITLE_PADDING_EM * title.subtitle.font.size;
                subtitleObj.attr({
                    x: x,
                    y: subtitleY,
                    'text-anchor': textAnchor,
                    dy: getMainTitleDyAdj(title.yanchor)
                }).call(svgTextUtils.positionText, x, subtitleY);
            }
        }
    }
};

function isOutsideContainer(gd?: any, title?: any, position?: any, y?: any, titleHeight?: any): any {
    const plotHeight = title.yref === 'paper' ? gd._fullLayout._size.h : gd._fullLayout.height;
    const yPosTop = isTopAnchor(title) ? y : y - titleHeight; // Standardize to the top of the title
    const yPosRel = position === 'b' ? plotHeight - yPosTop : yPosTop; // Position relative to the top or bottom of plot
    if((isTopAnchor(title) && position === 't') || isBottomAnchor(title) && position === 'b') {
        return false;
    } else {
        return yPosRel < titleHeight;
    }
}

function containerPushVal(position?: any, titleY?: any, titleYanchor?: any, height?: any, titleDepth?: any): any {
    let push = 0;
    if(titleYanchor === 'middle') {
        push += titleDepth / 2;
    }
    if(position === 't') {
        if(titleYanchor === 'top') {
            push += titleDepth;
        }
        push += (height - titleY * height);
    } else {
        if(titleYanchor === 'bottom') {
            push += titleDepth;
        }
        push += titleY * height;
    }
    return push;
}

function needsMarginPush(gd?: any, title?: any, titleHeight?: any): number {
    const titleY = title.y;
    const titleYanchor = title.yanchor;
    const position = titleY > 0.5 ? 't' : 'b';
    const curMargin = gd._fullLayout.margin[position];
    let pushMargin = 0;
    if(title.yref === 'paper') {
        pushMargin = (
            titleHeight +
            title.pad.t +
            title.pad.b
        );
    } else if(title.yref === 'container') {
        pushMargin = (
            containerPushVal(position, titleY, titleYanchor, gd._fullLayout.height, titleHeight) +
            title.pad.t +
            title.pad.b
        );
    }
    if(pushMargin > curMargin) {
        return pushMargin;
    }
    return 0;
}

function applyTitleAutoMargin(gd?: any, y?: any, pushMargin?: any, titleHeight?: any): any {
    const titleID = 'title.automargin';
    const title: any = gd._fullLayout.title;
    const position = title.y > 0.5 ? 't' : 'b';
    const push: any = {
        x: title.x,
        y: title.y,
        t: 0,
        b: 0
    };
    const reservedPush: any = {};

    if(title.yref === 'paper' && isOutsideContainer(gd, title, position, y, titleHeight)) {
        push[position] = pushMargin;
    } else if(title.yref === 'container') {
        reservedPush[position] = pushMargin;
        gd._fullLayout._reservedMargin[titleID] = reservedPush;
    }
    allowAutoMargin(gd, titleID);
    autoMargin(gd, titleID, push);
}

function getMainTitleX(fullLayout?: any, textAnchor?: any): any {
    const title: any = fullLayout.title;
    const gs = fullLayout._size;
    let hPadShift = 0;

    if(textAnchor === SVG_TEXT_ANCHOR_START) {
        hPadShift = title.pad.l;
    } else if(textAnchor === SVG_TEXT_ANCHOR_END) {
        hPadShift = -title.pad.r;
    }

    switch(title.xref) {
        case 'paper':
            return gs.l + gs.w * title.x + hPadShift;
        case 'container':
        default:
            return fullLayout.width * title.x + hPadShift;
    }
}

function getMainTitleY(fullLayout?: any, dy?: any): any {
    const title: any = fullLayout.title;
    const gs = fullLayout._size;
    let vPadShift = 0;
    if(dy === '0em' || !dy) {
        vPadShift = -title.pad.b;
    } else if(dy === alignmentConstants.CAP_SHIFT + 'em') {
        vPadShift = title.pad.t;
    }

    if(title.y === 'auto') {
        return gs.t / 2;
    } else {
        switch(title.yref) {
            case 'paper':
                return gs.t + gs.h - gs.h * title.y + vPadShift;
            case 'container':
            default:
                return fullLayout.height - fullLayout.height * title.y + vPadShift;
        }
    }
}

function getMainTitleDyAdj(yanchor?: any): any {
    if(yanchor === 'top') {
        return alignmentConstants.CAP_SHIFT + 0.3 + 'em';
    } else if(yanchor === 'bottom') {
        return '-0.3em';
    } else {
        return alignmentConstants.MID_SHIFT + 'em';
    }
}

function getMainTitleTextAnchor(fullLayout?: any): any {
    const title: any = fullLayout.title;

    let textAnchor = SVG_TEXT_ANCHOR_MIDDLE;
    if(isRightAnchor(title)) {
        textAnchor = SVG_TEXT_ANCHOR_END;
    } else if(isLeftAnchor(title)) {
        textAnchor = SVG_TEXT_ANCHOR_START;
    }

    return textAnchor;
}

function getMainTitleDy(fullLayout?: any): any {
    const title: any = fullLayout.title;

    let dy = '0em';
    if(isTopAnchor(title)) {
        dy = alignmentConstants.CAP_SHIFT + 'em';
    } else if(isMiddleAnchor(title)) {
        dy = alignmentConstants.MID_SHIFT + 'em';
    }

    return dy;
}

export const doTraceStyle = function(gd: GraphDiv): any {
    const calcdata = gd.calcdata;
    const editStyleCalls: any[] = [];
    let i;

    for(i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        const cd0: any = cd[0] || {};
        const trace: any = cd0.trace || {};
        const _module = trace._module || {};

        // See if we need to do arraysToCalcdata
        // call it regardless of what change we made, in case
        // supplyDefaults brought in an array that was already
        // in gd.data but not in gd._fullData previously
        const arraysToCalcdata = _module.arraysToCalcdata;
        if(arraysToCalcdata) arraysToCalcdata(cd, trace);

        const editStyle = _module.editStyle;
        if(editStyle) editStyleCalls.push({fn: editStyle, cd0: cd0});
    }

    if(editStyleCalls.length) {
        for(i = 0; i < editStyleCalls.length; i++) {
            const edit = editStyleCalls[i];
            (edit as any).fn(gd, (edit as any).cd0);
        }
        clearGlCanvases(gd);
        redrawReglTraces(gd);
    }

    style(gd);
    Registry.getComponentMethod('legend', 'draw')(gd);

    return previousPromises(gd);
};

export const doColorBars = function(gd: GraphDiv): any {
    Registry.getComponentMethod('colorbar', 'draw')(gd);
    return previousPromises(gd);
};

export const layoutReplot = function(gd: GraphDiv): any {
    const layout = gd.layout;
    gd.layout = (undefined as any);
    return Registry.call('_doPlot', gd, '', layout);
};

export const doLegend = function(gd: GraphDiv): any {
    Registry.getComponentMethod('legend', 'draw')(gd);
    return previousPromises(gd);
};

export const doTicksRelayout = function(gd: GraphDiv): any {
    Axes.draw(gd, 'redraw');

    if(gd._fullLayout._hasOnlyLargeSploms) {
        Registry.subplotsRegistry.splom.updateGrid(gd);
        clearGlCanvases(gd);
        redrawReglTraces(gd);
    }

    drawMainTitle(gd);
    return previousPromises(gd);
};

export const doModeBar = function(gd: GraphDiv): any {
    const fullLayout = gd._fullLayout;

    Registry.getComponentMethod('modebar', 'manage')(gd);

    for(let i = 0; i < fullLayout._basePlotModules.length; i++) {
        const updateFx = fullLayout._basePlotModules[i].updateFx;
        if(updateFx) updateFx(gd);
    }

    return previousPromises(gd);
};

export const doCamera = function(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;
    const sceneIds = fullLayout._subplots.gl3d;

    for(let i = 0; i < sceneIds.length; i++) {
        const sceneLayout = fullLayout[sceneIds[i]];
        const scene = sceneLayout._scene;

        scene.setViewport(sceneLayout);
    }
};

export const drawData = function(gd: GraphDiv): any {
    const fullLayout = gd._fullLayout;

    clearGlCanvases(gd);

    // loop over the base plot modules present on graph
    const basePlotModules = fullLayout._basePlotModules;
    for(let i = 0; i < basePlotModules.length; i++) {
        basePlotModules[i].plot!(gd);
    }

    redrawReglTraces(gd);

    // styling separate from drawing
    style(gd);

    // draw components that can be drawn on axes,
    // and that do not push the margins
    Registry.getComponentMethod('selections', 'draw')(gd);
    Registry.getComponentMethod('shapes', 'draw')(gd);
    Registry.getComponentMethod('annotations', 'draw')(gd);
    Registry.getComponentMethod('images', 'draw')(gd);

    // Mark the first render as complete
    fullLayout._replotting = false;

    return previousPromises(gd);
};

export const redrawReglTraces = function(gd: GraphDiv): void {
    const fullLayout = gd._fullLayout;

    if(fullLayout._has('regl')) {
        const fullData = gd._fullData;
        const cartesianIds: any[] = [];
        const polarIds: any[] = [];
        let i, sp;

        if(fullLayout._hasOnlyLargeSploms) {
            fullLayout._splomGrid.draw();
        }

        // N.B.
        // - Loop over fullData (not _splomScenes) to preserve splom trace-to-trace ordering
        // - Fill list if subplot ids (instead of fullLayout._subplots) to handle cases where all traces
        //   of a given module are `visible !== true`
        for(i = 0; i < fullData.length; i++) {
            const trace: any = fullData[i];

            if(trace.visible === true && trace._length !== 0) {
                if(trace.type === 'splom') {
                    fullLayout._splomScenes[trace.uid].draw();
                } else if(trace.type === 'scattergl') {
                    pushUnique(cartesianIds, trace.xaxis + trace.yaxis);
                } else if(trace.type === 'scatterpolargl') {
                    pushUnique(polarIds, trace.subplot);
                }
            }
        }

        for(i = 0; i < cartesianIds.length; i++) {
            sp = fullLayout._plots[cartesianIds[i]];
            if(sp._scene) sp._scene.draw();
        }

        for(i = 0; i < polarIds.length; i++) {
            sp = fullLayout[polarIds[i]]._subplot;
            if(sp._scene) sp._scene.draw();
        }
    }
};

export const doAutoRangeAndConstraints = function(gd: GraphDiv): void {
    const axList = Axes.list(gd, '', true);
    let ax;

    const autoRangeDone: any = {};

    for(let i = 0; i < axList.length; i++) {
        ax = axList[i];

        if(!autoRangeDone[ax._id]) {
            autoRangeDone[ax._id] = 1;
            cleanAxisConstraints(gd, ax);
            doAutoRange(gd, ax);

            // For matching axes, just propagate this autorange to the group.
            // The extra arg to doAutoRange avoids recalculating the range,
            // since doAutoRange by itself accounts for all matching axes. but
            // there are other side-effects of doAutoRange that we still want.
            const matchGroup = ax._matchGroup;
            if(matchGroup) {
                for(const id2 in matchGroup) {
                    const ax2 = Axes.getFromId(gd, id2);
                    doAutoRange(gd, ax2, ax.range);
                    autoRangeDone[id2] = 1;
                }
            }
        }
    }

    enforceAxisConstraints(gd);
};

export const finalDraw = function(gd: GraphDiv): void {
    // TODO: rangesliders really belong in marginPushers but they need to be
    // drawn after data - can we at least get the margin pushing part separated
    // out and done earlier?
    Registry.getComponentMethod('rangeslider', 'draw')(gd);
    // TODO: rangeselector only needs to be here (in addition to drawMarginPushers)
    // because the margins need to be fully determined before we can call
    // autorange and update axis ranges (which rangeselector needs to know which
    // button is active). Can we break out its automargin step from its draw step?
    Registry.getComponentMethod('rangeselector', 'draw')(gd);
};

export const drawMarginPushers = function(gd: GraphDiv): void {
    Registry.getComponentMethod('legend', 'draw')(gd);
    Registry.getComponentMethod('rangeselector', 'draw')(gd);
    Registry.getComponentMethod('sliders', 'draw')(gd);
    Registry.getComponentMethod('updatemenus', 'draw')(gd);
    Registry.getComponentMethod('colorbar', 'draw')(gd);
};

export default { layoutStyles, drawMainTitle, doTraceStyle, doColorBars, layoutReplot, doLegend, doTicksRelayout, doModeBar, doCamera, drawData, redrawReglTraces, doAutoRangeAndConstraints, finalDraw, drawMarginPushers };
