import * as d3Ease from 'd3-ease';
import Registry from '../../registry.js';
import { simpleMap } from '../../lib/index.js';
import { hideOutsideRangePoints, setPointGroupScale, setScale, setTextPointsScale, setTranslate } from '../../components/drawing/index.js';
import Axes from './axes.js';

export default function transitionAxes(gd?: any, edits?: any, transitionOpts?: any, makeOnCompleteCallback?: any): any {
    var fullLayout = gd._fullLayout;

    // special case for redraw:false Plotly.animate that relies on this
    // to update axis-referenced layout components
    if(edits.length === 0) {
        Axes.redrawComponents(gd);
        return;
    }

    function unsetSubplotTransform(subplot?: any) {
        var xa = subplot.xaxis;
        var ya = subplot.yaxis;

        fullLayout._defs.select('#' + subplot.clipId + '> rect')
            .call(setTranslate, 0, 0)
            .call(setScale, 1, 1);

        subplot.plot
            .call(setTranslate, xa._offset, ya._offset)
            .call(setScale, 1, 1);

        var traceGroups = subplot.plot.selectAll('.scatterlayer .trace');

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
        var plotinfo = edit.plotinfo;
        var xa = plotinfo.xaxis;
        var ya = plotinfo.yaxis;
        var xlen = xa._length;
        var ylen = ya._length;
        var editX = !!edit.xr1;
        var editY = !!edit.yr1;
        var viewBox = [];

        if(editX) {
            var xr0 = simpleMap(edit.xr0, xa.r2l);
            var xr1 = simpleMap(edit.xr1, xa.r2l);
            var dx0 = xr0[1] - xr0[0];
            var dx1 = xr1[1] - xr1[0];
            viewBox[0] = (xr0[0] * (1 - progress) + progress * xr1[0] - xr0[0]) / (xr0[1] - xr0[0]) * xlen;
            viewBox[2] = xlen * ((1 - progress) + progress * dx1 / dx0);
            xa.range[0] = xa.l2r(xr0[0] * (1 - progress) + progress * xr1[0]);
            xa.range[1] = xa.l2r(xr0[1] * (1 - progress) + progress * xr1[1]);
        } else {
            viewBox[0] = 0;
            viewBox[2] = xlen;
        }

        if(editY) {
            var yr0 = simpleMap(edit.yr0, ya.r2l);
            var yr1 = simpleMap(edit.yr1, ya.r2l);
            var dy0 = yr0[1] - yr0[0];
            var dy1 = yr1[1] - yr1[0];
            viewBox[1] = (yr0[1] * (1 - progress) + progress * yr1[1] - yr0[1]) / (yr0[0] - yr0[1]) * ylen;
            viewBox[3] = ylen * ((1 - progress) + progress * dy1 / dy0);
            ya.range[0] = xa.l2r(yr0[0] * (1 - progress) + progress * yr1[0]);
            ya.range[1] = ya.l2r(yr0[1] * (1 - progress) + progress * yr1[1]);
        } else {
            viewBox[1] = 0;
            viewBox[3] = ylen;
        }

        Axes.drawOne(gd, xa, {skipTitle: true});
        Axes.drawOne(gd, ya, {skipTitle: true});
        Axes.redrawComponents(gd, [xa._id, ya._id]);

        var xScaleFactor = editX ? xlen / viewBox[2] : 1;
        var yScaleFactor = editY ? ylen / viewBox[3] : 1;
        var clipDx = editX ? viewBox[0] : 0;
        var clipDy = editY ? viewBox[1] : 0;
        var fracDx = editX ? (viewBox[0] / viewBox[2] * xlen) : 0;
        var fracDy = editY ? (viewBox[1] / viewBox[3] * ylen) : 0;
        var plotDx = xa._offset - fracDx;
        var plotDy = ya._offset - fracDy;

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

    var onComplete;
    if(makeOnCompleteCallback) {
        // This module makes the choice whether or not it notifies Plotly.transition
        // about completion:
        onComplete = makeOnCompleteCallback();
    }

    function transitionComplete() {
        var aobj = {};

        for(var i = 0; i < edits.length; i++) {
            var edit = edits[i];
            var xa = edit.plotinfo.xaxis;
            var ya = edit.plotinfo.yaxis;
            if(edit.xr1) aobj[xa._name + '.range'] = edit.xr1.slice();
            if(edit.yr1) aobj[ya._name + '.range'] = edit.yr1.slice();
        }

        // Signal that this transition has completed:
        onComplete && onComplete();

        return Registry.call('relayout', gd, aobj).then(function() {
            for(var i = 0; i < edits.length; i++) {
                unsetSubplotTransform(edits[i].plotinfo);
            }
        });
    }

    function transitionInterrupt() {
        var aobj: any = {};

        for(var i = 0; i < edits.length; i++) {
            var edit = edits[i];
            var xa = edit.plotinfo.xaxis;
            var ya = edit.plotinfo.yaxis;
            if(edit.xr0) aobj[xa._name + '.range'] = edit.xr0.slice();
            if(edit.yr0) aobj[ya._name + '.range'] = edit.yr0.slice();
        }

        return Registry.call('relayout', gd, aobj).then(function() {
            for(var i = 0; i < edits.length; i++) {
                unsetSubplotTransform(edits[i].plotinfo);
            }
        });
    }

    var t1, t2, raf;
    var easeMap = { linear: d3Ease.easeLinear, cubic: d3Ease.easeCubic, 'cubic-in-out': d3Ease.easeCubicInOut, sin: d3Ease.easeSin, exp: d3Ease.easeExp, circle: d3Ease.easeCircle, elastic: d3Ease.easeElastic, back: d3Ease.easeBack, bounce: d3Ease.easeBounce };
    var easeFn = easeMap[transitionOpts.easing] || d3Ease.easeCubic;

    gd._transitionData._interruptCallbacks.push(function() {
        window.cancelAnimationFrame(raf);
        raf = null;
        return transitionInterrupt();
    });

    function doFrame() {
        t2 = Date.now();

        var tInterp = Math.min(1, (t2 - t1) / transitionOpts.duration);
        var progress = easeFn(tInterp);

        for(var i = 0; i < edits.length; i++) {
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
