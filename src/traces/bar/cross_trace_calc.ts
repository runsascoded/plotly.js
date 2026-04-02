import type { FullAxis, GraphDiv, PlotInfo } from '../../../types/core';
import isNumeric from 'fast-isnumeric';
import { isArrayOrTypedArray } from '../../lib/index.js';
import _numerical from '../../constants/numerical.js';
const { BADNUM } = _numerical;
import Registry from '../../registry.js';
import Axes from '../../plots/cartesian/axes.js';
import { getAxisGroup } from '../../plots/cartesian/constraints.js';
import Sieve from './sieve.js';

/*
 * Bar chart stacking/grouping positioning and autoscaling calculations
 * for each direction separately calculate the ranges and positions
 * note that this handles histograms too
 * now doing this one subplot at a time
 */

function crossTraceCalc(gd: GraphDiv, plotinfo: PlotInfo): void {
    const xa = plotinfo.xaxis;
    const ya = plotinfo.yaxis;

    const fullLayout = gd._fullLayout;
    const fullTraces = gd._fullData;
    const calcTraces = gd.calcdata;
    const calcTracesHorz: any[] = [];
    const calcTracesVert: any[] = [];

    for(let i = 0; i < fullTraces.length; i++) {
        const fullTrace = fullTraces[i];
        if(
            fullTrace.visible === true &&
            Registry.traceIs(fullTrace, 'bar') &&
            fullTrace.xaxis === xa._id &&
            fullTrace.yaxis === ya._id
        ) {
            if(fullTrace.orientation === 'h') {
                calcTracesHorz.push(calcTraces[i]);
            } else {
                calcTracesVert.push(calcTraces[i]);
            }

            if(fullTrace._computePh) {
                const cd = gd.calcdata[i];
                for(let j = 0; j < cd.length; j++) {
                    if(typeof cd[j].ph0 === 'function') cd[j].ph0 = cd[j].ph0();
                    if(typeof cd[j].ph1 === 'function') cd[j].ph1 = cd[j].ph1();
                }
            }
        }
    }

    const opts = {
        xCat: xa.type === 'category' || xa.type === 'multicategory',
        yCat: ya.type === 'category' || ya.type === 'multicategory',

        mode: fullLayout.barmode,
        norm: fullLayout.barnorm,
        gap: fullLayout.bargap,
        groupgap: fullLayout.bargroupgap
    };

    setGroupPositions(gd, xa, ya, calcTracesVert, opts);
    setGroupPositions(gd, ya, xa, calcTracesHorz, opts);
}

function setGroupPositions(gd: GraphDiv, pa: FullAxis, sa: FullAxis, calcTraces: any[], opts: any): void {
    if(!calcTraces.length) return;

    let excluded;
    let included;
    let i, calcTrace, fullTrace;

    initBase(sa, calcTraces);

    switch(opts.mode) {
        case 'overlay':
            setGroupPositionsInOverlayMode(gd, pa, sa, calcTraces, opts);
            break;

        case 'group':
            // exclude from the group those traces for which the user set an offset
            excluded = [];
            included = [];
            for(i = 0; i < calcTraces.length; i++) {
                calcTrace = calcTraces[i];
                fullTrace = calcTrace[0].trace;

                if(fullTrace.offset === undefined) included.push(calcTrace);
                else excluded.push(calcTrace);
            }

            if(included.length) {
                setGroupPositionsInGroupMode(gd, pa, sa, included, opts);
            }
            if(excluded.length) {
                setGroupPositionsInOverlayMode(gd, pa, sa, excluded, opts);
            }
            break;

        case 'stack':
        case 'relative':
            // exclude from the stack those traces for which the user set a base
            excluded = [];
            included = [];
            for(i = 0; i < calcTraces.length; i++) {
                calcTrace = calcTraces[i];
                fullTrace = calcTrace[0].trace;

                if(fullTrace.base === undefined) included.push(calcTrace);
                else excluded.push(calcTrace);
            }

            // If any trace in `included` has a cornerradius, set cornerradius of all bars
            // in `included` to match the first trace which has a cornerradius
            standardizeCornerradius(included);

            if(included.length) {
                setGroupPositionsInStackOrRelativeMode(gd, pa, sa, included, opts);
            }
            if(excluded.length) {
                setGroupPositionsInOverlayMode(gd, pa, sa, excluded, opts);
            }
            break;
    }
    setCornerradius(calcTraces);
    collectExtents(calcTraces, pa);
}

