import { select } from 'd3-selection';
import { bBox, dashStyle, font as drawingFont } from '../../components/drawing/index.js';
import map1dArray from './map_1d_array.js';
import makepath from './makepath.js';
import orientText from './orient_text.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import Lib from '../../lib/index.js';
import alignmentConstants from '../../constants/alignment.js';
import type { GraphDiv } from '../../../types/core';
const strRotate = Lib.strRotate;
const strTranslate = Lib.strTranslate;

export default function plot(gd: GraphDiv, plotinfo: any, cdcarpet: any, carpetLayer: any) {
    const isStatic = gd._context.staticPlot;
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;
    const fullLayout = gd._fullLayout;
    const clipLayer = fullLayout._clips;

    Lib.makeTraceGroups(carpetLayer, cdcarpet, 'trace').each(function(this: any, cd: any) {
        const axisLayer = select(this);
        const cd0 = cd[0];
        const trace = cd0.trace;
        const aax = trace.aaxis;
        const bax = trace.baxis;

        const minorLayer = Lib.ensureSingle(axisLayer, 'g', 'minorlayer');
        const majorLayer = Lib.ensureSingle(axisLayer, 'g', 'majorlayer');
        const boundaryLayer = Lib.ensureSingle(axisLayer, 'g', 'boundarylayer');
        const labelLayer = Lib.ensureSingle(axisLayer, 'g', 'labellayer');

        axisLayer.style('opacity', trace.opacity);

        drawGridLines(xa, ya, majorLayer, aax, 'a', aax._gridlines, true, isStatic);
        drawGridLines(xa, ya, majorLayer, bax, 'b', bax._gridlines, true, isStatic);
        drawGridLines(xa, ya, minorLayer, aax, 'a', aax._minorgridlines, true, isStatic);
        drawGridLines(xa, ya, minorLayer, bax, 'b', bax._minorgridlines, true, isStatic);

        // NB: These are not omitted if the lines are not active. The joins must be executed
        // in order for them to get cleaned up without a full redraw
        drawGridLines(xa, ya, boundaryLayer, aax, 'a-boundary', aax._boundarylines, isStatic);
        drawGridLines(xa, ya, boundaryLayer, bax, 'b-boundary', bax._boundarylines, isStatic);

        const labelOrientationA = drawAxisLabels(gd, xa, ya, trace, cd0, labelLayer, aax._labels, 'a-label');
        const labelOrientationB = drawAxisLabels(gd, xa, ya, trace, cd0, labelLayer, bax._labels, 'b-label');

        drawAxisTitles(gd, labelLayer, trace, cd0, xa, ya, labelOrientationA, labelOrientationB);

        drawClipPath(trace, cd0, clipLayer, xa, ya);
    });
}

function drawClipPath(trace: any, t: any, layer: any, xaxis: any, yaxis: any) {
    let seg, xp, yp, i;

    let clip = layer.select('#' + trace._clipPathId);

    if(!clip.size()) {
        clip = layer.append('clipPath')
            .classed('carpetclip', true);
    }

    const path = Lib.ensureSingle(clip, 'path', 'carpetboundary');
    const segments = t.clipsegments;
    const segs: any[] = [];

    for(i = 0; i < segments.length; i++) {
        seg = segments[i];
        xp = map1dArray([], seg.x, xaxis.c2p);
        yp = map1dArray([], seg.y, yaxis.c2p);
        segs.push(makepath(xp, yp, seg.bicubic));
    }

    // This could be optimized ever so slightly to avoid no-op L segments
    // at the corners, but it's so negligible that I don't think it's worth
    // the extra complexity
    const clipPathData = 'M' + segs.join('L') + 'Z';
    clip.attr('id', trace._clipPathId);
    path.attr('d', clipPathData);
}

function drawGridLines(xaxis: any, yaxis: any, layer: any, axis: any, axisLetter: string, gridlines: any, _isMajor?: any, isStatic?: any) {
    const lineClass = 'const-' + axisLetter + '-lines';
    const gridJoin = layer.selectAll('.' + lineClass).data(gridlines);

    const gridJoinEnter = gridJoin.enter().append('path')
        .classed(lineClass, true)
        .style('vector-effect', isStatic ? 'none' : 'non-scaling-stroke');

    gridJoin.merge(gridJoinEnter).each(function(this: any, d: any) {
        const gridline = d;
        const x = gridline.x;
        const y = gridline.y;

        const xp = map1dArray([], x, xaxis.c2p);
        const yp = map1dArray([], y, yaxis.c2p);

        const path = 'M' + makepath(xp, yp, gridline.smoothing);

        const el = select(this);

        el.attr('d', path)
            .style('stroke-width', gridline.width)
            .style('stroke', gridline.color)
            .style('stroke-dasharray', dashStyle(gridline.dash, gridline.width))
            .style('fill', 'none');
    });

    gridJoin.exit().remove();
}

