import { select } from 'd3-selection';
import { _guiRelayout } from '../../plot_api/plot_api.js';
import Plots from '../../plots/plots.js';
import Color from '../color/index.js';
import { bBox, font as drawingFont } from '../drawing/index.js';
import Lib from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import axisIds from '../../plots/cartesian/axis_ids.js';
import alignmentConstants from '../../constants/alignment.js';
import constants from './constants.js';
import getUpdateObject from './get_update_object.js';
const strTranslate = Lib.strTranslate;
const LINE_SPACING = alignmentConstants.LINE_SPACING;
const FROM_TL = alignmentConstants.FROM_TL;
const FROM_BR = alignmentConstants.FROM_BR;
export default function draw(gd) {
    const fullLayout = gd._fullLayout;
    const selectors = fullLayout._infolayer.selectAll('.rangeselector')
        .data(makeSelectorData(gd), selectorKeyFunc);
    const selectorsEnter = selectors.enter().append('g')
        .classed('rangeselector', true);
    selectors.exit().remove();
    const selectorsMerged = selectors.merge(selectorsEnter);
    selectorsMerged
        .style('cursor', 'pointer')
        .style('pointer-events', 'all');
    selectorsMerged.each(function (d) {
        const selector = select(this);
        const axisLayout = d;
        const selectorLayout = axisLayout.rangeselector;
        const buttonsJoin = selector.selectAll('g.button')
            .data(Lib.filterVisible(selectorLayout.buttons));
        const buttonsEnter = buttonsJoin.enter().append('g')
            .classed('button', true);
        buttonsJoin.exit().remove();
        const buttons = buttonsJoin.merge(buttonsEnter);
        buttons.each(function (d) {
            const button = select(this);
            const update = getUpdateObject(axisLayout, d);
            d._isActive = isActive(axisLayout, d, update);
            button.call(drawButtonRect, selectorLayout, d);
            button.call(drawButtonText, selectorLayout, d, gd);
            button.on('click', function () {
                if (gd._dragged)
                    return;
                _guiRelayout(gd, update);
            });
            button.on('mouseover', function () {
                d._isHovered = true;
                button.call(drawButtonRect, selectorLayout, d);
            });
            button.on('mouseout', function () {
                d._isHovered = false;
                button.call(drawButtonRect, selectorLayout, d);
            });
        });
        reposition(gd, buttons, selectorLayout, axisLayout._name, selector);
    });
}
function makeSelectorData(gd) {
    const axes = axisIds.list(gd, 'x', true);
    const data = [];
    for (let i = 0; i < axes.length; i++) {
        const axis = axes[i];
        if (axis.rangeselector && axis.rangeselector.visible) {
            data.push(axis);
        }
    }
    return data;
}
function selectorKeyFunc(d) {
    return d._id;
}
function isActive(axisLayout, opts, update) {
    if (opts.step === 'all') {
        return axisLayout.autorange === true;
    }
    else {
        const keys = Object.keys(update);
        return (axisLayout.range[0] === update[keys[0]] &&
            axisLayout.range[1] === update[keys[1]]);
    }
}
function drawButtonRect(button, selectorLayout, d) {
    const rect = Lib.ensureSingle(button, 'rect', 'selector-rect', function (s) {
        s.attr('shape-rendering', 'crispEdges');
    });
    rect
        .attr('rx', constants.rx)
        .attr('ry', constants.ry);
    rect.call(Color.stroke, selectorLayout.bordercolor)
        .call(Color.fill, getFillColor(selectorLayout, d))
        .style('stroke-width', selectorLayout.borderwidth + 'px');
}
function getFillColor(selectorLayout, d) {
    return (d._isActive || d._isHovered) ?
        selectorLayout.activecolor :
        selectorLayout.bgcolor;
}
function drawButtonText(button, selectorLayout, d, gd) {
    function textLayout(s) {
        svgTextUtils.convertToTspans(s, gd);
    }
    const text = Lib.ensureSingle(button, 'text', 'selector-text', function (s) {
        s.attr('text-anchor', 'middle');
    });
    text.call(drawingFont, selectorLayout.font)
        .text(getLabel(d, gd._fullLayout._meta))
        .call(textLayout);
}
function getLabel(opts, _meta) {
    if (opts.label) {
        return _meta ?
            Lib.templateString(opts.label, _meta) :
            opts.label;
    }
    if (opts.step === 'all')
        return 'all';
    return opts.count + opts.step.charAt(0);
}
function reposition(gd, buttons, opts, axName, selector) {
    let width = 0;
    let height = 0;
    const borderWidth = opts.borderwidth;
    buttons.each(function () {
        const button = select(this);
        const text = button.select('.selector-text');
        const tHeight = opts.font.size * LINE_SPACING;
        const hEff = Math.max(tHeight * svgTextUtils.lineCount(text), 16) + 3;
        height = Math.max(height, hEff);
    });
    buttons.each(function () {
        const button = select(this);
        const rect = button.select('.selector-rect');
        const text = button.select('.selector-text');
        const tWidth = text.node() && bBox(text.node()).width;
        const tHeight = opts.font.size * LINE_SPACING;
        const tLines = svgTextUtils.lineCount(text);
        const wEff = Math.max(tWidth + 10, constants.minButtonWidth);
        // TODO add MathJax support
        // TODO add buttongap attribute
        button.attr('transform', strTranslate(borderWidth + width, borderWidth));
        rect
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', wEff)
            .attr('height', height);
        svgTextUtils.positionText(text, wEff / 2, height / 2 - ((tLines - 1) * tHeight / 2) + 3);
        width += wEff + 5;
    });
    const graphSize = gd._fullLayout._size;
    let lx = graphSize.l + graphSize.w * opts.x;
    let ly = graphSize.t + graphSize.h * (1 - opts.y);
    let xanchor = 'left';
    if (Lib.isRightAnchor(opts)) {
        lx -= width;
        xanchor = 'right';
    }
    if (Lib.isCenterAnchor(opts)) {
        lx -= width / 2;
        xanchor = 'center';
    }
    let yanchor = 'top';
    if (Lib.isBottomAnchor(opts)) {
        ly -= height;
        yanchor = 'bottom';
    }
    if (Lib.isMiddleAnchor(opts)) {
        ly -= height / 2;
        yanchor = 'middle';
    }
    width = Math.ceil(width);
    height = Math.ceil(height);
    lx = Math.round(lx);
    ly = Math.round(ly);
    Plots.autoMargin(gd, axName + '-range-selector', {
        x: opts.x,
        y: opts.y,
        l: width * FROM_TL[xanchor],
        r: width * FROM_BR[xanchor],
        b: height * FROM_BR[yanchor],
        t: height * FROM_TL[yanchor]
    });
    selector.attr('transform', strTranslate(lx, ly));
}
