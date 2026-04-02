import type { GraphDiv } from '../../../types/core';
import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import { font as drawingFont, bBox } from '../../components/drawing/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import partition from './partition.js';
import _style from './style.js';
const { styleOne } = _style;
import constants from './constants.js';
import helpers from '../sunburst/helpers.js';
import attachFxHandlers from '../sunburst/fx.js';

const onPathbar = true; // for Ancestors

export default function drawAncestors(gd: GraphDiv, cd: any[], entry: any, slices: any, opts: any) {
    const barDifY = opts.barDifY;
    const width = opts.width;
    const height = opts.height;
    const viewX = opts.viewX;
    const viewY = opts.viewY;
    const pathSlice = opts.pathSlice;
    const toMoveInsideSlice = opts.toMoveInsideSlice;
    const strTransform = opts.strTransform;
    const hasTransition = opts.hasTransition;
    const handleSlicesExit = opts.handleSlicesExit;
    const makeUpdateSliceInterpolator = opts.makeUpdateSliceInterpolator;
    const makeUpdateTextInterpolator = opts.makeUpdateTextInterpolator;
    const refRect = {};

    const isStatic = gd._context.staticPlot;

    const fullLayout = gd._fullLayout;
    const cd0 = cd[0];
    const trace = cd0.trace;
    const hierarchy = cd0.hierarchy;

    const eachWidth = width / trace._entryDepth;

    const pathIds = helpers.listPath(entry.data, 'id');

    let sliceData = partition(hierarchy.copy(), [width, height], {
        packing: 'dice',
        pad: {
            inner: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
        }
    }).descendants();

    // edit slices that show up on graph
    sliceData = sliceData.filter((pt: any) => {
        const level = pathIds.indexOf(pt.data.id);
        if(level === -1) return false;

        pt.x0 = eachWidth * level;
        pt.x1 = eachWidth * (level + 1);
        pt.y0 = barDifY;
        pt.y1 = barDifY + height;

        pt.onPathbar = true;

        return true;
    });

    sliceData.reverse();

    slices = slices.data(sliceData, helpers.getPtId);

    const slicesEnter = slices.enter().append('g')
        .classed('pathbar', true);

    handleSlicesExit(slices, onPathbar, refRect, [width, height], pathSlice);

    slices = slices.merge(slicesEnter);
    slices.order();

    let updateSlices = slices;
    if(hasTransition) {
        updateSlices = updateSlices.transition().on('end', function(this: any) {
            // N.B. gd._transitioning is (still) *true* by the time
            // transition updates get here
            const sliceTop = select(this);
            helpers.setSliceCursor(sliceTop, gd, {
                hideOnRoot: false,
                hideOnLeaves: false,
                isTransitioning: false
            });
        });
    }

    updateSlices.each(function(this: any, pt: any) {
        // for bbox
        pt._x0 = viewX(pt.x0);
        pt._x1 = viewX(pt.x1);
        pt._y0 = viewY(pt.y0);
        pt._y1 = viewY(pt.y1);

        pt._hoverX = viewX(pt.x1 - Math.min(width, height) / 2);
        pt._hoverY = viewY(pt.y1 - height / 2);

        const sliceTop = select(this);

        const slicePath = Lib.ensureSingle(sliceTop, 'path', 'surface', function(s: any) {
            s.style('pointer-events', isStatic ? 'none' : 'all');
        });

        if(hasTransition) {
            slicePath.transition().attrTween('d', function(pt2: any) {
                const interp = makeUpdateSliceInterpolator(pt2, onPathbar, refRect, [width, height]);
                return function(t: any) { return pathSlice(interp(t)); };
            });
        } else {
            slicePath.attr('d', pathSlice);
        }

        sliceTop
            .call(attachFxHandlers, entry, gd, cd, {
                styleOne: styleOne,
                eventDataKeys: constants.eventDataKeys,
                transitionTime: constants.CLICK_TRANSITION_TIME,
                transitionEasing: constants.CLICK_TRANSITION_EASING
            })
            .call(helpers.setSliceCursor, gd, {
                hideOnRoot: false,
                hideOnLeaves: false,
                isTransitioning: gd._transitioning
            });

        slicePath.call(styleOne, pt, trace, gd, {
            hovered: false
        });

        pt._text = (helpers.getPtLabel(pt) || '').split('<br>').join(' ') || '';

        const sliceTextGroup = Lib.ensureSingle(sliceTop, 'g', 'slicetext');
        const sliceText = Lib.ensureSingle(sliceTextGroup, 'text', '', function(s: any) {
            // prohibit tex interpretation until we can handle
            // tex and regular text together
            s.attr('data-notex', 1);
        });

        const font = Lib.ensureUniformFontSize(gd, helpers.determineTextFont(trace, pt, fullLayout.font, {
            onPathbar: true
        }));

        sliceText.text(pt._text || ' ') // use one space character instead of a blank string to avoid jumps during transition
            .classed('slicetext', true)
            .attr('text-anchor', 'start')
            .call(drawingFont, font)
            .call(svgTextUtils.convertToTspans, gd);

        pt.textBB = bBox(sliceText.node());
        pt.transform = toMoveInsideSlice(pt, {
            fontSize: font.size,
            onPathbar: true
        });
        pt.transform.fontSize = font.size;

        if(hasTransition) {
            sliceText.transition().attrTween('transform', function(pt2: any) {
                const interp = makeUpdateTextInterpolator(pt2, onPathbar, refRect, [width, height]);
                return function(t: any) { return strTransform(interp(t)); };
            });
        } else {
            sliceText.attr('transform', strTransform(pt));
        }
    });
}
