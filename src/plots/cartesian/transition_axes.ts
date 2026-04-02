import * as d3Ease from 'd3-ease';
import Registry from '../../registry.js';
import { simpleMap } from '../../lib/index.js';
import { hideOutsideRangePoints, setPointGroupScale, setScale, setTextPointsScale, setTranslate } from '../../components/drawing/index.js';
import Axes from './axes.js';

export default function transitionAxes(gd?: any, edits?: any, transitionOpts?: any, makeOnCompleteCallback?: any): any {
    const fullLayout = gd._fullLayout;

    // special case for redraw:false Plotly.animate that relies on this
    // to update axis-referenced layout components
    if(edits.length === 0) {
        Axes.redrawComponents(gd);
        return;
    }

    function unsetSubplotTransform(subplot?: any) {
        const xa = subplot.xaxis;
        const ya = subplot.yaxis;

        fullLayout._defs.select('#' + subplot.clipId + '> rect')
            .call(setTranslate, 0, 0)
            .call(setScale, 1, 1);

        subplot.plot
            .call(setTranslate, xa._offset, ya._offset)
            .call(setScale, 1, 1);

        const traceGroups = subplot.plot.selectAll('.scatterlayer .trace');

        // This is specifically directed at scatter traces, applying an inverse
        // scale to individual points to counteract the scale of the trace
        // as a whole:
        traceGroups.selectAll('.point')
            .call(setPointGroupScale, 1, 1);
        traceGroups.selectAll('.textpoint')
            .call(setTextPointsScale, 1, 1);
        traceGroups
            .call(hideOutsideRangePoints, subplot);
    }

    function updateSubplot(edit?: any, progress?: any) {
        const plotinfo = edit.plotinfo;
        const xa = plotinfo.xaxis;
        const ya = plotinfo.yaxis;
        const xlen = xa._length;
        const ylen = ya._length;
        const editX = !!edit.xr1;
        const editY = !!edit.yr1;
        const viewBox: any[] = [];

        if(editX) {
            const xr0 = simpleMap(edit.xr0, xa.r2l);
            const xr1 = simpleMap(edit.xr1, xa.r2l);
            const dx0 = xr0[1] - xr0[0];
            const dx1 = xr1[1] - xr1[0];
            viewBox[0] = ((xr0[0] * (1 - progress) + progress * xr1[0] - xr0[0]) / (xr0[1] - xr0[0]) * xlen as any);
            viewBox[2] = (xlen * ((1 - progress) + progress * dx1 / dx0) as any);
            xa.range[0] = xa.l2r(xr0[0] * (1 - progress) + progress * xr1[0]);
            xa.range[1] = xa.l2r(xr0[1] * (1 - progress) + progress * xr1[1]);
        } else {
            viewBox[0] = (0 as any);
            viewBox[2] = (xlen as any);
        }

        if(editY) {
            const yr0 = simpleMap(edit.yr0, ya.r2l);
            const yr1 = simpleMap(edit.yr1, ya.r2l);
            const dy0 = yr0[1] - yr0[0];
            const dy1 = yr1[1] - yr1[0];
            viewBox[1] = ((yr0[1] * (1 - progress) + progress * yr1[1] - yr0[1]) / (yr0[0] - yr0[1]) * ylen as any);
            viewBox[3] = (ylen * ((1 - progress) + progress * dy1 / dy0) as any);
            ya.range[0] = xa.l2r(yr0[0] * (1 - progress) + progress * yr1[0]);
            ya.range[1] = ya.l2r(yr0[1] * (1 - progress) + progress * yr1[1]);
        } else {
            viewBox[1] = (0 as any);
            viewBox[3] = (ylen as any);
        }

        Axes.drawOne(gd, xa, {skipTitle: true});
        Axes.drawOne(gd, ya, {skipTitle: true});
        Axes.redrawComponents(gd, [xa._id, ya._id]);

        const xScaleFactor = editX ? xlen / viewBox[2] : 1;
        const yScaleFactor = editY ? ylen / viewBox[3] : 1;
        const clipDx = editX ? viewBox[0] : 0;
        const clipDy = editY ? viewBox[1] : 0;
        const fracDx = editX ? (viewBox[0] / viewBox[2] * xlen) : 0;
        const fracDy = editY ? (viewBox[1] / viewBox[3] * ylen) : 0;
        const plotDx = xa._offset - fracDx;
        const plotDy = ya._offset - fracDy;

        plotinfo.clipRect
            .call(setTranslate, clipDx, clipDy)
            .call(setScale, 1 / xScaleFactor, 1 / yScaleFactor);

        plotinfo.plot
            .call(setTranslate, plotDx, plotDy)
            .call(setScale, xScaleFactor, yScaleFactor);

        // apply an inverse scale to individual points to counteract
        // the scale of the trace group.
        setPointGroupScale(plotinfo.zoomScalePts, 1 / xScaleFactor, 1 / yScaleFactor);
        setTextPointsScale(plotinfo.zoomScaleTxt, 1 / xScaleFactor, 1 / yScaleFactor);
    }

    let onComplete: any;
    if(makeOnCompleteCallback) {
        // This module makes the choice whether or not it notifies Plotly.transition
        // about completion:
        onComplete = makeOnCompleteCallback();
    }

    function transitionComplete() {
        const aobj = {};

        for(let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const xa = edit.plotinfo.xaxis;
            const ya = edit.plotinfo.yaxis;
            if(edit.xr1) (aobj as any)[xa._name + '.range'] = edit.xr1.slice();
            if(edit.yr1) (aobj as any)[ya._name + '.range'] = edit.yr1.slice();
        }

        // Signal that this transition has completed:
        onComplete && onComplete();

        return Registry.call('relayout', gd, aobj).then(function() {
            for(let i = 0; i < edits.length; i++) {
                unsetSubplotTransform(edits[i].plotinfo);
            }
        });
    }

    function transitionInterrupt() {
        const aobj: any = {};

        for(let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            const xa = edit.plotinfo.xaxis;
            const ya = edit.plotinfo.yaxis;
            if(edit.xr0) aobj[xa._name + '.range'] = edit.xr0.slice();
            if(edit.yr0) aobj[ya._name + '.range'] = edit.yr0.slice();
        }

        return Registry.call('relayout', gd, aobj).then(function() {
            for(let i = 0; i < edits.length; i++) {
                unsetSubplotTransform(edits[i].plotinfo);
            }
        });
    }

    let t1: any, t2, raf: any;
    const easeMap = { linear: d3Ease.easeLinear, cubic: d3Ease.easeCubic, 'cubic-in-out': d3Ease.easeCubicInOut, sin: d3Ease.easeSin, exp: d3Ease.easeExp, circle: d3Ease.easeCircle, elastic: d3Ease.easeElastic, back: d3Ease.easeBack, bounce: d3Ease.easeBounce };
    const easeFn = (easeMap as any)[transitionOpts.easing] || d3Ease.easeCubic;

    gd._transitionData._interruptCallbacks.push(function() {
        window.cancelAnimationFrame(raf);
        raf = null;
        return transitionInterrupt();
    });

    function doFrame() {
        t2 = Date.now();

        const tInterp = Math.min(1, (t2 - t1) / transitionOpts.duration);
        const progress = easeFn(tInterp);

        for(let i = 0; i < edits.length; i++) {
            updateSubplot(edits[i], progress);
        }

        if(t2 - t1 > transitionOpts.duration) {
            transitionComplete();
            raf = window.cancelAnimationFrame(doFrame as any);
        } else {
            raf = window.requestAnimationFrame(doFrame);
        }
    }

    t1 = Date.now();
    raf = window.requestAnimationFrame(doFrame);

    return Promise.resolve();
}
