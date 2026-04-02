import type { FullLayout, GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import { pointer } from 'd3-selection';
import Plots from '../../plots/plots.js';
import Color from '../color/index.js';
import { bBox, font, setTranslate, tester } from '../drawing/index.js';
import Lib from '../../lib/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import { arrayEditor } from '../../plot_api/plot_template.js';
import constants from './constants.js';
import alignmentConstants from '../../constants/alignment.js';
const strTranslate = Lib.strTranslate;
const LINE_SPACING = alignmentConstants.LINE_SPACING;
const FROM_TL = alignmentConstants.FROM_TL;
const FROM_BR = alignmentConstants.FROM_BR;

export default function draw(gd: GraphDiv) {
    const staticPlot = gd._context.staticPlot;
    const fullLayout = gd._fullLayout;
    const sliderData = makeSliderData(fullLayout, gd);

    // draw a container for *all* sliders:
    const sliders = fullLayout._infolayer
        .selectAll('g.' + constants.containerClassName)
        .data(sliderData.length > 0 ? [0] : []);

    const slidersEnter = sliders.enter().append('g')
        .classed(constants.containerClassName, true)
        .style('cursor', staticPlot ? null : 'ew-resize');

    function clearSlider(sliderOpts: any) {
        if(sliderOpts._commandObserver) {
            sliderOpts._commandObserver.remove();
            delete sliderOpts._commandObserver;
        }

        // Most components don't need to explicitly remove autoMargin, because
        // marginPushers does this - but slider updates don't go through
        // a full replot so we need to explicitly remove it.
        Plots.autoMargin(gd, autoMarginId(sliderOpts));
    }

    sliders.exit().each(function(this: any) {
        select(this).selectAll('g.' + constants.groupClassName)
            .each(clearSlider);
    })
    .remove();

    // Return early if no menus visible:
    if(sliderData.length === 0) return;

    const slidersMerged = sliders.merge(slidersEnter);

    const sliderGroupsJoin = slidersMerged.selectAll('g.' + constants.groupClassName)
        .data(sliderData, keyFunction);

    const sliderGroupsEnter = sliderGroupsJoin.enter().append('g')
        .classed(constants.groupClassName, true);

    sliderGroupsJoin.exit()
        .each(clearSlider)
        .remove();

    const sliderGroups = sliderGroupsJoin.merge(sliderGroupsEnter);

    // Find the dimensions of the sliders:
    for(let i = 0; i < sliderData.length; i++) {
        const sliderOpts = sliderData[i];
        findDimensions(gd, sliderOpts);
    }

    sliderGroups.each(function(this: any, sliderOpts: any) {
        const gSlider = select(this);

        computeLabelSteps(sliderOpts);

        Plots.manageCommandObserver(gd, sliderOpts, sliderOpts._visibleSteps, function(this: any, data: any) {
            // NB: Same as below. This is *not* always the same as sliderOpts since
            // if a new set of steps comes in, the reference in this callback would
            // be invalid. We need to refetch it from the slider group, which is
            // the join data that creates this slider. So if this slider still exists,
            // the group should be valid, *to the best of my knowledge.* If not,
            // we'd have to look it up by d3 data join index/key.
            const opts = gSlider.data()[0];

            if(opts.active === data.index) return;
            if(opts._dragging) return;

            setActive(gd, gSlider, opts, data.index, false, true);
        });

        drawSlider(gd, select(this), sliderOpts);
    });
}

function autoMarginId(sliderOpts: any) {
    return constants.autoMarginIdRoot + sliderOpts._index;
}

// This really only just filters by visibility:
function makeSliderData(fullLayout: FullLayout, gd: GraphDiv) {
    const contOpts = fullLayout[constants.name];
    const sliderData: any[] = [];

    for(let i = 0; i < contOpts.length; i++) {
        const item = contOpts[i];
        if(!item.visible) continue;
        item._gd = gd;
        sliderData.push(item);
    }

    return sliderData;
}

// This is set in the defaults step:
function keyFunction(opts: any) {
    return opts._index;
}

// Compute the dimensions (mutates sliderOpts):
function findDimensions(gd: GraphDiv, sliderOpts: any) {
    const sliderLabelsJoin = tester.selectAll('g.' + constants.labelGroupClass)
        .data(sliderOpts._visibleSteps);

    const sliderLabelsEnter = sliderLabelsJoin.enter().append('g')
        .classed(constants.labelGroupClass, true);

    const sliderLabels = sliderLabelsJoin.merge(sliderLabelsEnter);

    // loop over fake buttons to find width / height
    let maxLabelWidth = 0;
    let labelHeight = 0;
    sliderLabels.each(function(this: any, stepOpts: any) {
        const labelGroup = select(this);

        const text = drawLabel(labelGroup, {step: stepOpts}, sliderOpts);

        const textNode = text.node();
        if(textNode) {
            const bb = bBox(textNode);
            labelHeight = Math.max(labelHeight, bb.height);
            maxLabelWidth = Math.max(maxLabelWidth, bb.width);
        }
    });

    sliderLabels.remove();

    const dims: any = sliderOpts._dims = {};

    dims.inputAreaWidth = Math.max(
        constants.railWidth,
        constants.gripHeight
    );

    // calculate some overall dimensions - some of these are needed for
    // calculating the currentValue dimensions
    const graphSize = gd._fullLayout._size;
    dims.lx = graphSize.l + graphSize.w * sliderOpts.x;
    dims.ly = graphSize.t + graphSize.h * (1 - sliderOpts.y);

    if(sliderOpts.lenmode === 'fraction') {
        // fraction:
        dims.outerLength = Math.round(graphSize.w * sliderOpts.len);
    } else {
        // pixels:
        dims.outerLength = sliderOpts.len;
    }

    // The length of the rail, *excluding* padding on either end:
    dims.inputAreaStart = 0;
    dims.inputAreaLength = Math.round(dims.outerLength - sliderOpts.pad.l - sliderOpts.pad.r);

    const textableInputLength = dims.inputAreaLength - 2 * constants.stepInset;
    const availableSpacePerLabel = textableInputLength / (sliderOpts._stepCount - 1);
    const computedSpacePerLabel = maxLabelWidth + constants.labelPadding;
    dims.labelStride = Math.max(1, Math.ceil(computedSpacePerLabel / availableSpacePerLabel));
    dims.labelHeight = labelHeight;

    // loop over all possible values for currentValue to find the
    // area we need for it
    dims.currentValueMaxWidth = 0;
    dims.currentValueHeight = 0;
    dims.currentValueTotalHeight = 0;
    dims.currentValueMaxLines = 1;

    if(sliderOpts.currentvalue.visible) {
        // Get the dimensions of the current value label:
        const dummyGroup = tester.append('g');

        sliderLabels.each(function(stepOpts: any) {
            const curValPrefix = drawCurrentValue(dummyGroup, sliderOpts, stepOpts.label);
            const curValSize = (curValPrefix.node() && bBox(curValPrefix.node())) || {width: 0, height: 0};
            const lines = svgTextUtils.lineCount(curValPrefix);
            dims.currentValueMaxWidth = Math.max(dims.currentValueMaxWidth, Math.ceil(curValSize.width));
            dims.currentValueHeight = Math.max(dims.currentValueHeight, Math.ceil(curValSize.height));
            dims.currentValueMaxLines = Math.max(dims.currentValueMaxLines, lines);
        });

        dims.currentValueTotalHeight = dims.currentValueHeight + sliderOpts.currentvalue.offset;

        dummyGroup.remove();
    }

    dims.height = dims.currentValueTotalHeight + constants.tickOffset + sliderOpts.ticklen + constants.labelOffset + dims.labelHeight + sliderOpts.pad.t + sliderOpts.pad.b;

    let xanchor = 'left';
    if(Lib.isRightAnchor(sliderOpts)) {
        dims.lx -= dims.outerLength;
        xanchor = 'right';
    }
    if(Lib.isCenterAnchor(sliderOpts)) {
        dims.lx -= dims.outerLength / 2;
        xanchor = 'center';
    }

    let yanchor = 'top';
    if(Lib.isBottomAnchor(sliderOpts)) {
        dims.ly -= dims.height;
        yanchor = 'bottom';
    }
    if(Lib.isMiddleAnchor(sliderOpts)) {
        dims.ly -= dims.height / 2;
        yanchor = 'middle';
    }

    dims.outerLength = Math.ceil(dims.outerLength);
    dims.height = Math.ceil(dims.height);
    dims.lx = Math.round(dims.lx);
    dims.ly = Math.round(dims.ly);

    const marginOpts: any = {
        y: sliderOpts.y,
        b: dims.height * (FROM_BR as any)[yanchor],
        t: dims.height * (FROM_TL as any)[yanchor]
    };

    if(sliderOpts.lenmode === 'fraction') {
        marginOpts.l = 0;
        marginOpts.xl = sliderOpts.x - sliderOpts.len * (FROM_TL as any)[xanchor];
        marginOpts.r = 0;
        marginOpts.xr = sliderOpts.x + sliderOpts.len * (FROM_BR as any)[xanchor];
    } else {
        marginOpts.x = sliderOpts.x;
        marginOpts.l = dims.outerLength * (FROM_TL as any)[xanchor];
        marginOpts.r = dims.outerLength * (FROM_BR as any)[xanchor];
    }

    Plots.autoMargin(gd, autoMarginId(sliderOpts), marginOpts);
}

function drawSlider(gd: GraphDiv, sliderGroup: any, sliderOpts: any) {
    // This is related to the other long notes in this file regarding what happens
    // when slider steps disappear. This particular fix handles what happens when
    // the *current* slider step is removed. The drawing functions will error out
    // when they fail to find it, so the fix for now is that it will just draw the
    // slider in the first position but will not execute the command.
    if(!((sliderOpts.steps[sliderOpts.active] || {}).visible)) {
        sliderOpts.active = sliderOpts._visibleSteps[0]._index;
    }

    // These are carefully ordered for proper z-ordering:
    sliderGroup
        .call(drawCurrentValue, sliderOpts)
        .call(drawRail, sliderOpts)
        .call(drawLabelGroup, sliderOpts)
        .call(drawTicks, sliderOpts)
        .call(drawTouchRect, gd, sliderOpts)
        .call(drawGrip, gd, sliderOpts);

    const dims = sliderOpts._dims;

    // Position the rectangle:
    setTranslate(sliderGroup, dims.lx + sliderOpts.pad.l, dims.ly + sliderOpts.pad.t);

    sliderGroup.call(setGripPosition, sliderOpts, false);
    sliderGroup.call(drawCurrentValue, sliderOpts);
}

function drawCurrentValue(sliderGroup: any, sliderOpts: any, valueOverride: any) {
    if(!sliderOpts.currentvalue.visible) return;

    const dims = sliderOpts._dims;
    let x0, textAnchor;

    switch(sliderOpts.currentvalue.xanchor) {
        case 'right':
            // This is anchored left and adjusted by the width of the longest label
            // so that the prefix doesn't move. The goal of this is to emphasize
            // what's actually changing and make the update less distracting.
            x0 = dims.inputAreaLength - constants.currentValueInset - dims.currentValueMaxWidth;
            textAnchor = 'left';
            break;
        case 'center':
            x0 = dims.inputAreaLength * 0.5;
            textAnchor = 'middle';
            break;
        default:
            x0 = constants.currentValueInset;
            textAnchor = 'left';
    }

    const text = Lib.ensureSingle(sliderGroup, 'text', constants.labelClass, function(s: any) {
        s
            .attr('text-anchor', textAnchor)
            .attr('data-notex', 1);
    });

    let str = sliderOpts.currentvalue.prefix ? sliderOpts.currentvalue.prefix : '';

    if(typeof valueOverride === 'string') {
        str += valueOverride;
    } else {
        let curVal = sliderOpts.steps[sliderOpts.active].label;
        const _meta = sliderOpts._gd._fullLayout._meta;
        if(_meta) curVal = Lib.templateString(curVal, _meta);
        str += curVal;
    }

    if(sliderOpts.currentvalue.suffix) {
        str += sliderOpts.currentvalue.suffix;
    }

    text.call(font, sliderOpts.currentvalue.font)
        .text(str)
        .call(svgTextUtils.convertToTspans, sliderOpts._gd);

    const lines = svgTextUtils.lineCount(text);

    const y0 = (dims.currentValueMaxLines + 1 - lines) *
        sliderOpts.currentvalue.font.size * LINE_SPACING;

    svgTextUtils.positionText(text, x0, y0);

    return text;
}

function drawGrip(sliderGroup: any, gd: GraphDiv, sliderOpts: any) {
    const grip = Lib.ensureSingle(sliderGroup, 'rect', constants.gripRectClass, function(s: any) {
        s.call(attachGripEvents, gd, sliderGroup, sliderOpts)
            .style('pointer-events', 'all');
    });

    grip
        .attr('width', constants.gripWidth)
        .attr('height', constants.gripHeight)
        .attr('rx', constants.gripRadius)
        .attr('ry', constants.gripRadius)
    .call(Color.stroke, sliderOpts.bordercolor)
    .call(Color.fill, sliderOpts.bgcolor)
    .style('stroke-width', sliderOpts.borderwidth + 'px');
}

function drawLabel(item: any, data: any, sliderOpts: any) {
    const text = Lib.ensureSingle(item, 'text', constants.labelClass, function(s: any) {
        s
            .attr('text-anchor', 'middle')
            .attr('data-notex', 1);
    });

    let tx = data.step.label;
    const _meta = sliderOpts._gd._fullLayout._meta;
    if(_meta) tx = Lib.templateString(tx, _meta);

    text.call(font, sliderOpts.font)
        .text(tx)
        .call(svgTextUtils.convertToTspans, sliderOpts._gd);

    return text;
}

function drawLabelGroup(sliderGroup: any, sliderOpts: any) {
    const labels = Lib.ensureSingle(sliderGroup, 'g', constants.labelsClass);
    const dims = sliderOpts._dims;

    const labelItemsJoin = labels.selectAll('g.' + constants.labelGroupClass)
        .data(dims.labelSteps);

    const labelItemsEnter = labelItemsJoin.enter().append('g')
        .classed(constants.labelGroupClass, true);

    labelItemsJoin.exit().remove();

    labelItemsJoin.merge(labelItemsEnter).each(function(this: any, d: any) {
        const item = select(this);

        item.call(drawLabel, d, sliderOpts);

        setTranslate(item,
            normalizedValueToPosition(sliderOpts, d.fraction),
            constants.tickOffset +
                sliderOpts.ticklen +
                // position is the baseline of the top line of text only, even
                // if the label spans multiple lines
                sliderOpts.font.size * LINE_SPACING +
                constants.labelOffset +
                dims.currentValueTotalHeight
        );
    });
}

function handleInput(gd: GraphDiv, sliderGroup: any, sliderOpts: any, normalizedPosition: any, doTransition: any) {
    const quantizedPosition = Math.round(normalizedPosition * (sliderOpts._stepCount - 1));
    const quantizedIndex = sliderOpts._visibleSteps[quantizedPosition]._index;

    if(quantizedIndex !== sliderOpts.active) {
        setActive(gd, sliderGroup, sliderOpts, quantizedIndex, true, doTransition);
    }
}

function setActive(gd: GraphDiv, sliderGroup: any, sliderOpts: any, index: any, doCallback: any, doTransition: any) {
    const previousActive = sliderOpts.active;
    sliderOpts.active = index;

    // due to templating, it's possible this slider doesn't even exist yet
    arrayEditor(gd.layout, constants.name, sliderOpts)
        .applyUpdate('active', index);

    const step = sliderOpts.steps[sliderOpts.active];

    sliderGroup.call(setGripPosition, sliderOpts, doTransition);
    sliderGroup.call(drawCurrentValue, sliderOpts);

    gd.emit('plotly_sliderchange', {
        slider: sliderOpts,
        step: sliderOpts.steps[sliderOpts.active],
        interaction: doCallback,
        previousActive: previousActive
    });

    if(step && step.method && doCallback) {
        if(sliderGroup._nextMethod) {
            // If we've already queued up an update, just overwrite it with the most recent:
            sliderGroup._nextMethod.step = step;
            sliderGroup._nextMethod.doCallback = doCallback;
            sliderGroup._nextMethod.doTransition = doTransition;
        } else {
            sliderGroup._nextMethod = {step: step, doCallback: doCallback, doTransition: doTransition};
            sliderGroup._nextMethodRaf = window.requestAnimationFrame(function() {
                const _step = sliderGroup._nextMethod.step;
                if(!_step.method) return;

                if(_step.execute) {
                    Plots.executeAPICommand(gd, _step.method, _step.args);
                }

                sliderGroup._nextMethod = null;
                sliderGroup._nextMethodRaf = null;
            });
        }
    }
}

function attachGripEvents(item: any, gd: GraphDiv, sliderGroup: any) {
    if(gd._context.staticPlot) return;

    const node = sliderGroup.node();
    const $gd = select(gd);

    // NB: This is *not* the same as sliderOpts itself! These callbacks
    // are in a closure so this array won't actually be correct if the
    // steps have changed since this was initialized. The sliderGroup,
    // however, has not changed since that *is* the slider, so it must
    // be present to receive mouse events.
    function getSliderOpts() {
        return sliderGroup.data()[0];
    }

    function mouseDownHandler(event: any) {
        const sliderOpts = getSliderOpts();
        gd.emit('plotly_sliderstart', {slider: sliderOpts});

        const grip = sliderGroup.select('.' + constants.gripRectClass);

        event.stopPropagation();
        event.preventDefault();
        grip.call(Color.fill, sliderOpts.activebgcolor);

        const normalizedPosition = positionToNormalizedValue(sliderOpts, pointer(event, node)[0]);
        handleInput(gd, sliderGroup, sliderOpts, normalizedPosition, true);
        sliderOpts._dragging = true;

        function mouseMoveHandler(event: any) {
            const sliderOpts = getSliderOpts();
            const normalizedPosition = positionToNormalizedValue(sliderOpts, pointer(event, node)[0]);
            handleInput(gd, sliderGroup, sliderOpts, normalizedPosition, false);
        }

        $gd.on('mousemove', mouseMoveHandler);
        $gd.on('touchmove', mouseMoveHandler);

        function mouseUpHandler() {
            const sliderOpts = getSliderOpts();
            sliderOpts._dragging = false;
            grip.call(Color.fill, sliderOpts.bgcolor);
            $gd.on('mouseup', null);
            $gd.on('mousemove', null);
            $gd.on('touchend', null);
            $gd.on('touchmove', null);

            gd.emit('plotly_sliderend', {
                slider: sliderOpts,
                step: sliderOpts.steps[sliderOpts.active]
            });
        }

        $gd.on('mouseup', mouseUpHandler);
        $gd.on('touchend', mouseUpHandler);
    }

    item.on('mousedown', mouseDownHandler);
    item.on('touchstart', mouseDownHandler);
}

function drawTicks(sliderGroup: any, sliderOpts: any) {
    const tick = sliderGroup.selectAll('rect.' + constants.tickRectClass)
        .data(sliderOpts._visibleSteps);
    const dims = sliderOpts._dims;

    const tickEnter = tick.enter().append('rect')
        .classed(constants.tickRectClass, true);

    tick.exit().remove();

    const tickMerged = tick.merge(tickEnter);

    tickMerged
        .attr('width', sliderOpts.tickwidth + 'px')
        .attr('shape-rendering', 'crispEdges');

    tickMerged.each(function(this: any, d: any, i: any) {
        const isMajor = i % dims.labelStride === 0;
        const item = select(this);

        item
            .attr('height', isMajor ? sliderOpts.ticklen : sliderOpts.minorticklen)
            .call(Color.fill, isMajor ? sliderOpts.tickcolor : sliderOpts.tickcolor);

        setTranslate(item,
            normalizedValueToPosition(sliderOpts, i / (sliderOpts._stepCount - 1)) - 0.5 * sliderOpts.tickwidth,
            (isMajor ? constants.tickOffset : constants.minorTickOffset) + dims.currentValueTotalHeight
        );
    });
}

function computeLabelSteps(sliderOpts: any) {
    const dims = sliderOpts._dims;
    dims.labelSteps = [];
    const nsteps = sliderOpts._stepCount;

    for(let i = 0; i < nsteps; i += dims.labelStride) {
        dims.labelSteps.push({
            fraction: i / (nsteps - 1),
            step: sliderOpts._visibleSteps[i]
        });
    }
}

function setGripPosition(sliderGroup: any, sliderOpts: any, doTransition: any) {
    const grip = sliderGroup.select('rect.' + constants.gripRectClass);

    let quantizedIndex = 0;
    for(let i = 0; i < sliderOpts._stepCount; i++) {
        if(sliderOpts._visibleSteps[i]._index === sliderOpts.active) {
            quantizedIndex = i;
            break;
        }
    }

    const x = normalizedValueToPosition(sliderOpts, quantizedIndex / (sliderOpts._stepCount - 1));

    // If this is true, then *this component* is already invoking its own command
    // and has triggered its own animation.
    if(sliderOpts._invokingCommand) return;

    let el = grip;
    if(doTransition && sliderOpts.transition.duration > 0) {
        el = el.transition()
            .duration(sliderOpts.transition.duration)
            .ease(sliderOpts.transition.easing);
    }

    // setTranslate doesn't work here because of the transition duck-typing.
    // It's also not necessary because there are no other transitions to preserve.
    el.attr('transform', strTranslate(x - constants.gripWidth * 0.5, sliderOpts._dims.currentValueTotalHeight));
}

// Convert a number from [0-1] to a pixel position relative to the slider group container:
function normalizedValueToPosition(sliderOpts: any, normalizedPosition: any) {
    const dims = sliderOpts._dims;
    return dims.inputAreaStart + constants.stepInset +
        (dims.inputAreaLength - 2 * constants.stepInset) * Math.min(1, Math.max(0, normalizedPosition));
}

// Convert a position relative to the slider group to a nubmer in [0, 1]
function positionToNormalizedValue(sliderOpts: any, position: any) {
    const dims = sliderOpts._dims;
    return Math.min(1, Math.max(0, (position - constants.stepInset - dims.inputAreaStart) / (dims.inputAreaLength - 2 * constants.stepInset - 2 * dims.inputAreaStart)));
}

function drawTouchRect(sliderGroup: any, gd: GraphDiv, sliderOpts: any) {
    const dims = sliderOpts._dims;
    const rect = Lib.ensureSingle(sliderGroup, 'rect', constants.railTouchRectClass, function(s: any) {
        s.call(attachGripEvents, gd, sliderGroup, sliderOpts)
            .style('pointer-events', 'all');
    });

    rect
        .attr('width', dims.inputAreaLength)
        .attr('height', Math.max(dims.inputAreaWidth, constants.tickOffset + sliderOpts.ticklen + dims.labelHeight))
        .call(Color.fill, sliderOpts.bgcolor)
        .attr('opacity', 0);

    setTranslate(rect, 0, dims.currentValueTotalHeight);
}

function drawRail(sliderGroup: any, sliderOpts: any) {
    const dims = sliderOpts._dims;
    const computedLength = dims.inputAreaLength - constants.railInset * 2;
    const rect = Lib.ensureSingle(sliderGroup, 'rect', constants.railRectClass);

    rect
        .attr('width', computedLength)
        .attr('height', constants.railWidth)
        .attr('rx', constants.railRadius)
        .attr('ry', constants.railRadius)
        .attr('shape-rendering', 'crispEdges')
    .call(Color.stroke, sliderOpts.bordercolor)
    .call(Color.fill, sliderOpts.bgcolor)
    .style('stroke-width', sliderOpts.borderwidth + 'px');

    setTranslate(rect,
        constants.railInset,
        (dims.inputAreaWidth - constants.railWidth) * 0.5 + dims.currentValueTotalHeight
    );
}