// Set cornerradiusvalue and cornerradiusform in calcTraces[0].t
function setCornerradius(calcTraces: any[]): void {
    let i, calcTrace, fullTrace, t, cr, crValue, crForm;

    for(i = 0; i < calcTraces.length; i++) {
        calcTrace = calcTraces[i];
        fullTrace = calcTrace[0].trace;
        t = calcTrace[0].t;

        if(t.cornerradiusvalue === undefined) {
            cr = fullTrace.marker ? fullTrace.marker.cornerradius : undefined;
            if(cr !== undefined) {
                crValue = isNumeric(cr) ? +cr : +cr.slice(0, -1);
                crForm = isNumeric(cr) ? 'px' : '%';
                t.cornerradiusvalue = crValue;
                t.cornerradiusform = crForm;
            }
        }
    }
}

// Make sure all traces in a stack use the same cornerradius
function standardizeCornerradius(calcTraces: any[]): void {
    if(calcTraces.length < 2) return;
    let i, calcTrace, fullTrace, t;
    let cr, crValue, crForm;
    for(i = 0; i < calcTraces.length; i++) {
        calcTrace = calcTraces[i];
        fullTrace = calcTrace[0].trace;
        cr = fullTrace.marker ? fullTrace.marker.cornerradius : undefined;
        if(cr !== undefined) break;
    }
    // If any trace has cornerradius, store first cornerradius
    // in calcTrace[0].t so that all traces in stack use same cornerradius
    if(cr !== undefined) {
        crValue = isNumeric(cr) ? +cr : +cr.slice(0, -1);
        crForm = isNumeric(cr) ? 'px' : '%';
        for(i = 0; i < calcTraces.length; i++) {
            calcTrace = calcTraces[i];
            t = calcTrace[0].t;

            t.cornerradiusvalue = crValue;
            t.cornerradiusform = crForm;
        }
    }
}

function initBase(sa: FullAxis, calcTraces: any[]): any {
    let i, j;

    for(i = 0; i < calcTraces.length; i++) {
        const cd = calcTraces[i];
        const trace = cd[0].trace;
        const base = (trace.type === 'funnel') ? trace._base : trace.base;
        let b;

        // not sure if it really makes sense to have dates for bar size data...
        // ideally if we want to make gantt charts or something we'd treat
        // the actual size (trace.x or y) as time delta but base as absolute
        // time. But included here for completeness.
        const scalendar = trace.orientation === 'h' ? trace.xcalendar : trace.ycalendar;

        // 'base' on categorical axes makes no sense
        const d2c = sa.type === 'category' || sa.type === 'multicategory' ?
            function() { return null; } :
            sa.d2c;

        if(isArrayOrTypedArray(base)) {
            for(j = 0; j < Math.min(base.length, cd.length); j++) {
                b = d2c(base[j], 0, scalendar);
                if(isNumeric(b)) {
                    cd[j].b = +b;
                    cd[j].hasB = 1;
                } else cd[j].b = 0;
            }
            for(; j < cd.length; j++) {
                cd[j].b = 0;
            }
        } else {
            b = d2c(base, 0, scalendar);
            const hasBase = isNumeric(b);
            b = hasBase ? b : 0;
            for(j = 0; j < cd.length; j++) {
                cd[j].b = b;
                if(hasBase) cd[j].hasB = 1;
            }
        }
    }
}

function setGroupPositionsInOverlayMode(gd: GraphDiv, pa: FullAxis, sa: FullAxis, calcTraces: any[], opts: any): void {
    // update position axis and set bar offsets and widths
    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];

        // @ts-ignore TS7009
        const sieve: any = new Sieve([calcTrace], {
            posAxis: pa,
            sepNegVal: false,
            overlapNoMerge: !opts.norm
        });

        // set bar offsets and widths, and update position axis
        setOffsetAndWidth(gd, pa, sieve, opts);

        // set bar bases and sizes, and update size axis
        //
        // (note that `setGroupPositionsInOverlayMode` handles the case barnorm
        // is defined, because this function is also invoked for traces that
        // can't be grouped or stacked)
        if(opts.norm) {
            sieveBars(sieve);
            normalizeBars(sa, sieve, opts);
        } else {
            setBaseAndTop(sa, sieve);
        }
    }
}

