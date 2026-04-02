import type { GraphDiv } from '../../../types/core';
import c from './constants.js';
import { select } from 'd3-selection';
import { pointer } from 'd3-selection';
import { zoom as d3Zoom } from 'd3-zoom';
import { drag as d3Drag } from 'd3-drag';
import _gup from '../../lib/gup.js';
const { keyFun, repeat } = _gup;
import _index from '../../lib/index.js';
const { sorterAsc: sortAsc, strTranslate } = _index;

declare let event: any;
declare let d: any;

const snapRatio = c.bar.snapRatio;
function snapOvershoot(v: any, vAdjacent: any) { return v * (1 - snapRatio) + vAdjacent * snapRatio; }

const snapClose = c.bar.snapClose;
function closeToCovering(v: any, vAdjacent: any) { return v * (1 - snapClose) + vAdjacent * snapClose; }

// snap for the low end of a range on an ordinal scale
// on an ordinal scale, always show some overshoot from the exact value,
// so it's clear we're covering it
// find the interval we're in, and snap to 1/4 the distance to the next
// these two could be unified at a slight loss of readability / perf
function ordinalScaleSnap(isHigh: any, a: any, v: any, existingRanges: any) {
    if(overlappingExisting(v, existingRanges)) return v;

    const dir = isHigh ? -1 : 1;

    let first = 0;
    let last = a.length - 1;
    if(dir < 0) {
        const tmp = first;
        first = last;
        last = tmp;
    }

    let aHere = a[first];
    let aPrev = aHere;
    for(let i = first; dir * i < dir * last; i += dir) {
        const nextI = i + dir;
        const aNext = a[nextI];

        // very close to the previous - snap down to it
        if(dir * v < dir * closeToCovering(aHere, aNext)) return snapOvershoot(aHere, aPrev);
        if(dir * v < dir * aNext || nextI === last) return snapOvershoot(aNext, aHere);

        aPrev = aHere;
        aHere = aNext;
    }
}

function overlappingExisting(v: any, existingRanges: any) {
    for(let i = 0; i < existingRanges.length; i++) {
        if(v >= existingRanges[i][0] && v <= existingRanges[i][1]) return true;
    }
    return false;
}

function barHorizontalSetup(selection: any) {
    selection
        .attr('x', -c.bar.captureWidth / 2)
        .attr('width', c.bar.captureWidth);
}

function backgroundBarHorizontalSetup(selection: any) {
    selection
        .attr('visibility', 'visible')
        .style('visibility', 'visible')
        .attr('fill', 'yellow')
        .attr('opacity', 0);
}

function setHighlight(d: any) {
    if(!d.brush.filterSpecified) {
        return '0,' + d.height;
    }

    const pixelRanges = unitToPx(d.brush.filter.getConsolidated(), d.height);
    const dashArray = [0]; // we start with a 0 length selection as filter ranges are inclusive, not exclusive
    let p, sectionHeight, iNext;
    let currentGap = pixelRanges.length ? pixelRanges[0][0] : null;
    for(let i = 0; i < pixelRanges.length; i++) {
        p = pixelRanges[i];
        sectionHeight = p[1] - p[0];
        dashArray.push(currentGap);
        dashArray.push(sectionHeight);
        iNext = i + 1;
        if(iNext < pixelRanges.length) {
            currentGap = pixelRanges[iNext][0] - p[1];
        }
    }
    dashArray.push(d.height);
    // d.height is added at the end to ensure that (1) we have an even number of dasharray points, MDN page says
    // "If an odd number of values is provided, then the list of values is repeated to yield an even number of values."
    // and (2) it's _at least_ as long as the full height (even if range is minuscule and at the bottom) though this
    // may not be necessary, maybe duplicating the last point would do too. But no harm in a longer dasharray than line.
    return dashArray;
}

function unitToPx(unitRanges: any, height: any) {
    return unitRanges.map((pr: any) => pr.map((v: any) => Math.max(0, v * height)).sort(sortAsc));
}