function drawAxisLabels(gd: any, xaxis: any, yaxis: any, trace: any, t: any, layer: any, labels: any, labelClass: any) {
    const labelJoin = layer.selectAll('text.' + labelClass).data(labels);

    const labelJoinEnter = labelJoin.enter().append('text')
        .classed(labelClass, true);

    let maxExtent = 0;
    let labelOrientation: any = {};

    labelJoin.merge(labelJoinEnter).each(function(this: any, label: any, i: any) {
        // Most of the positioning is done in calc_labels. Only the parts that depend upon
        // the screen space representation of the x and y axes are here:
        let orientation;
        if(label.axis.tickangle === 'auto') {
            orientation = orientText(trace, xaxis, yaxis, label.xy, label.dxy);
        } else {
            const angle = (label.axis.tickangle + 180.0) * Math.PI / 180.0;
            orientation = orientText(trace, xaxis, yaxis, label.xy, [Math.cos(angle), Math.sin(angle)]);
        }

        if(!i) {
            // TODO: offsetMultiplier? Not currently used anywhere...
            labelOrientation = {angle: orientation.angle, flip: orientation.flip};
        }
        const direction = (label.endAnchor ? -1 : 1) * orientation.flip;

        const labelEl = select(this)
            .attr('text-anchor', direction > 0 ? 'start' : 'end')
            .attr('data-notex', 1)
            .call(drawingFont, label.font)
            .text(label.text)
            .call(svgTextUtils.convertToTspans, gd);

        const bbox = bBox(this);

        labelEl.attr('transform',
                // Translate to the correct point:
                strTranslate(orientation.p[0], orientation.p[1]) +
                // Rotate to line up with grid line tangent:
                strRotate(orientation.angle) +
                // Adjust the baseline and indentation:
                strTranslate(label.axis.labelpadding * direction, bbox.height * 0.3)
            );

        maxExtent = Math.max(maxExtent, bbox.width + label.axis.labelpadding);
    });

    labelJoin.exit().remove();

    labelOrientation.maxExtent = maxExtent;
    return labelOrientation;
}

function drawAxisTitles(gd: any, layer: any, trace: any, t: any, xa: any, ya: any, labelOrientationA: any, labelOrientationB: any) {
    let a, b, xy, dxy;

    const aMin = Lib.aggNums(Math.min, null, trace.a);
    const aMax = Lib.aggNums(Math.max, null, trace.a);
    const bMin = Lib.aggNums(Math.min, null, trace.b);
    const bMax = Lib.aggNums(Math.max, null, trace.b);

    a = 0.5 * (aMin + aMax);
    b = bMin;
    xy = trace.ab2xy(a, b, true);
    dxy = trace.dxyda_rough(a, b);
    if(labelOrientationA.angle === undefined) {
        Lib.extendFlat(labelOrientationA, orientText(trace, xa, ya, xy, trace.dxydb_rough(a, b)));
    }
    drawAxisTitle(gd, layer, trace, t, xy, dxy, trace.aaxis, xa, ya, labelOrientationA, 'a-title');

    a = aMin;
    b = 0.5 * (bMin + bMax);
    xy = trace.ab2xy(a, b, true);
    dxy = trace.dxydb_rough(a, b);
    if(labelOrientationB.angle === undefined) {
        Lib.extendFlat(labelOrientationB, orientText(trace, xa, ya, xy, trace.dxyda_rough(a, b)));
    }
    drawAxisTitle(gd, layer, trace, t, xy, dxy, trace.baxis, xa, ya, labelOrientationB, 'b-title');
}

const lineSpacing = alignmentConstants.LINE_SPACING;
const midShift = ((1 - alignmentConstants.MID_SHIFT) / lineSpacing) + 1;

function drawAxisTitle(gd: any, layer: any, trace: any, t: any, xy: any, dxy: any, axis: any, xa: any, ya: any, labelOrientation: any, labelClass: any) {
    const data: any[] = [];
    if(axis.title.text) data.push(axis.title.text);
    const titleJoin = layer.selectAll('text.' + labelClass).data(data);
    let offset = labelOrientation.maxExtent;

    const titleJoinEnter = titleJoin.enter().append('text')
        .classed(labelClass, true);

    // There's only one, but we'll do it as a join so it's updated nicely:
    titleJoin.merge(titleJoinEnter).each(function(this: any) {
        const orientation = orientText(trace, xa, ya, xy, dxy);

        if(['start', 'both'].indexOf(axis.showticklabels) === -1) {
            offset = 0;
        }

        // In addition to the size of the labels, add on some extra padding:
        const titleSize = axis.title.font.size;
        offset += titleSize + axis.title.offset;

        const labelNorm = labelOrientation.angle + (labelOrientation.flip < 0 ? 180 : 0);
        const angleDiff = (labelNorm - orientation.angle + 450) % 360;
        const reverseTitle = angleDiff > 90 && angleDiff < 270;

        const el = select(this);

        el.text(axis.title.text)
            .call(svgTextUtils.convertToTspans, gd);

        if(reverseTitle) {
            offset = (-svgTextUtils.lineCount(el) + midShift) * lineSpacing * titleSize - offset;
        }

        el.attr('transform',
                strTranslate(orientation.p[0], orientation.p[1]) +
                strRotate(orientation.angle) +
                strTranslate(0, offset)
            )
            .attr('text-anchor', 'middle')
            .call(drawingFont, axis.title.font);
    });

    titleJoin.exit().remove();
}