function setGroupPositionsInGroupMode(gd: GraphDiv, pa: FullAxis, sa: FullAxis, calcTraces: any[], opts: any): void {
    // @ts-ignore TS7009
    const sieve: any = new Sieve(calcTraces, {
        posAxis: pa,
        sepNegVal: false,
        overlapNoMerge: !opts.norm
    });

    // set bar offsets and widths, and update position axis
    setOffsetAndWidth(gd, pa, sieve, opts);

    // relative-stack bars within the same trace that would otherwise
    // be hidden
    unhideBarsWithinTrace(sieve, pa);

    // set bar bases and sizes, and update size axis
    if(opts.norm) {
        sieveBars(sieve);
        normalizeBars(sa, sieve, opts);
    } else {
        setBaseAndTop(sa, sieve);
    }
}

function setGroupPositionsInStackOrRelativeMode(gd: GraphDiv, pa: FullAxis, sa: FullAxis, calcTraces: any[], opts: any): void {
    // @ts-ignore TS7009
    const sieve: any = new Sieve(calcTraces, {
        posAxis: pa,
        sepNegVal: opts.mode === 'relative',
        overlapNoMerge: !(opts.norm || opts.mode === 'stack' || opts.mode === 'relative')
    });

    // set bar offsets and widths, and update position axis
    setOffsetAndWidth(gd, pa, sieve, opts);

    // set bar bases and sizes, and update size axis
    stackBars(sa, sieve, opts);

    // flag the outmost bar (for text display purposes)
    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const offsetIndex = calcTrace[0].t.offsetindex;
        for(let j = 0; j < calcTrace.length; j++) {
            const bar = calcTrace[j];

            if(bar.s !== BADNUM) {
                const isOutmostBar = ((bar.b + bar.s) === sieve.get(bar.p, offsetIndex, bar.s));
                if(isOutmostBar) bar._outmost = true;
            }
        }
    }

    // Note that marking the outmost bars has to be done
    // before `normalizeBars` changes `bar.b` and `bar.s`.
    if(opts.norm) normalizeBars(sa, sieve, opts);
}

/**
 * Mode group: Traces should be offsetted to other traces at the same position if they have a
 *      different offsetgroup or if no offsetgroups are specified.
 *      If there are no other traces at the same position, the trace will not be offsetted and it
 *      can occupy the whole width.
 *      If two traces share an offsetgroup, they should overlap.
 * Mode overlay/stack/relative: Traces should be offseted to other traces at the same position if
 *      they have a different offsetgroup.
 *      If two traces share an offsetgroup or if no offsetgroups are specified, they should instead
 *      overlap/stack.
 * Angular axes (for barpolar type) don't support group offsets.
 */
