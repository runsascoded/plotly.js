import { select } from 'd3-selection';
import Lib from '../../lib/index.js';
import Drawing from '../../components/drawing/index.js';
import svgTextUtils from '../../lib/svg_text_utils.js';
import partition from './partition.js';
import _style from './style.js';
const { styleOne } = _style;
import constants from '../treemap/constants.js';
import helpers from '../sunburst/helpers.js';
import attachFxHandlers from '../sunburst/fx.js';
import { formatSliceLabel } from '../sunburst/plot.js';

var onPathbar = false; // for Descendants

export default function drawDescendants(gd, cd, entry, slices, opts) {
    var width = opts.width;
    var height = opts.height;
    var viewX = opts.viewX;
    var viewY = opts.viewY;
    var pathSlice = opts.pathSlice;
    var toMoveInsideSlice = opts.toMoveInsideSlice;
    var strTransform = opts.strTransform;
    var hasTransition = opts.hasTransition;
    var handleSlicesExit = opts.handleSlicesExit;
    var makeUpdateSliceInterpolator = opts.makeUpdateSliceInterpolator;
    var makeUpdateTextInterpolator = opts.makeUpdateTextInterpolator;
    var prevEntry = opts.prevEntry;
    var refRect = {};

    var isStatic = gd._context.staticPlot;

    var fullLayout = gd._fullLayout;
    var cd0 = cd[0];
    var trace = cd0.trace;

    var hasLeft = trace.textposition.indexOf('left') !== -1;
    var hasRight = trace.textposition.indexOf('right') !== -1;
    var hasBottom = trace.textposition.indexOf('bottom') !== -1;

    // N.B. slice data isn't the calcdata,
    // grab corresponding calcdata item in sliceData[i].data.data
    var allData = partition(entry, [width, height], {
        flipX: trace.tiling.flip.indexOf('x') > -1,
        flipY: trace.tiling.flip.indexOf('y') > -1,
        orientation: trace.tiling.orientation,
        pad: {
            inner: trace.tiling.pad
        },
        maxDepth: trace._maxDepth
    });

    var sliceData = allData.descendants();

    var minVisibleDepth = Infinity;
    var maxVisibleDepth = -Infinity;
    sliceData.forEach(function(pt) {
        var depth = pt.depth;
        if(depth >= trace._maxDepth) {
            // hide slices that won't show up on graph
            pt.x0 = pt.x1 = (pt.x0 + pt.x1) / 2;
            pt.y0 = pt.y1 = (pt.y0 + pt.y1) / 2;
        } else {
            minVisibleDepth = Math.min(minVisibleDepth, depth);
            maxVisibleDepth = Math.max(maxVisibleDepth, depth);
        }
    });

    slices = slices.data(sliceData, helpers.getPtId);

    trace._maxVisibleLayers = isFinite(maxVisibleDepth) ? maxVisibleDepth - minVisibleDepth + 1 : 0;

    slices.enter().append('g')
        .classed('slice', true);

    handleSlicesExit(slices, onPathbar, refRect, [width, height], pathSlice);

    slices.order();

    // next coords of previous entry
    var nextOfPrevEntry = null;
    if(hasTransition && prevEntry) {
        var prevEntryId = helpers.getPtId(prevEntry);
        slices.each(function(pt) {
            if(nextOfPrevEntry === null && (helpers.getPtId(pt) === prevEntryId)) {
                nextOfPrevEntry = {
                    x0: pt.x0,
                    x1: pt.x1,
                    y0: pt.y0,
                    y1: pt.y1
                };
            }
        });
    }

    var getRefRect = function() {
        return nextOfPrevEntry || {
            x0: 0,
            x1: width,
            y0: 0,
            y1: height
        };
    };

    var updateSlices = slices;
    if(hasTransition) {
        updateSlices = updateSlices.transition().on('end', function() {
            // N.B. gd._transitioning is (still) *true* by the time
            // transition updates get here
            var sliceTop = select(this);
            helpers.setSliceCursor(sliceTop, gd, {
                hideOnRoot: true,
                hideOnLeaves: false,
                isTransitioning: false
            });
        });
    }

    updateSlices.each(function(pt) {
        // for bbox
        pt._x0 = viewX(pt.x0);
        pt._x1 = viewX(pt.x1);
        pt._y0 = viewY(pt.y0);
        pt._y1 = viewY(pt.y1);

        pt._hoverX = viewX(pt.x1 - trace.tiling.pad),
        pt._hoverY = hasBottom ?
                viewY(pt.y1 - trace.tiling.pad / 2) :
                viewY(pt.y0 + trace.tiling.pad / 2);

        var sliceTop = select(this);

        var slicePath = Lib.ensureSingle(sliceTop, 'path', 'surface', function(s) {
            s.style('pointer-events', isStatic ? 'none' : 'all');
        });

        if(hasTransition) {
            slicePath.transition().attrTween('d', function(pt2) {
                var interp = makeUpdateSliceInterpolator(
                    pt2,
                    onPathbar,
                    getRefRect(),
                    [width, height],
                    {
                        orientation: trace.tiling.orientation,
                        flipX: trace.tiling.flip.indexOf('x') > -1,
                        flipY: trace.tiling.flip.indexOf('y') > -1,
                    }
                );
                return function(t) { return pathSlice(interp(t)); };
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
            .call(helpers.setSliceCursor, gd, { isTransitioning: gd._transitioning });

        slicePath.call(styleOne, pt, trace, gd, {
            hovered: false
        });

        if(pt.x0 === pt.x1 || pt.y0 === pt.y1) {
            pt._text = '';
        } else {
            pt._text = formatSliceLabel(pt, entry, trace, cd, fullLayout) || '';
        }

        var sliceTextGroup = Lib.ensureSingle(sliceTop, 'g', 'slicetext');
        var sliceText = Lib.ensureSingle(sliceTextGroup, 'text', '', function(s) {
            // prohibit tex interpretation until we can handle
            // tex and regular text together
            s.attr('data-notex', 1);
        });

        var font = Lib.ensureUniformFontSize(gd, helpers.determineTextFont(trace, pt, fullLayout.font));

        sliceText.text(pt._text || ' ') // use one space character instead of a blank string to avoid jumps during transition
            .classed('slicetext', true)
            .attr('text-anchor', hasRight ? 'end' : hasLeft ? 'start' : 'middle')
            .call(Drawing.font, font)
            .call(svgTextUtils.convertToTspans, gd);

        pt.textBB = Drawing.bBox(sliceText.node());
        pt.transform = toMoveInsideSlice(pt, {
            fontSize: font.size
        });
        pt.transform.fontSize = font.size;

        if(hasTransition) {
            sliceText.transition().attrTween('transform', function(pt2) {
                var interp = makeUpdateTextInterpolator(pt2, onPathbar, getRefRect(), [width, height]);
                return function(t) { return strTransform(interp(t)); };
            });
        } else {
            sliceText.attr('transform', strTransform(pt));
        }
    });

    return nextOfPrevEntry;
}