// is the cursor over the north, middle, or south of a bar?
// the end handles extend over the last 10% of the bar
function getRegion(fPix: any, y: any) {
    const pad = c.bar.handleHeight;
    if(y > fPix[1] + pad || y < fPix[0] - pad) return;
    if(y >= 0.9 * fPix[1] + 0.1 * fPix[0]) return 'n';
    if(y <= 0.9 * fPix[0] + 0.1 * fPix[1]) return 's';
    return 'ns';
}

function clearCursor() {
    select(document.body)
        .style('cursor', null);
}

function styleHighlight(selection: any) {
    // stroke-dasharray is used to minimize the number of created DOM nodes, because the requirement calls for up to
    // 1000 individual selections on an axis, and there can be 60 axes per parcoords, and multiple parcoords per
    // dashboard. The technique is similar to https://codepen.io/monfera/pen/rLYqWR and using a `polyline` with
    // multiple sections, or a `path` element via its `d` attribute would also be DOM-sparing alternatives.
    selection.attr('stroke-dasharray', setHighlight);
}

function renderHighlight(root: any, tweenCallback?: any) {
    const bar = select(root).selectAll('.highlight, .highlight-shadow');
    const barToStyle = tweenCallback ? bar.transition().duration(c.bar.snapDuration).on('end', tweenCallback) : bar;
    styleHighlight(barToStyle);
}

function getInterval(d: any, y: any) {
    const b = d.brush;
    const active = b.filterSpecified;
    let closestInterval = NaN;
    const out: any = {};
    let i;

    if(active) {
        const height = d.height;
        const intervals = b.filter.getConsolidated();
        const pixIntervals = unitToPx(intervals, height);
        let hoveredInterval = NaN;
        let previousInterval = NaN;
        let nextInterval = NaN;
        for(i = 0; i <= pixIntervals.length; i++) {
            const p = pixIntervals[i];
            if(p && p[0] <= y && y <= p[1]) {
                // over a bar
                hoveredInterval = i;
                break;
            } else {
                // between bars, or before/after the first/last bar
                previousInterval = i ? i - 1 : NaN;
                if(p && p[0] > y) {
                    nextInterval = i;
                    break; // no point continuing as intervals are non-overlapping and sorted; could use log search
                }
            }
        }

        closestInterval = hoveredInterval;
        if(isNaN(closestInterval)) {
            if(isNaN(previousInterval) || isNaN(nextInterval)) {
                closestInterval = isNaN(previousInterval) ? nextInterval : previousInterval;
            } else {
                closestInterval = (y - pixIntervals[previousInterval][1] < pixIntervals[nextInterval][0] - y) ?
                    previousInterval : nextInterval;
            }
        }

        if(!isNaN(closestInterval)) {
            const fPix = pixIntervals[closestInterval];
            const region = getRegion(fPix, y);

            if(region) {
                out.interval = intervals[closestInterval];
                out.intervalPix = fPix;
                out.region = region;
            }
        }
    }

    if(d.ordinal && !out.region) {
        const a = d.unitTickvals;
        const unitLocation = d.unitToPaddedPx.invert(y);
        for(i = 0; i < a.length; i++) {
            const rangei = [
                a[Math.max(i - 1, 0)] * 0.25 + a[i] * 0.75,
                a[Math.min(i + 1, a.length - 1)] * 0.25 + a[i] * 0.75
            ];
            if(unitLocation >= rangei[0] && unitLocation <= rangei[1]) {
                out.clickableOrdinalRange = rangei;
                break;
            }
        }
    }

    return out;
}