function setOffsetAndWidth(gd: GraphDiv, pa: FullAxis, sieve: any, opts: any): void {
    const fullLayout = gd._fullLayout;
    const positions = sieve.positions;
    const distinctPositions = sieve.distinctPositions;
    const minDiff = sieve.minDiff;
    const calcTraces = sieve.traces;
    const nTraces = calcTraces.length;

    // if there aren't any overlapping positions,
    // let them have full width even if mode is group
    const overlap = (positions.length !== distinctPositions.length);

    const barGroupWidth = minDiff * (1 - opts.gap);
    let barWidthPlusGap;
    let barWidth;
    let offsetFromCenter;
    let alignmentGroups;
    if(pa._id === 'angularaxis') {
        barWidthPlusGap = barGroupWidth;
        barWidth = barWidthPlusGap * (1 - (opts.groupgap || 0));
        offsetFromCenter = -barWidth / 2;
    } else { // collect groups and calculate values in loop below
        const groupId = getAxisGroup(fullLayout, pa._id) + calcTraces[0][0].trace.orientation;
        alignmentGroups = fullLayout._alignmentOpts[groupId] || {};
    }

    for(let i = 0; i < nTraces; i++) {
        const calcTrace = calcTraces[i];
        const trace = calcTrace[0].trace;
        if(pa._id !== 'angularaxis') {
            const alignmentGroupOpts = alignmentGroups[trace.alignmentgroup] || {};
            const nOffsetGroups = Object.keys(alignmentGroupOpts.offsetGroups || {}).length;

            if(nOffsetGroups) {
                barWidthPlusGap = barGroupWidth / nOffsetGroups;
            } else {
                barWidthPlusGap = overlap ? barGroupWidth / nTraces : barGroupWidth;
            }

            barWidth = barWidthPlusGap * (1 - (opts.groupgap || 0));

            if(nOffsetGroups) {
                offsetFromCenter = ((2 * trace._offsetIndex + 1 - nOffsetGroups) * barWidthPlusGap - barWidth) / 2;
            } else {
                offsetFromCenter = overlap ?
                    ((2 * i + 1 - nTraces) * barWidthPlusGap - barWidth) / 2 :
                    -barWidth / 2;
            }
        }

        const t = calcTrace[0].t;
        t.barwidth = barWidth;
        t.offsetindex = trace._offsetIndex || 0;
        t.poffset = offsetFromCenter;
        t.bargroupwidth = barGroupWidth;
        t.bardelta = minDiff;
    }

    // stack bars that only differ by rounding
    sieve.binWidth = calcTraces[0][0].t.barwidth / 100;

    // if defined, apply trace width
    applyAttributes(sieve);

    // store the bar center in each calcdata item
    setBarCenterAndWidth(pa, sieve);

    // update position axes
    if(pa._id === 'angularaxis') {
        updatePositionAxis(pa, sieve);
    } else {
        updatePositionAxis(pa, sieve, overlap);
    }
}

function applyAttributes(sieve: any): void {
    const calcTraces = sieve.traces;
    let i, j;

    for(i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const calcTrace0 = calcTrace[0];
        const fullTrace = calcTrace0.trace;
        const t = calcTrace0.t;
        const offset = fullTrace._offset || fullTrace.offset;
        const initialPoffset = t.poffset;
        let newPoffset;

        if(isArrayOrTypedArray(offset)) {
            // if offset is an array, then clone it into t.poffset.
            newPoffset = Array.prototype.slice.call(offset, 0, calcTrace.length);

            // guard against non-numeric items
            for(j = 0; j < newPoffset.length; j++) {
                if(!isNumeric(newPoffset[j])) {
                    newPoffset[j] = initialPoffset;
                }
            }

            // if the length of the array is too short,
            // then extend it with the initial value of t.poffset
            for(j = newPoffset.length; j < calcTrace.length; j++) {
                newPoffset.push(initialPoffset);
            }

            t.poffset = newPoffset;
        } else if(offset !== undefined) {
            t.poffset = offset;
        }

        const width = fullTrace._width || fullTrace.width;
        const initialBarwidth = t.barwidth;

        if(isArrayOrTypedArray(width)) {
            // if width is an array, then clone it into t.barwidth.
            const newBarwidth = Array.prototype.slice.call(width, 0, calcTrace.length);

            // guard against non-numeric items
            for(j = 0; j < newBarwidth.length; j++) {
                if(!isNumeric(newBarwidth[j])) newBarwidth[j] = initialBarwidth;
            }

            // if the length of the array is too short,
            // then extend it with the initial value of t.barwidth
            for(j = newBarwidth.length; j < calcTrace.length; j++) {
                newBarwidth.push(initialBarwidth);
            }

            t.barwidth = newBarwidth;

            // if user didn't set offset,
            // then correct t.poffset to ensure bars remain centered
            if(offset === undefined) {
                newPoffset = [];
                for(j = 0; j < calcTrace.length; j++) {
                    newPoffset.push(
                        initialPoffset + (initialBarwidth - newBarwidth[j]) / 2
                    );
                }
                t.poffset = newPoffset;
            }
        } else if(width !== undefined) {
            t.barwidth = width;

            // if user didn't set offset,
            // then correct t.poffset to ensure bars remain centered
            if(offset === undefined) {
                t.poffset = initialPoffset + (initialBarwidth - width) / 2;
            }
        }
    }
}

