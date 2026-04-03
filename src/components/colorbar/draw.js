import { select } from 'd3-selection';
import { extent, min, max } from 'd3-array';
import tinycolor from 'tinycolor2';
import Plots from '../../plots/plots.js';
import { _guiRelayout, _guiRestyle } from '../../plot_api/plot_api.js';
import Axes from '../../plots/cartesian/axes.js';
import dragElement from '../dragelement/index.js';
import Lib from '../../lib/index.js';
import { extendFlat } from '../../lib/extend.js';
import setCursor from '../../lib/setcursor.js';
import { bBox, getTranslate, gradient, lineGroupStyle } from '../drawing/index.js';
import Color from '../color/index.js';
import Titles from '../titles/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import _helpers from '../colorscale/helpers.js';
const { flipScale } = _helpers;
import handleAxisDefaults from '../../plots/cartesian/axis_defaults.js';
import handleAxisPositionDefaults from '../../plots/cartesian/position_defaults.js';
import axisLayoutAttrs from '../../plots/cartesian/layout_attributes.js';
import alignmentConstants from '../../constants/alignment.js';
import _constants from './constants.js';
const { cn } = _constants;
const strTranslate = Lib.strTranslate;
const LINE_SPACING = alignmentConstants.LINE_SPACING;
const FROM_TL = alignmentConstants.FROM_TL;
const FROM_BR = alignmentConstants.FROM_BR;
function draw(gd) {
    const fullLayout = gd._fullLayout;
    const colorBars = fullLayout._infolayer
        .selectAll('g.' + cn.colorbar)
        .data(makeColorBarData(gd), function (opts) { return opts._id; });
    colorBars.exit()
        .each(function (opts) { Plots.autoMargin(gd, opts._id); })
        .remove();
    const colorBarsEnter = colorBars.enter().append('g')
        .attr('class', function (opts) { return opts._id; })
        .classed(cn.colorbar, true);
    const colorBarsMerged = colorBars.merge(colorBarsEnter);
    colorBarsMerged.each(function (opts) {
        const g = select(this);
        Lib.ensureSingle(g, 'rect', cn.cbbg);
        Lib.ensureSingle(g, 'g', cn.cbfills);
        Lib.ensureSingle(g, 'g', cn.cblines);
        Lib.ensureSingle(g, 'g', cn.cbaxis, function (s) { s.classed(cn.crisp, true); });
        Lib.ensureSingle(g, 'g', cn.cbtitleunshift, function (s) { s.append('g').classed(cn.cbtitle, true); });
        Lib.ensureSingle(g, 'rect', cn.cboutline);
        const done = drawColorBar(g, opts, gd);
        if (done && done.then)
            (gd._promises || []).push(done);
        if (gd._context.edits.colorbarPosition) {
            makeEditable(g, opts, gd);
        }
    });
    colorBarsMerged.order();
}
function makeColorBarData(gd) {
    const fullLayout = gd._fullLayout;
    const calcdata = gd.calcdata;
    const out = [];
    // single out item
    let opts;
    // colorbar attr parent container
    let cont;
    // trace attr container
    let trace;
    // colorbar options
    let cbOpt;
    function initOpts(opts) {
        return extendFlat(opts, {
            // fillcolor can be a d3 scale, domain is z values, range is colors
            // or leave it out for no fill,
            // or set to a string constant for single-color fill
            _fillcolor: null,
            // line.color has the same options as fillcolor
            _line: { color: null, width: null, dash: null },
            // levels of lines to draw.
            // note that this DOES NOT determine the extent of the bar
            // that's given by the domain of fillcolor
            // (or line.color if no fillcolor domain)
            _levels: { start: null, end: null, size: null },
            // separate fill levels (for example, heatmap coloring of a
            // contour map) if this is omitted, fillcolors will be
            // evaluated halfway between levels
            _filllevels: null,
            // for continuous colorscales: fill with a gradient instead of explicit levels
            // value should be the colorscale [[0, c0], [v1, c1], ..., [1, cEnd]]
            _fillgradient: null,
            // when using a gradient, we need the data range specified separately
            _zrange: null
        });
    }
    function calcOpts() {
        if (typeof cbOpt.calc === 'function') {
            cbOpt.calc(gd, trace, opts);
        }
        else {
            opts._fillgradient = cont.reversescale ?
                flipScale(cont.colorscale) :
                cont.colorscale;
            opts._zrange = [cont[cbOpt.min], cont[cbOpt.max]];
        }
    }
    for (let i = 0; i < calcdata.length; i++) {
        const cd = calcdata[i];
        trace = cd[0].trace;
        if (!trace._module)
            continue;
        const moduleOpts = trace._module.colorbar;
        if (trace.visible === true && moduleOpts) {
            const allowsMultiplotCbs = Array.isArray(moduleOpts);
            const cbOpts = allowsMultiplotCbs ? moduleOpts : [moduleOpts];
            for (let j = 0; j < cbOpts.length; j++) {
                cbOpt = cbOpts[j];
                const contName = cbOpt.container;
                cont = contName ? trace[contName] : trace;
                if (cont && cont.showscale) {
                    opts = initOpts(cont.colorbar);
                    opts._id = 'cb' + trace.uid + (allowsMultiplotCbs && contName ? '-' + contName : '');
                    opts._traceIndex = trace.index;
                    opts._propPrefix = (contName ? contName + '.' : '') + 'colorbar.';
                    opts._meta = trace._meta;
                    calcOpts();
                    out.push(opts);
                }
            }
        }
    }
    for (const k in fullLayout._colorAxes) {
        cont = fullLayout[k];
        if (cont.showscale) {
            const colorAxOpts = fullLayout._colorAxes[k];
            opts = initOpts(cont.colorbar);
            opts._id = 'cb' + k;
            opts._propPrefix = k + '.colorbar.';
            opts._meta = fullLayout._meta;
            cbOpt = { min: 'cmin', max: 'cmax' };
            if (colorAxOpts[0] !== 'heatmap') {
                trace = colorAxOpts[1];
                cbOpt.calc = trace._module.colorbar.calc;
            }
            calcOpts();
            out.push(opts);
        }
    }
    return out;
}
function drawColorBar(g, opts, gd) {
    const isVertical = opts.orientation === 'v';
    const len = opts.len;
    const lenmode = opts.lenmode;
    const thickness = opts.thickness;
    const thicknessmode = opts.thicknessmode;
    const outlinewidth = opts.outlinewidth;
    const borderwidth = opts.borderwidth;
    const bgcolor = opts.bgcolor;
    const xanchor = opts.xanchor;
    const yanchor = opts.yanchor;
    const xpad = opts.xpad;
    const ypad = opts.ypad;
    const optsX = opts.x;
    const optsY = isVertical ? opts.y : 1 - opts.y;
    const isPaperY = opts.yref === 'paper';
    const isPaperX = opts.xref === 'paper';
    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;
    const fillColor = opts._fillcolor;
    const line = opts._line;
    const title = opts.title;
    const titleSide = title.side;
    const zrange = opts._zrange ||
        extent((typeof fillColor === 'function' ? fillColor : line.color).domain());
    const lineColormap = typeof line.color === 'function' ?
        line.color :
        function () { return line.color; };
    const fillColormap = typeof fillColor === 'function' ?
        fillColor :
        function () { return fillColor; };
    const levelsIn = opts._levels;
    const levelsOut = calcLevels(gd, opts, zrange);
    const fillLevels = levelsOut.fill;
    const lineLevels = levelsOut.line;
    // we calculate pixel sizes based on the specified graph size,
    // not the actual (in case something pushed the margins around)
    // which is a little odd but avoids an odd iterative effect
    // when the colorbar itself is pushing the margins.
    // but then the fractional size is calculated based on the
    // actual graph size, so that the axes will size correctly.
    const thickPx = Math.round(thickness * (thicknessmode === 'fraction' ? (isVertical ? gs.w : gs.h) : 1));
    const thickFrac = thickPx / (isVertical ? gs.w : gs.h);
    const lenPx = Math.round(len * (lenmode === 'fraction' ? (isVertical ? gs.h : gs.w) : 1));
    const lenFrac = lenPx / (isVertical ? gs.h : gs.w);
    const posW = isPaperX ? gs.w : gd._fullLayout.width;
    const posH = isPaperY ? gs.h : gd._fullLayout.height;
    // x positioning: do it initially just for left anchor,
    // then fix at the end (since we don't know the width yet)
    const uPx = Math.round(isVertical ?
        optsX * posW + xpad :
        optsY * posH + ypad);
    const xRatio = { center: 0.5, right: 1 }[xanchor] || 0;
    const yRatio = { top: 1, middle: 0.5 }[yanchor] || 0;
    // for dragging... this is getting a little muddled...
    const uFrac = isVertical ?
        optsX - xRatio * thickFrac :
        optsY - yRatio * thickFrac;
    // y/x positioning (for v/h) we can do correctly from the start
    const vFrac = isVertical ?
        optsY - yRatio * lenFrac :
        optsX - xRatio * lenFrac;
    const vPx = Math.round(isVertical ?
        posH * (1 - vFrac) :
        posW * vFrac);
    // stash a few things for makeEditable
    opts._lenFrac = lenFrac;
    opts._thickFrac = thickFrac;
    opts._uFrac = uFrac;
    opts._vFrac = vFrac;
    // stash mocked axis for contour label formatting
    const ax = opts._axis = mockColorBarAxis(gd, opts, zrange);
    // position can't go in through supplyDefaults
    // because that restricts it to [0,1]
    ax.position = thickFrac + (isVertical ?
        optsX + xpad / gs.w :
        optsY + ypad / gs.h);
    const topOrBottom = ['top', 'bottom'].indexOf(titleSide) !== -1;
    if (isVertical && topOrBottom) {
        ax.title.side = titleSide;
        ax.titlex = optsX + xpad / gs.w;
        ax.titley = vFrac + (title.side === 'top' ? lenFrac - ypad / gs.h : ypad / gs.h);
    }
    if (!isVertical && !topOrBottom) {
        ax.title.side = titleSide;
        ax.titley = optsY + ypad / gs.h;
        ax.titlex = vFrac + xpad / gs.w; // right side
    }
    if (line.color && opts.tickmode === 'auto') {
        ax.tickmode = 'linear';
        ax.tick0 = levelsIn.start;
        let dtick = levelsIn.size;
        // expand if too many contours, so we don't get too many ticks
        const autoNtick = Lib.constrain(lenPx / 50, 4, 15) + 1;
        const dtFactor = (zrange[1] - zrange[0]) / ((opts.nticks || autoNtick) * dtick);
        if (dtFactor > 1) {
            const dtexp = Math.pow(10, Math.floor(Math.log(dtFactor) / Math.LN10));
            dtick *= dtexp * Lib.roundUp(dtFactor / dtexp, [2, 5, 10]);
            // if the contours are at round multiples, reset tick0
            // so they're still at round multiples. Otherwise,
            // keep the first label on the first contour level
            if ((Math.abs(levelsIn.start) / levelsIn.size + 1e-6) % 1 < 2e-6) {
                ax.tick0 = 0;
            }
        }
        ax.dtick = dtick;
    }
    // set domain after init, because we may want to
    // allow it outside [0,1]
    ax.domain = isVertical ? [
        vFrac + ypad / gs.h,
        vFrac + lenFrac - ypad / gs.h
    ] : [
        vFrac + xpad / gs.w,
        vFrac + lenFrac - xpad / gs.w
    ];
    ax.setScale();
    g.attr('transform', strTranslate(Math.round(gs.l), Math.round(gs.t)));
    const titleCont = g.select('.' + cn.cbtitleunshift)
        .attr('transform', strTranslate(-Math.round(gs.l), -Math.round(gs.t)));
    const ticklabelposition = ax.ticklabelposition;
    const titleFontSize = ax.title.font.size;
    const axLayer = g.select('.' + cn.cbaxis);
    let titleEl;
    let titleHeight = 0;
    let titleWidth = 0;
    function drawTitle(titleClass, titleOpts) {
        const dfltTitleOpts = {
            propContainer: ax,
            propName: opts._propPrefix + 'title.text',
            traceIndex: opts._traceIndex,
            _meta: opts._meta,
            placeholder: fullLayout._dfltTitle.colorbar,
            containerGroup: g.select('.' + cn.cbtitle)
        };
        // this class-to-rotate thing with convertToTspans is
        // getting hackier and hackier... delete groups with the
        // wrong class (in case earlier the colorbar was drawn on
        // a different side, I think?)
        const otherClass = titleClass.charAt(0) === 'h' ?
            titleClass.slice(1) :
            'h' + titleClass;
        g.selectAll('.' + otherClass + ',.' + otherClass + '-math-group').remove();
        Titles.draw(gd, titleClass, extendFlat(dfltTitleOpts, titleOpts || {}));
    }
    function drawDummyTitle() {
        // draw the title so we know how much room it needs
        // when we squish the axis.
        // On vertical colorbars this only applies to top or bottom titles, not right side.
        // On horizontal colorbars this only applies to right, etc.
        if ((isVertical && topOrBottom) ||
            (!isVertical && !topOrBottom)) {
            let x, y;
            if (titleSide === 'top') {
                x = xpad + gs.l + posW * optsX;
                y = ypad + gs.t + posH * (1 - vFrac - lenFrac) + 3 + titleFontSize * 0.75;
            }
            if (titleSide === 'bottom') {
                x = xpad + gs.l + posW * optsX;
                y = ypad + gs.t + posH * (1 - vFrac) - 3 - titleFontSize * 0.25;
            }
            if (titleSide === 'right') {
                y = ypad + gs.t + posH * optsY + 3 + titleFontSize * 0.75;
                x = xpad + gs.l + posW * vFrac;
            }
            drawTitle(ax._id + 'title', {
                attributes: { x: x, y: y, 'text-anchor': isVertical ? 'start' : 'middle' }
            });
        }
    }
    function drawCbTitle() {
        if ((isVertical && !topOrBottom) ||
            (!isVertical && topOrBottom)) {
            const pos = ax.position || 0;
            const mid = ax._offset + ax._length / 2;
            let x, y;
            if (titleSide === 'right') {
                y = mid;
                x = gs.l + posW * pos + 10 + titleFontSize * (ax.showticklabels ? 1 : 0.5);
            }
            else {
                x = mid;
                if (titleSide === 'bottom') {
                    y = gs.t + posH * pos + 10 + (ticklabelposition.indexOf('inside') === -1 ?
                        ax.tickfont.size :
                        0) + (ax.ticks !== 'inside' ?
                        opts.ticklen || 0 :
                        0);
                }
                if (titleSide === 'top') {
                    const nlines = title.text.split('<br>').length;
                    y = gs.t + posH * pos + 10 - thickPx - LINE_SPACING * titleFontSize * nlines;
                }
            }
            drawTitle((isVertical ?
                // the 'h' + is a hack to get around the fact that
                // convertToTspans rotates any 'y...' class by 90 degrees.
                // TODO: find a better way to control this.
                'h' :
                'v') + ax._id + 'title', {
                avoid: {
                    selection: select(gd).selectAll('g.' + ax._id + 'tick'),
                    side: titleSide,
                    offsetTop: isVertical ? 0 : gs.t,
                    offsetLeft: isVertical ? gs.l : 0,
                    maxShift: isVertical ? fullLayout.width : fullLayout.height
                },
                attributes: { x: x, y: y, 'text-anchor': 'middle' },
                transform: { rotate: isVertical ? -90 : 0, offset: 0 }
            });
        }
    }
    function drawAxis() {
        if ((!isVertical && !topOrBottom) ||
            (isVertical && topOrBottom)) {
            // squish the axis top to make room for the title
            const titleGroup = g.select('.' + cn.cbtitle);
            const titleText = titleGroup.select('text');
            const titleTrans = [-outlinewidth / 2, outlinewidth / 2];
            const mathJaxNode = titleGroup
                .select('.h' + ax._id + 'title-math-group')
                .node();
            let lineSize = 15.6;
            if (titleText.node()) {
                lineSize = parseInt(titleText.node().style.fontSize, 10) * LINE_SPACING;
            }
            let bb;
            if (mathJaxNode) {
                bb = bBox(mathJaxNode);
                titleWidth = bb.width;
                titleHeight = bb.height;
                if (titleHeight > lineSize) {
                    // not entirely sure how mathjax is doing
                    // vertical alignment, but this seems to work.
                    titleTrans[1] -= (titleHeight - lineSize) / 2;
                }
            }
            else if (titleText.node() && !titleText.classed(cn.jsPlaceholder)) {
                bb = bBox(titleText.node());
                titleWidth = bb.width;
                titleHeight = bb.height;
            }
            if (isVertical) {
                if (titleHeight) {
                    // buffer btwn colorbar and title
                    // TODO: configurable
                    titleHeight += 5;
                    if (titleSide === 'top') {
                        ax.domain[1] -= titleHeight / gs.h;
                        titleTrans[1] *= -1;
                    }
                    else {
                        ax.domain[0] += titleHeight / gs.h;
                        const nlines = svgTextUtils.lineCount(titleText);
                        titleTrans[1] += (1 - nlines) * lineSize;
                    }
                    titleGroup.attr('transform', strTranslate(titleTrans[0], titleTrans[1]));
                    ax.setScale();
                }
            }
            else { // horizontal colorbars
                if (titleWidth) {
                    if (titleSide === 'right') {
                        ax.domain[0] += (titleWidth + titleFontSize / 2) / gs.w;
                    }
                    titleGroup.attr('transform', strTranslate(titleTrans[0], titleTrans[1]));
                    ax.setScale();
                }
            }
        }
        g.selectAll('.' + cn.cbfills + ',.' + cn.cblines)
            .attr('transform', isVertical ?
            strTranslate(0, Math.round(gs.h * (1 - ax.domain[1]))) :
            strTranslate(Math.round(gs.w * ax.domain[0]), 0));
        axLayer.attr('transform', isVertical ?
            strTranslate(0, Math.round(-gs.t)) :
            strTranslate(Math.round(-gs.l), 0));
        const fills = g.select('.' + cn.cbfills)
            .selectAll('rect.' + cn.cbfill)
            .attr('style', '')
            .data(fillLevels);
        const fillsEnter = fills.enter().append('rect')
            .classed(cn.cbfill, true)
            .attr('style', '');
        fills.exit().remove();
        const zBounds = zrange
            .map(ax.c2p)
            .map(Math.round)
            .sort((a, b) => a - b);
        fills.merge(fillsEnter).each(function (d, i) {
            const z = [
                (i === 0) ? zrange[0] : (fillLevels[i] + fillLevels[i - 1]) / 2,
                (i === fillLevels.length - 1) ? zrange[1] : (fillLevels[i] + fillLevels[i + 1]) / 2
            ]
                .map(ax.c2p)
                .map(Math.round);
            // offset the side adjoining the next rectangle so they
            // overlap, to prevent antialiasing gaps
            if (isVertical) {
                z[1] = Lib.constrain(z[1] + ((z[1] > z[0]) ? 1 : -1), zBounds[0], zBounds[1]);
            } /* else {
                // TODO: horizontal case
            } */
            // Colorbar cannot currently support opacities so we
            // use an opaque fill even when alpha channels present
            const fillEl = select(this)
                .attr(isVertical ? 'x' : 'y', uPx)
                .attr(isVertical ? 'y' : 'x', min(z))
                .attr(isVertical ? 'width' : 'height', Math.max(thickPx, 2))
                .attr(isVertical ? 'height' : 'width', Math.max(max(z) - min(z), 2));
            if (opts._fillgradient) {
                gradient(fillEl, gd, opts._id, isVertical ? 'vertical' : 'horizontalreversed', opts._fillgradient, 'fill');
            }
            else {
                // tinycolor can't handle exponents and
                // at this scale, removing it makes no difference.
                const colorString = fillColormap(d).replace('e-', '');
                fillEl.attr('fill', tinycolor(colorString).toHexString());
            }
        });
        const lines = g.select('.' + cn.cblines)
            .selectAll('path.' + cn.cbline)
            .data(line.color && line.width ? lineLevels : []);
        const linesEnter = lines.enter().append('path')
            .classed(cn.cbline, true);
        lines.exit().remove();
        lines.merge(linesEnter).each(function (d) {
            const a = uPx;
            const b = (Math.round(ax.c2p(d)) + (line.width / 2) % 1);
            select(this)
                .attr('d', 'M' +
                (isVertical ? a + ',' + b : b + ',' + a) +
                (isVertical ? 'h' : 'v') +
                thickPx)
                .call(lineGroupStyle, line.width, lineColormap(d), line.dash);
        });
        // force full redraw of labels and ticks
        axLayer.selectAll('g.' + ax._id + 'tick,path').remove();
        const shift = uPx + thickPx +
            (outlinewidth || 0) / 2 - (opts.ticks === 'outside' ? 1 : 0);
        const vals = Axes.calcTicks(ax);
        const tickSign = Axes.getTickSigns(ax)[2];
        Axes.drawTicks(gd, ax, {
            vals: ax.ticks === 'inside' ? Axes.clipEnds(ax, vals) : vals,
            layer: axLayer,
            path: Axes.makeTickPath(ax, shift, tickSign),
            transFn: Axes.makeTransTickFn(ax)
        });
        return Axes.drawLabels(gd, ax, {
            vals: vals,
            layer: axLayer,
            transFn: Axes.makeTransTickLabelFn(ax),
            labelFns: Axes.makeLabelFns(ax, shift)
        });
    }
    // wait for the axis & title to finish rendering before
    // continuing positioning
    // TODO: why are we redrawing multiple times now with this?
    // I guess autoMargin doesn't like being post-promise?
    function positionCB() {
        let bb;
        let innerThickness = thickPx + outlinewidth / 2;
        if (ticklabelposition.indexOf('inside') === -1) {
            bb = bBox(axLayer.node());
            innerThickness += isVertical ? bb.width : bb.height;
        }
        titleEl = titleCont.select('text');
        let titleWidth = 0;
        const topSideVertical = isVertical && titleSide === 'top';
        const rightSideHorizontal = !isVertical && titleSide === 'right';
        let moveY = 0;
        if (titleEl.node() && !titleEl.classed(cn.jsPlaceholder)) {
            let _titleHeight;
            const mathJaxNode = titleCont.select('.h' + ax._id + 'title-math-group').node();
            if (mathJaxNode && ((isVertical && topOrBottom) ||
                (!isVertical && !topOrBottom))) {
                bb = bBox(mathJaxNode);
                titleWidth = bb.width;
                _titleHeight = bb.height;
            }
            else {
                // note: the formula below works for all title sides,
                // (except for top/bottom mathjax, above)
                // but the weird gs.l is because the titleunshift
                // transform gets removed by bBox
                bb = bBox(titleCont.node());
                titleWidth = bb.right - gs.l - (isVertical ? uPx : vPx);
                _titleHeight = bb.bottom - gs.t - (isVertical ? vPx : uPx);
                if (!isVertical && titleSide === 'top') {
                    innerThickness += bb.height;
                    moveY = bb.height;
                }
            }
            if (rightSideHorizontal) {
                titleEl.attr('transform', strTranslate(titleWidth / 2 + titleFontSize / 2, 0));
                titleWidth *= 2;
            }
            innerThickness = Math.max(innerThickness, isVertical ? titleWidth : _titleHeight);
        }
        let outerThickness = (isVertical ?
            xpad :
            ypad) * 2 + innerThickness + borderwidth + outlinewidth / 2;
        let hColorbarMoveTitle = 0;
        if (!isVertical && title.text && yanchor === 'bottom' && optsY <= 0) {
            hColorbarMoveTitle = outerThickness / 2;
            outerThickness += hColorbarMoveTitle;
            moveY += hColorbarMoveTitle;
        }
        fullLayout._hColorbarMoveTitle = hColorbarMoveTitle;
        fullLayout._hColorbarMoveCBTitle = moveY;
        const extraW = borderwidth + outlinewidth;
        // TODO - are these the correct positions?
        const lx = (isVertical ? uPx : vPx) - extraW / 2 - (isVertical ? xpad : 0);
        const ly = (isVertical ? vPx : uPx) - (isVertical ? lenPx : ypad + moveY - hColorbarMoveTitle);
        g.select('.' + cn.cbbg)
            .attr('x', lx)
            .attr('y', ly)
            .attr(isVertical ? 'width' : 'height', Math.max(outerThickness - hColorbarMoveTitle, 2))
            .attr(isVertical ? 'height' : 'width', Math.max(lenPx + extraW, 2))
            .call(Color.fill, bgcolor)
            .call(Color.stroke, opts.bordercolor)
            .style('stroke-width', borderwidth);
        const moveX = rightSideHorizontal ? Math.max(titleWidth - 10, 0) : 0;
        g.selectAll('.' + cn.cboutline)
            .attr('x', (isVertical ? uPx : vPx + xpad) + moveX)
            .attr('y', (isVertical ? vPx + ypad - lenPx : uPx) + (topSideVertical ? titleHeight : 0))
            .attr(isVertical ? 'width' : 'height', Math.max(thickPx, 2))
            .attr(isVertical ? 'height' : 'width', Math.max(lenPx - (isVertical ?
            2 * ypad + titleHeight :
            2 * xpad + moveX), 2))
            .call(Color.stroke, opts.outlinecolor)
            .style('fill', 'none')
            .style('stroke-width', outlinewidth);
        let xShift = ((isVertical ? xRatio * outerThickness : 0));
        let yShift = ((isVertical ? 0 : (1 - yRatio) * outerThickness - moveY));
        xShift = isPaperX ? gs.l - xShift : -xShift;
        yShift = isPaperY ? gs.t - yShift : -yShift;
        g.attr('transform', strTranslate(xShift, yShift));
        if (!isVertical && (borderwidth || (tinycolor(bgcolor).getAlpha() &&
            !tinycolor.equals(fullLayout.paper_bgcolor, bgcolor)))) {
            // for horizontal colorbars when there is a border line or having different background color
            // hide/adjust x positioning for the first/last tick labels if they go outside the border
            const tickLabels = axLayer.selectAll('text');
            const numTicks = tickLabels[0].length;
            const border = g.select('.' + cn.cbbg).node();
            const oBb = bBox(border);
            const oTr = getTranslate(g);
            const TEXTPAD = 2;
            tickLabels.each(function (d, i) {
                const first = 0;
                const last = numTicks - 1;
                if (i === first || i === last) {
                    const iBb = bBox(this);
                    const iTr = getTranslate(this);
                    let deltaX;
                    if (i === last) {
                        const iRight = iBb.right + iTr.x;
                        const oRight = oBb.right + oTr.x + vPx - borderwidth - TEXTPAD + optsX;
                        deltaX = oRight - iRight;
                        if (deltaX > 0)
                            deltaX = 0;
                    }
                    else if (i === first) {
                        const iLeft = iBb.left + iTr.x;
                        const oLeft = oBb.left + oTr.x + vPx + borderwidth + TEXTPAD;
                        deltaX = oLeft - iLeft;
                        if (deltaX < 0)
                            deltaX = 0;
                    }
                    if (deltaX) {
                        if (numTicks < 3) { // adjust position
                            this.setAttribute('transform', 'translate(' + deltaX + ',0) ' +
                                this.getAttribute('transform'));
                        }
                        else { // hide
                            this.setAttribute('visibility', 'hidden');
                        }
                    }
                }
            });
        }
        // auto margin adjustment
        const marginOpts = {};
        const lFrac = FROM_TL[xanchor];
        const rFrac = FROM_BR[xanchor];
        const tFrac = FROM_TL[yanchor];
        const bFrac = FROM_BR[yanchor];
        const extraThickness = outerThickness - thickPx;
        if (isVertical) {
            if (lenmode === 'pixels') {
                marginOpts.y = optsY;
                marginOpts.t = lenPx * tFrac;
                marginOpts.b = lenPx * bFrac;
            }
            else {
                marginOpts.t = marginOpts.b = 0;
                marginOpts.yt = optsY + len * tFrac;
                marginOpts.yb = optsY - len * bFrac;
            }
            if (thicknessmode === 'pixels') {
                marginOpts.x = optsX;
                marginOpts.l = outerThickness * lFrac;
                marginOpts.r = outerThickness * rFrac;
            }
            else {
                marginOpts.l = extraThickness * lFrac;
                marginOpts.r = extraThickness * rFrac;
                marginOpts.xl = optsX - thickness * lFrac;
                marginOpts.xr = optsX + thickness * rFrac;
            }
        }
        else { // horizontal colorbars
            if (lenmode === 'pixels') {
                marginOpts.x = optsX;
                marginOpts.l = lenPx * lFrac;
                marginOpts.r = lenPx * rFrac;
            }
            else {
                marginOpts.l = marginOpts.r = 0;
                marginOpts.xl = optsX + len * lFrac;
                marginOpts.xr = optsX - len * rFrac;
            }
            if (thicknessmode === 'pixels') {
                marginOpts.y = 1 - optsY;
                marginOpts.t = outerThickness * tFrac;
                marginOpts.b = outerThickness * bFrac;
            }
            else {
                marginOpts.t = extraThickness * tFrac;
                marginOpts.b = extraThickness * bFrac;
                marginOpts.yt = optsY - thickness * tFrac;
                marginOpts.yb = optsY + thickness * bFrac;
            }
        }
        const sideY = opts.y < 0.5 ? 'b' : 't';
        const sideX = opts.x < 0.5 ? 'l' : 'r';
        gd._fullLayout._reservedMargin[opts._id] = {};
        const possibleReservedMargins = {
            r: (fullLayout.width - lx - xShift),
            l: lx + marginOpts.r,
            b: (fullLayout.height - ly - yShift),
            t: ly + marginOpts.b
        };
        if (isPaperX && isPaperY) {
            Plots.autoMargin(gd, opts._id, marginOpts);
        }
        else if (isPaperX) {
            gd._fullLayout._reservedMargin[opts._id][sideY] = possibleReservedMargins[sideY];
        }
        else if (isPaperY) {
            gd._fullLayout._reservedMargin[opts._id][sideX] = possibleReservedMargins[sideX];
        }
        else {
            if (isVertical) {
                gd._fullLayout._reservedMargin[opts._id][sideX] = possibleReservedMargins[sideX];
            }
            else {
                gd._fullLayout._reservedMargin[opts._id][sideY] = possibleReservedMargins[sideY];
            }
        }
    }
    return Lib.syncOrAsync([
        Plots.previousPromises,
        drawDummyTitle,
        drawAxis,
        drawCbTitle,
        Plots.previousPromises,
        positionCB
    ], gd);
}
function makeEditable(g, opts, gd) {
    const isVertical = opts.orientation === 'v';
    const fullLayout = gd._fullLayout;
    const gs = fullLayout._size;
    let t0, xf, yf;
    dragElement.init({
        element: g.node(),
        gd: gd,
        prepFn: function () {
            t0 = g.attr('transform');
            setCursor(g);
        },
        moveFn: function (dx, dy) {
            g.attr('transform', t0 + strTranslate(dx, dy));
            xf = dragElement.align((isVertical ? opts._uFrac : opts._vFrac) + (dx / gs.w), isVertical ? opts._thickFrac : opts._lenFrac, 0, 1, opts.xanchor);
            yf = dragElement.align((isVertical ? opts._vFrac : (1 - opts._uFrac)) - (dy / gs.h), isVertical ? opts._lenFrac : opts._thickFrac, 0, 1, opts.yanchor);
            const csr = dragElement.getCursor(xf, yf, opts.xanchor, opts.yanchor);
            setCursor(g, csr);
        },
        doneFn: function () {
            setCursor(g);
            if (xf !== undefined && yf !== undefined) {
                const update = {};
                update[opts._propPrefix + 'x'] = xf;
                update[opts._propPrefix + 'y'] = yf;
                if (opts._traceIndex !== undefined) {
                    _guiRestyle(gd, update, opts._traceIndex);
                }
                else {
                    _guiRelayout(gd, update);
                }
            }
        }
    });
}
function calcLevels(gd, opts, zrange) {
    const levelsIn = opts._levels;
    const lineLevels = [];
    let fillLevels = [];
    let l;
    let i;
    let l0 = levelsIn.end + levelsIn.size / 100;
    let ls = levelsIn.size;
    const zr0 = (1.001 * zrange[0] - 0.001 * zrange[1]);
    const zr1 = (1.001 * zrange[1] - 0.001 * zrange[0]);
    for (i = 0; i < 1e5; i++) {
        l = levelsIn.start + i * ls;
        if (ls > 0 ? (l >= l0) : (l <= l0))
            break;
        if (l > zr0 && l < zr1)
            lineLevels.push(l);
    }
    if (opts._fillgradient) {
        fillLevels = [0];
    }
    else if (typeof opts._fillcolor === 'function') {
        const fillLevelsIn = opts._filllevels;
        if (fillLevelsIn) {
            l0 = fillLevelsIn.end + fillLevelsIn.size / 100;
            ls = fillLevelsIn.size;
            for (i = 0; i < 1e5; i++) {
                l = fillLevelsIn.start + i * ls;
                if (ls > 0 ? (l >= l0) : (l <= l0))
                    break;
                if (l > zrange[0] && l < zrange[1])
                    fillLevels.push(l);
            }
        }
        else {
            fillLevels = lineLevels.map((v) => v - levelsIn.size / 2);
            fillLevels.push(fillLevels[fillLevels.length - 1] + levelsIn.size);
        }
    }
    else if (opts._fillcolor && typeof opts._fillcolor === 'string') {
        // doesn't matter what this value is, with a single value
        // we'll make a single fill rect covering the whole bar
        fillLevels = [0];
    }
    if (levelsIn.size < 0) {
        lineLevels.reverse();
        fillLevels.reverse();
    }
    return { line: lineLevels, fill: fillLevels };
}
function mockColorBarAxis(gd, opts, zrange) {
    const fullLayout = gd._fullLayout;
    const isVertical = opts.orientation === 'v';
    const cbAxisIn = {
        type: 'linear',
        range: zrange,
        tickmode: opts.tickmode,
        nticks: opts.nticks,
        tick0: opts.tick0,
        dtick: opts.dtick,
        tickvals: opts.tickvals,
        ticktext: opts.ticktext,
        ticks: opts.ticks,
        ticklen: opts.ticklen,
        tickwidth: opts.tickwidth,
        tickcolor: opts.tickcolor,
        showticklabels: opts.showticklabels,
        labelalias: opts.labelalias,
        ticklabelposition: opts.ticklabelposition,
        ticklabeloverflow: opts.ticklabeloverflow,
        ticklabelstep: opts.ticklabelstep,
        tickfont: opts.tickfont,
        tickangle: opts.tickangle,
        tickformat: opts.tickformat,
        exponentformat: opts.exponentformat,
        minexponent: opts.minexponent,
        separatethousands: opts.separatethousands,
        showexponent: opts.showexponent,
        showtickprefix: opts.showtickprefix,
        tickprefix: opts.tickprefix,
        showticksuffix: opts.showticksuffix,
        ticksuffix: opts.ticksuffix,
        title: opts.title,
        showline: true,
        anchor: 'free',
        side: isVertical ? 'right' : 'bottom',
        position: 1
    };
    const letter = isVertical ? 'y' : 'x';
    const cbAxisOut = {
        type: 'linear',
        _id: letter + opts._id
    };
    const axisOptions = {
        letter: letter,
        font: fullLayout.font,
        noAutotickangles: letter === 'y',
        noHover: true,
        noTickson: true,
        noTicklabelmode: true,
        noInsideRange: true,
        calendar: fullLayout.calendar // not really necessary (yet?)
    };
    function coerce(attr, dflt) {
        return Lib.coerce(cbAxisIn, cbAxisOut, axisLayoutAttrs, attr, dflt);
    }
    handleAxisDefaults(cbAxisIn, cbAxisOut, coerce, axisOptions, fullLayout);
    handleAxisPositionDefaults(cbAxisIn, cbAxisOut, coerce, axisOptions);
    return cbAxisOut;
}
export default {
    draw: draw
};