function dragstart(lThis: any, d: any) {
    event.sourceEvent.stopPropagation();
    const y = d.height - pointer(event, lThis)[1] - 2 * c.verticalPadding;
    const unitLocation = d.unitToPaddedPx.invert(y);
    const b = d.brush;
    const interval = getInterval(d, y);
    const unitRange = interval.interval;
    const s = b.svgBrush;
    s.wasDragged = false; // we start assuming there won't be a drag - useful for reset
    s.grabbingBar = interval.region === 'ns';
    if(s.grabbingBar) {
        const pixelRange = unitRange.map(d.unitToPaddedPx);
        s.grabPoint = y - pixelRange[0] - c.verticalPadding;
        s.barLength = pixelRange[1] - pixelRange[0];
    }
    s.clickableOrdinalRange = interval.clickableOrdinalRange;
    s.stayingIntervals = (d.multiselect && b.filterSpecified) ? b.filter.getConsolidated() : [];
    if(unitRange) {
        s.stayingIntervals = s.stayingIntervals.filter((int2: any) => int2[0] !== unitRange[0] && int2[1] !== unitRange[1]);
    }
    s.startExtent = interval.region ? unitRange[interval.region === 's' ? 1 : 0] : unitLocation;
    d.parent.inBrushDrag = true;
    s.brushStartCallback();
}

function drag(lThis: any, d: any) {
    event.sourceEvent.stopPropagation();
    const y = d.height - pointer(event, lThis)[1] - 2 * c.verticalPadding;
    const s = d.brush.svgBrush;
    s.wasDragged = true;
    s._dragging = true;

    if(s.grabbingBar) { // moving the bar
        s.newExtent = [y - s.grabPoint, y + s.barLength - s.grabPoint].map(d.unitToPaddedPx.invert);
    } else { // south/north drag or new bar creation
        s.newExtent = [s.startExtent, d.unitToPaddedPx.invert(y)].sort(sortAsc);
    }

    d.brush.filterSpecified = true;
    s.extent = s.stayingIntervals.concat([s.newExtent]);
    s.brushCallback(d);
    renderHighlight(lThis.parentNode);
}

function dragend(lThis: any, d: any) {
    const brush = d.brush;
    const filter = brush.filter;
    const s = brush.svgBrush;

    if(!s._dragging) { // i.e. click
        // mock zero drag
        mousemove(lThis, d);
        drag(lThis, d);
        // remember it is a click not a drag
        d.brush.svgBrush.wasDragged = false;
    }
    s._dragging = false;

    const e = event;
    e.sourceEvent.stopPropagation();
    const grabbingBar = s.grabbingBar;
    s.grabbingBar = false;
    s.grabLocation = undefined;
    d.parent.inBrushDrag = false;
    clearCursor(); // instead of clearing, a nicer thing would be to set it according to current location
    if(!s.wasDragged) { // a click+release on the same spot (ie. w/o dragging) means a bar or full reset
        s.wasDragged = undefined; // logic-wise unneeded, just shows `wasDragged` has no longer a meaning
        if(s.clickableOrdinalRange) {
            if(brush.filterSpecified && d.multiselect) {
                s.extent.push(s.clickableOrdinalRange);
            } else {
                s.extent = [s.clickableOrdinalRange];
                brush.filterSpecified = true;
            }
        } else if(grabbingBar) {
            s.extent = s.stayingIntervals;
            if(s.extent.length === 0) {
                brushClear(brush);
            }
        } else {
            brushClear(brush);
        }
        s.brushCallback(d);
        renderHighlight(lThis.parentNode);
        s.brushEndCallback(brush.filterSpecified ? filter.getConsolidated() : []);
        return; // no need to fuse intervals or snap to ordinals, so we can bail early
    }

    const mergeIntervals = function() {
        // Key piece of logic: once the button is released, possibly overlapping intervals will be fused:
        // Here it's done immediately on click release while on ordinal snap transition it's done at the end
        filter.set(filter.getConsolidated());
    };

    if(d.ordinal) {
        const a = d.unitTickvals;
        if(a[a.length - 1] < a[0]) a.reverse();
        s.newExtent = [
            ordinalScaleSnap(0, a, s.newExtent[0], s.stayingIntervals),
            ordinalScaleSnap(1, a, s.newExtent[1], s.stayingIntervals)
        ];
        const hasNewExtent = s.newExtent[1] > s.newExtent[0];
        s.extent = s.stayingIntervals.concat(hasNewExtent ? [s.newExtent] : []);
        if(!s.extent.length) {
            brushClear(brush);
        }
        s.brushCallback(d);
        if(hasNewExtent) {
            // merging intervals post the snap tween
            renderHighlight(lThis.parentNode, mergeIntervals);
        } else {
            // if no new interval, don't animate, just redraw the highlight immediately
            mergeIntervals();
            renderHighlight(lThis.parentNode);
        }
    } else {
        mergeIntervals(); // merging intervals immediately
    }
    s.brushEndCallback(brush.filterSpecified ? filter.getConsolidated() : []);
}