function setBarCenterAndWidth(pa: FullAxis, sieve: any): void {
    const calcTraces = sieve.traces;
    const pLetter = getAxisLetter(pa);

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const t = calcTrace[0].t;
        const poffset = t.poffset;
        const poffsetIsArray = isArrayOrTypedArray(poffset);
        const barwidth = t.barwidth;
        const barwidthIsArray = isArrayOrTypedArray(barwidth);

        for(let j = 0; j < calcTrace.length; j++) {
            const calcBar = calcTrace[j];

            // store the actual bar width and position, for use by hover
            const width = calcBar.w = barwidthIsArray ? barwidth[j] : barwidth;

            if(calcBar.p === undefined) {
                calcBar.p = calcBar[pLetter];
                calcBar['orig_' + pLetter] = calcBar[pLetter];
            }

            const delta = (poffsetIsArray ? poffset[j] : poffset) + width / 2;
            calcBar[pLetter] = calcBar.p + delta;
        }
    }
}

function updatePositionAxis(pa: FullAxis, sieve: any, allowMinDtick?: boolean): void {
    const calcTraces = sieve.traces;
    const minDiff = sieve.minDiff;
    const vpad = minDiff / 2;

    Axes.minDtick(pa, sieve.minDiff, sieve.distinctPositions[0], allowMinDtick);

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const calcTrace0 = calcTrace[0];
        const fullTrace = calcTrace0.trace;
        const pts: any[] = [];
        let bar, l, r, j;

        for(j = 0; j < calcTrace.length; j++) {
            bar = calcTrace[j];
            l = bar.p - vpad;
            r = bar.p + vpad;
            pts.push(l, r);
        }

        if(fullTrace.width || fullTrace.offset) {
            const t = calcTrace0.t;
            const poffset = t.poffset;
            const barwidth = t.barwidth;
            const poffsetIsArray = isArrayOrTypedArray(poffset);
            const barwidthIsArray = isArrayOrTypedArray(barwidth);

            for(j = 0; j < calcTrace.length; j++) {
                bar = calcTrace[j];
                const calcBarOffset = poffsetIsArray ? poffset[j] : poffset;
                const calcBarWidth = barwidthIsArray ? barwidth[j] : barwidth;
                l = bar.p + calcBarOffset;
                r = l + calcBarWidth;
                pts.push(l, r);
            }
        }

        fullTrace._extremes[pa._id] = Axes.findExtremes(pa, pts, {padded: false});
    }
}

// store these bar bases and tops in calcdata
// and make sure the size axis includes zero,
// along with the bases and tops of each bar.
function setBaseAndTop(sa: FullAxis, sieve: any): void {
    const calcTraces = sieve.traces;
    const sLetter = getAxisLetter(sa);

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const fullTrace = calcTrace[0].trace;
        const isScatter = fullTrace.type === 'scatter';
        const isVertical = fullTrace.orientation === 'v';
        const pts: any[] = [];
        let tozero = false;

        for(let j = 0; j < calcTrace.length; j++) {
            const bar = calcTrace[j];
            const base = isScatter ? 0 : bar.b;
            const top = isScatter ? (
                isVertical ? bar.y : bar.x
            ) : base + bar.s;

            bar[sLetter] = top;
            pts.push(top);
            if(bar.hasB) pts.push(base);

            if(!bar.hasB || !bar.b) {
                tozero = true;
            }
        }

        fullTrace._extremes[sa._id] = Axes.findExtremes(sa, pts, {
            tozero: tozero,
            padded: true
        });
    }
}

