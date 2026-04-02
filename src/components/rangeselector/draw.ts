import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Registry from '../../registry.js';
import Plots from '../../plots/plots.js';
import Color from '../color/index.js';
import { bBox, font } from '../drawing/index.js';
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

export default function draw(gd: GraphDiv) {
    const fullLayout = gd._fullLayout;

    const selectors = fullLayout._infolayer.selectAll('.rangeselector')
        .data(makeSelectorData(gd), selectorKeyFunc);

    selectors.enter().append('g')
        .classed('rangeselector', true);

    selectors.exit().remove();

    selectors.style({
        cursor: 'pointer',
        'pointer-events': 'all'
    });

    selectors.each(function(this: any, d: any) {
        const selector = select(this);
        const axisLayout = d;
        const selectorLayout = axisLayout.rangeselector;

        const buttons = selector.selectAll('g.button')
            .data(Lib.filterVisible(selectorLayout.buttons));

        buttons.enter().append('g')
            .classed('button', true);

        buttons.exit().remove();

        buttons.each(function(this: any, d: any) {
            const button = select(this);
            const update = getUpdateObject(axisLayout, d);

            d._isActive = isActive(axisLayout, d, update);

            button.call(drawButtonRect, selectorLayout, d);
            button.call(drawButtonText, selectorLayout, d, gd);

            button.on('click', function() {
                if(gd._dragged) return;

                Registry.call('_guiRelayout', gd, update);
            });

            button.on('mouseover', function() {
                d._isHovered = true;
                button.call(drawButtonRect, selectorLayout, d);
            });

            button.on('mouseout', function() {
                d._isHovered = false;
                button.call(drawButtonRect, selectorLayout, d);
            });
        });

        reposition(gd, buttons, selectorLayout, axisLayout._name, selector);
    });
}

function makeSelectorData(gd: GraphDiv) {
    const axes = axisIds.list(gd, 'x', true);
    const data: any[] = [];

    for(let i = 0; i < axes.length; i++) {
        const axis = axes[i];

        if(axis.rangeselector && axis.rangeselector.visible) {
            data.push(axis);
        }
    }

    return data;
}

function selectorKeyFunc(d: any) {
    return d._id;
}

function isActive(axisLayout: any, opts: any, update: any) {
    if(opts.step === 'all') {
        return axisLayout.autorange === true;
    } else {
        const keys = Object.keys(update);

        return (
            axisLayout.range[0] === update[keys[0]] &&
            axisLayout.range[1] === update[keys[1]]
        );
    }
}

function drawButtonRect(button: any, selectorLayout: any, d: any) {
    const rect = Lib.ensureSingle(button, 'rect', 'selector-rect', function(s: any) {
        s.attr('shape-rendering', 'crispEdges');
    });

    rect.attr({
        rx: constants.rx,
        ry: constants.ry
    });

    rect.call(Color.stroke, selectorLayout.bordercolor)
        .call(Color.fill, getFillColor(selectorLayout, d))
        .style('stroke-width', selectorLayout.borderwidth + 'px');
}

function getFillColor(selectorLayout: any, d: any) {
    return (d._isActive || d._isHovered) ?
        selectorLayout.activecolor :
        selectorLayout.bgcolor;
}

function drawButtonText(button: any, selectorLayout: any, d: any, gd: GraphDiv) {
    function textLayout(s: any) {
        svgTextUtils.convertToTspans(s, gd);
    }

    const text = Lib.ensureSingle(button, 'text', 'selector-text', function(s: any) {
        s.attr('text-anchor', 'middle');
    });

    text.call(font, selectorLayout.font)
        .text(getLabel(d, gd._fullLayout._meta))
        .call(textLayout);
}

function getLabel(opts: any, _meta: any) {
    if(opts.label) {
        return _meta ?
            Lib.templateString(opts.label, _meta) :
            opts.label;
    }

    if(opts.step === 'all') return 'all';

    return opts.count + opts.step.charAt(0);
}

function reposition(gd: GraphDiv, buttons: any, opts: any, axName: any, selector: any) {
    let width = 0;
    let height = 0;

    const borderWidth = opts.borderwidth;

    buttons.each(function(this: any) {
        const button = select(this);
        const text = button.select('.selector-text');

        const tHeight = opts.font.size * LINE_SPACING;
        const hEff = Math.max(tHeight * svgTextUtils.lineCount(text), 16) + 3;

        height = Math.max(height, hEff);
    });

    buttons.each(function(this: any) {
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

        rect.attr({
            x: 0,
            y: 0,
            width: wEff,
            height: height
        });

        svgTextUtils.positionText(text, wEff / 2,
            height / 2 - ((tLines - 1) * tHeight / 2) + 3);

        width += wEff + 5;
    });

    const graphSize = gd._fullLayout._size;
    let lx = graphSize.l + graphSize.w * opts.x;
    let ly = graphSize.t + graphSize.h * (1 - opts.y);

    let xanchor = 'left';
    if(Lib.isRightAnchor(opts)) {
        lx -= width;
        xanchor = 'right';
    }
    if(Lib.isCenterAnchor(opts)) {
        lx -= width / 2;
        xanchor = 'center';
    }

    let yanchor = 'top';
    if(Lib.isBottomAnchor(opts)) {
        ly -= height;
        yanchor = 'bottom';
    }
    if(Lib.isMiddleAnchor(opts)) {
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