function mousemove(lThis: any, d: any) {
    const y = d.height - pointer(event, lThis)[1] - 2 * c.verticalPadding;
    const interval = getInterval(d, y);

    let cursor = 'crosshair';
    if(interval.clickableOrdinalRange) cursor = 'pointer';
    else if(interval.region) cursor = interval.region + '-resize';
    select(document.body)
        .style('cursor', cursor);
}

function attachDragBehavior(selection: any) {
    // There's some fiddling with pointer cursor styling so that the cursor preserves its shape while dragging a brush
    // even if the cursor strays from the interacting bar, which is bound to happen as bars are thin and the user
    // will inevitably leave the hotspot strip. In this regard, it does something similar to what the D3 brush would do.
    selection
        .on('mousemove', function(this: any, event: any) {
            event.preventDefault();
            if(!d.parent.inBrushDrag) mousemove(this, d);
        })
        .on('mouseleave', function(event: any) {
            if(!d.parent.inBrushDrag) clearCursor();
        })
        .call(d3Drag()
            .on('start', function(this: any, event: any) { dragstart(this, d); })
            .on('drag', function(this: any, event: any) { drag(this, d); })
            .on('end', function(this: any, event: any) { dragend(this, d); })
        );
}

function startAsc(a: any, b: any) { return a[0] - b[0]; }

function renderAxisBrush(axisBrush: any, paperColor: any, gd: GraphDiv) {
    const isStatic = gd._context.staticPlot;

    const background = axisBrush.selectAll('.background').data(repeat);

    const backgroundEnter = background.enter()
        .append('rect')
        .classed('background', true)
        .call(barHorizontalSetup)
        .call(backgroundBarHorizontalSetup)
        .style('pointer-events', isStatic ? 'none' : 'auto') // parent pointer events are disabled; we must have it to register events
        .attr('transform', strTranslate(0, c.verticalPadding));

    background.merge(backgroundEnter)
        .call(attachDragBehavior)
        .attr('height', function(d: any) {
            return d.height - c.verticalPadding;
        });

    const highlightShadow = axisBrush.selectAll('.highlight-shadow').data(repeat); // we have a set here, can't call it `extent`

    const highlightShadowEnter = highlightShadow.enter()
        .append('line')
        .classed('highlight-shadow', true)
        .attr('x', -c.bar.width / 2)
        .attr('stroke-width', c.bar.width + c.bar.strokeWidth)
        .attr('stroke', paperColor)
        .attr('opacity', c.bar.strokeOpacity)
        .attr('stroke-linecap', 'butt');

    highlightShadow.merge(highlightShadowEnter)
        .attr('y1', function(d: any) { return d.height; })
        .call(styleHighlight);

    const highlight = axisBrush.selectAll('.highlight').data(repeat); // we have a set here, can't call it `extent`

    const highlightEnter = highlight.enter()
        .append('line')
        .classed('highlight', true)
        .attr('x', -c.bar.width / 2)
        .attr('stroke-width', c.bar.width - c.bar.strokeWidth)
        .attr('stroke', c.bar.fillColor)
        .attr('opacity', c.bar.fillOpacity)
        .attr('stroke-linecap', 'butt');

    highlight.merge(highlightEnter)
        .attr('y1', function(d: any) { return d.height; })
        .call(styleHighlight);
}

function ensureAxisBrush(axisOverlays: any, paperColor: any, gd: GraphDiv) {
    const axisBrush = axisOverlays.selectAll('.' + c.cn.axisBrush)
        .data(repeat, keyFun);

    const axisBrushEnter = axisBrush.enter()
        .append('g')
        .classed(c.cn.axisBrush, true);

    renderAxisBrush(axisBrush.merge(axisBrushEnter), paperColor, gd);
}