function stackBars(sa: FullAxis, sieve: any, opts: any): void {
    const sLetter = getAxisLetter(sa);
    const calcTraces = sieve.traces;
    let calcTrace;
    let fullTrace;
    let isFunnel;
    let i, j;
    let bar;
    let offsetIndex;

    for(i = 0; i < calcTraces.length; i++) {
        calcTrace = calcTraces[i];
        fullTrace = calcTrace[0].trace;

        if(fullTrace.type === 'funnel') {
            offsetIndex = calcTrace[0].t.offsetindex;
            for(j = 0; j < calcTrace.length; j++) {
                bar = calcTrace[j];

                if(bar.s !== BADNUM) {
                    // create base of funnels
                    sieve.put(bar.p, offsetIndex, -0.5 * bar.s);
                }
            }
        }
    }

    for(i = 0; i < calcTraces.length; i++) {
        calcTrace = calcTraces[i];
        fullTrace = calcTrace[0].trace;

        isFunnel = (fullTrace.type === 'funnel');

        offsetIndex = fullTrace.type === 'barpolar' ? 0 : calcTrace[0].t.offsetindex;

        const pts: any[] = [];

        for(j = 0; j < calcTrace.length; j++) {
            bar = calcTrace[j];

            if(bar.s !== BADNUM) {
                // stack current bar and get previous sum
                let value;
                if(isFunnel) {
                    value = bar.s;
                } else {
                    value = bar.s + bar.b;
                }

                const base = sieve.put(bar.p, offsetIndex, value);
                const top = base + value;

                // store the bar base and top in each calcdata item
                bar.b = base;
                bar[sLetter] = top;

                if(!opts.norm) {
                    pts.push(top);
                    if(bar.hasB) {
                        pts.push(base);
                    }
                }
            }
        }

        // if barnorm is set, let normalizeBars update the axis range
        if(!opts.norm) {
            fullTrace._extremes[sa._id] = Axes.findExtremes(sa, pts, {
                // N.B. we don't stack base with 'base',
                // so set tozero:true always!
                tozero: true,
                padded: true
            });
        }
    }
}

function sieveBars(sieve: any): void {
    const calcTraces = sieve.traces;

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const offsetIndex = calcTrace[0].t.offsetindex;
        for(let j = 0; j < calcTrace.length; j++) {
            const bar = calcTrace[j];

            if(bar.s !== BADNUM) {
                sieve.put(bar.p, offsetIndex, bar.b + bar.s);
            }
        }
    }
}

function unhideBarsWithinTrace(sieve: any, pa: FullAxis): void {
    const calcTraces = sieve.traces;

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const fullTrace = calcTrace[0].trace;
        const offsetIndex = calcTrace[0].t.offsetindex;

        if(fullTrace.base === undefined) {
            // @ts-ignore TS7009
            const inTraceSieve: any = new Sieve([calcTrace], {
                posAxis: pa,
                sepNegVal: true,
                overlapNoMerge: true
            });

            for(let j = 0; j < calcTrace.length; j++) {
                const bar = calcTrace[j];

                if(bar.p !== BADNUM) {
                    // stack current bar and get previous sum
                    const base = inTraceSieve.put(bar.p, offsetIndex, bar.b + bar.s);

                    // if previous sum if non-zero, this means:
                    // multiple bars have same starting point are potentially hidden,
                    // shift them vertically so that all bars are visible by default
                    if(base) bar.b = base;
                }
            }
        }
    }
}

// Note:
//
// normalizeBars requires that either sieveBars or stackBars has been
// previously invoked.
function normalizeBars(sa: FullAxis, sieve: any, opts: any): void {
    const calcTraces = sieve.traces;
    const sLetter = getAxisLetter(sa);
    const sTop = opts.norm === 'fraction' ? 1 : 100;
    const sTiny = sTop / 1e9; // in case of rounding error in sum
    const sMin = sa.l2c(sa.c2l(0));
    const sMax = opts.mode === 'stack' ? sTop : sMin;

    function needsPadding(v: any) {
        return (
            isNumeric(sa.c2l(v)) &&
            ((v < sMin - sTiny) || (v > sMax + sTiny) || !isNumeric(sMin))
        );
    }

    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        const offsetIndex = calcTrace[0].t.offsetindex;
        const fullTrace = calcTrace[0].trace;
        const pts: any[] = [];
        let tozero = false;
        let padded = false;

        for(let j = 0; j < calcTrace.length; j++) {
            const bar = calcTrace[j];

            if(bar.s !== BADNUM) {
                const scale = Math.abs(sTop / sieve.get(bar.p, offsetIndex, bar.s));
                bar.b *= scale;
                bar.s *= scale;

                const base = bar.b;
                const top = base + bar.s;

                bar[sLetter] = top;
                pts.push(top);
                padded = padded || needsPadding(top);

                if(bar.hasB) {
                    pts.push(base);
                    padded = padded || needsPadding(base);
                }

                if(!bar.hasB || !bar.b) {
                    tozero = true;
                }
            }
        }

        fullTrace._extremes[sa._id] = Axes.findExtremes(sa, pts, {
            tozero: tozero,
            padded: padded
        });
    }
}