function getBrushExtent(brush: any) {
    return brush.svgBrush.extent.map((e: any) => e.slice());
}

function brushClear(brush: any) {
    brush.filterSpecified = false;
    brush.svgBrush.extent = [[-Infinity, Infinity]];
}

function axisBrushMoved(callback: any) {
    return function axisBrushMoved(dimension: any) {
        const brush = dimension.brush;
        const extent = getBrushExtent(brush);
        const newExtent = extent.slice();
        brush.filter.set(newExtent);
        callback();
    };
}

function dedupeRealRanges(intervals: any) {
    // Fuses elements of intervals if they overlap, yielding discontiguous intervals, results.length <= intervals.length
    // Currently uses closed intervals, ie. dedupeRealRanges([[400, 800], [300, 400]]) -> [300, 800]
    const queue = intervals.slice();
    let result: any[] = [];
    let currentInterval;
    let current = queue.shift();
    while(current) { // [].shift === undefined, so we don't descend into an empty array
        currentInterval = current.slice();
        while((current = queue.shift()) && current[0] <= /* right-open interval would need `<` */ currentInterval[1]) {
            currentInterval[1] = Math.max(currentInterval[1], current[1]);
        }
        result.push(currentInterval);
    }

    if(
        result.length === 1 &&
        result[0][0] > result[0][1]
    ) {
        // discard result
        result = [];
    }

    return result;
}

function makeFilter() {
    let filter: any[] = [];
    let consolidated: any;
    let bounds: any;
    return {
        set: function(a: any) {
            filter = a
                .map((d: any) => d.slice().sort(sortAsc))
                .sort(startAsc);

            // handle unselected case
            if(filter.length === 1 &&
                filter[0][0] === -Infinity &&
                filter[0][1] === Infinity) {
                filter = ([[0, -1]] as any);
            }

            consolidated = dedupeRealRanges(filter);
            bounds = filter.reduce((p, n) => [Math.min(p[0], n[0]), Math.max(p[1], n[1])], [Infinity, -Infinity]);
        },
        get: function() { return filter.slice(); },
        getConsolidated: function() { return consolidated; },
        getBounds: function() { return bounds; }
    };
}

function makeBrush(state: any, rangeSpecified: any, initialRange: any, brushStartCallback: any, brushCallback: any, brushEndCallback: any) {
    const filter = makeFilter();
    filter.set(initialRange);
    return {
        filter: filter,
        filterSpecified: rangeSpecified, // there's a difference between not filtering and filtering a non-proper subset
        svgBrush: {
            extent: [], // this is where the svgBrush writes contents into
            brushStartCallback: brushStartCallback,
            brushCallback: axisBrushMoved(brushCallback),
            brushEndCallback: brushEndCallback
        }
    };
}

// for use by supplyDefaults, but it needed tons of pieces from here so
// seemed to make more sense just to put the whole routine here
function cleanRanges(ranges: any, dimension: any) {
    if(Array.isArray(ranges[0])) {
        ranges = ranges.map((ri: any) => ri.sort(sortAsc));

        if(!dimension.multiselect) ranges = [ranges[0]];
        else ranges = dedupeRealRanges(ranges.sort(startAsc));
    } else ranges = [ranges.sort(sortAsc)];

    // ordinal snapping
    if(dimension.tickvals) {
        const sortedTickVals = dimension.tickvals.slice().sort(sortAsc);
        ranges = ranges.map((ri: any) => {
            const rSnapped = [
                ordinalScaleSnap(0, sortedTickVals, ri[0], []),
                ordinalScaleSnap(1, sortedTickVals, ri[1], [])
            ];
            if(rSnapped[1] > rSnapped[0]) return rSnapped;
        })
        .filter((ri: any) => ri);

        if(!ranges.length) return;
    }
    return ranges.length > 1 ? ranges : ranges[0];
}

export default {
    makeBrush: makeBrush,
    ensureAxisBrush: ensureAxisBrush,
    cleanRanges: cleanRanges
};