// Add an `_sMin` and `_sMax` value for each bar representing the min and max size value
// across all bars sharing the same position as that bar. These values are used for rounded
// bar corners, to carry rounding down to lower bars in the stack as needed.
function setHelperValuesForRoundedCorners(calcTraces: any[], sMinByPos: any, sMaxByPos: any, pa: FullAxis): void {
    const pLetter = getAxisLetter(pa);
    // Set `_sMin` and `_sMax` value for each bar
    for(let i = 0; i < calcTraces.length; i++) {
        const calcTrace = calcTraces[i];
        for(let j = 0; j < calcTrace.length; j++) {
            const bar = calcTrace[j];
            const pos = bar[pLetter];
            bar._sMin = sMinByPos[pos];
            bar._sMax = sMaxByPos[pos];
        }
    }
}

// find the full position span of bars at each position
// for use by hover, to ensure labels move in if bars are
// narrower than the space they're in.
// run once per trace group (subplot & direction) and
// the same mapping is attached to all calcdata traces
function collectExtents(calcTraces: any[], pa: FullAxis): void {
    const pLetter = getAxisLetter(pa);
    const extents: any = {};
    let i, j, cd;

    let pMin = Infinity;
    let pMax = -Infinity;

    for(i = 0; i < calcTraces.length; i++) {
        cd = calcTraces[i];
        for(j = 0; j < cd.length; j++) {
            const p = cd[j].p;
            if(isNumeric(p)) {
                pMin = Math.min(pMin, p);
                pMax = Math.max(pMax, p);
            }
        }
    }

    // this is just for positioning of hover labels, and nobody will care if
    // the label is 1px too far out; so round positions to 1/10K in case
    // position values don't exactly match from trace to trace
    const roundFactor = 10000 / (pMax - pMin);
    const round = extents.round = function(p: any) {
        return String(Math.round(roundFactor * (p - pMin)));
    };

    // Find min and max size axis extent for each position
    // This is used for rounded bar corners, to carry rounding
    // down to lower bars in the case of stacked bars
    const sMinByPos: any = {};
    const sMaxByPos: any = {};

    // Check whether any trace has rounded corners
    const anyTraceHasCornerradius = calcTraces.some(function(x) {
        const trace = x[0].trace;
        return 'marker' in trace && trace.marker.cornerradius;
    });

    for(i = 0; i < calcTraces.length; i++) {
        cd = calcTraces[i];
        cd[0].t.extents = extents;

        const poffset = cd[0].t.poffset;
        const poffsetIsArray = isArrayOrTypedArray(poffset);

        for(j = 0; j < cd.length; j++) {
            const di = cd[j];
            const p0 = di[pLetter] - di.w / 2;

            if(isNumeric(p0)) {
                const p1 = di[pLetter] + di.w / 2;
                const pVal = round(di.p);
                if(extents[pVal]) {
                    extents[pVal] = [Math.min(p0, extents[pVal][0]), Math.max(p1, extents[pVal][1])];
                } else {
                    extents[pVal] = [p0, p1];
                }
            }

            di.p0 = di.p + (poffsetIsArray ? poffset[j] : poffset);
            di.p1 = di.p0 + di.w;
            di.s0 = di.b;
            di.s1 = di.s0 + di.s;

            if(anyTraceHasCornerradius) {
                const sMin = Math.min(di.s0, di.s1) || 0;
                const sMax = Math.max(di.s0, di.s1) || 0;
                const pos = di[pLetter];
                sMinByPos[pos] = (pos in sMinByPos) ? Math.min(sMinByPos[pos], sMin) : sMin;
                sMaxByPos[pos] = (pos in sMaxByPos) ? Math.max(sMaxByPos[pos], sMax) : sMax;
            }
        }
    }
    if(anyTraceHasCornerradius) {
        setHelperValuesForRoundedCorners(calcTraces, sMinByPos, sMaxByPos, pa);
    }
}

function getAxisLetter(ax: FullAxis): string {
    return ax._id.charAt(0);
}

export default {
    crossTraceCalc: crossTraceCalc,
    setGroupPositions: setGroupPositions
};
