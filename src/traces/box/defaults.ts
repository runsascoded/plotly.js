import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import { getComponentMethod } from '../../registry.js';
import Color from '../../components/color/index.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import handleGroupingDefaults from '../scatter/grouping_defaults.js';
import autoType from '../../plots/cartesian/axis_autotype.js';
import attributes from './attributes.js';

function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    handleSampleDefaults(traceIn, traceOut, coerce, layout);
    if (traceOut.visible === false) return;

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    const hasPreCompStats = traceOut._hasPreCompStats;

    if (hasPreCompStats) {
        coerce('lowerfence');
        coerce('upperfence');
    }

    coerce('line.color', (traceIn.marker || {}).color || defaultColor);
    coerce('line.width');
    coerce('fillcolor', Color.addOpacity(traceOut.line.color, 0.5));

    let boxmeanDflt: boolean | string = false;
    if (hasPreCompStats) {
        const mean = coerce('mean');
        const sd = coerce('sd');
        if (mean && mean.length) {
            boxmeanDflt = true;
            if (sd && sd.length) boxmeanDflt = 'sd';
        }
    }

    coerce('whiskerwidth');
    const sizemode = coerce('sizemode');
    let boxmean;
    if (sizemode === 'quartiles') {
        boxmean = coerce('boxmean', boxmeanDflt);
    }
    coerce('showwhiskers', sizemode === 'quartiles');
    if (sizemode === 'sd' || boxmean === 'sd') {
        coerce('sdmultiple');
    }
    coerce('width');
    coerce('quartilemethod');

    let notchedDflt = false;
    if (hasPreCompStats) {
        const notchspan = coerce('notchspan');
        if (notchspan && notchspan.length) {
            notchedDflt = true;
        }
    } else if (Lib.validate(traceIn.notchwidth, attributes.notchwidth)) {
        notchedDflt = true;
    }
    const notched = coerce('notched', notchedDflt);
    if (notched) coerce('notchwidth');

    handlePointsDefaults(traceIn, traceOut, coerce, { prefix: 'box' });
    coerce('zorder');
}

function handleSampleDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: Function, layout: FullLayout): void {
    function getDims(arr: any) {
        let dims = 0;
        if (arr && arr.length) {
            dims += 1;
            if (Lib.isArrayOrTypedArray(arr[0]) && arr[0].length) {
                dims += 1;
            }
        }
        return dims;
    }

    function valid(astr: any) {
        return Lib.validate(traceIn[astr], (attributes as any)[astr]);
    }

    const y = coerce('y');
    const x = coerce('x');

    let sLen;
    if (traceOut.type === 'box') {
        const q1 = coerce('q1');
        const median = coerce('median');
        const q3 = coerce('q3');

        traceOut._hasPreCompStats = q1 && q1.length && median && median.length && q3 && q3.length;
        sLen = Math.min(Lib.minRowLength(q1), Lib.minRowLength(median), Lib.minRowLength(q3));
    }

    const yDims = getDims(y);
    const xDims = getDims(x);
    const yLen = yDims && Lib.minRowLength(y);
    const xLen = xDims && Lib.minRowLength(x);

    const calendar = layout.calendar;
    const opts = {
        autotypenumbers: layout.autotypenumbers
    };

    let defaultOrientation, len;
    if (traceOut._hasPreCompStats) {
        switch (String(xDims) + String(yDims)) {
            // no x / no y
            case '00':
                const setInX = valid('x0') || valid('dx');
                const setInY = valid('y0') || valid('dy');

                if (setInY && !setInX) {
                    defaultOrientation = 'h';
                } else {
                    defaultOrientation = 'v';
                }

                len = sLen;
                break;
            // just x
            case '10':
                defaultOrientation = 'v';
                len = Math.min(sLen as any, xLen);
                break;
            case '20':
                defaultOrientation = 'h';
                len = Math.min(sLen as any, x.length);
                break;
            // just y
            case '01':
                defaultOrientation = 'h';
                len = Math.min(sLen as any, yLen);
                break;
            case '02':
                defaultOrientation = 'v';
                len = Math.min(sLen as any, y.length);
                break;
            // both
            case '12':
                defaultOrientation = 'v';
                len = Math.min(sLen as any, xLen, y.length);
                break;
            case '21':
                defaultOrientation = 'h';
                len = Math.min(sLen as any, x.length, yLen);
                break;
            case '11':
                // this one is ill-defined
                len = 0;
                break;
            case '22':
                let hasCategories = false;
                let i;
                for (i = 0; i < x.length; i++) {
                    if (autoType(x[i], calendar, opts) === 'category') {
                        hasCategories = true;
                        break;
                    }
                }

                if (hasCategories) {
                    defaultOrientation = 'v';
                    len = Math.min(sLen as any, xLen, y.length);
                } else {
                    for (i = 0; i < y.length; i++) {
                        if (autoType(y[i], calendar, opts) === 'category') {
                            hasCategories = true;
                            break;
                        }
                    }

                    if (hasCategories) {
                        defaultOrientation = 'h';
                        len = Math.min(sLen as any, x.length, yLen);
                    } else {
                        defaultOrientation = 'v';
                        len = Math.min(sLen as any, xLen, y.length);
                    }
                }
                break;
        }
    } else if (yDims > 0) {
        defaultOrientation = 'v';
        if (xDims > 0) {
            len = Math.min(xLen, yLen);
        } else {
            len = Math.min(yLen);
        }
    } else if (xDims > 0) {
        defaultOrientation = 'h';
        len = Math.min(xLen);
    } else {
        len = 0;
    }

    if (!len) {
        traceOut.visible = false;
        return;
    }
    traceOut._length = len;

    const orientation = coerce('orientation', defaultOrientation);

    // these are just used for positioning, they never define the sample
    if (traceOut._hasPreCompStats) {
        if (orientation === 'v' && xDims === 0) {
            coerce('x0', 0);
            coerce('dx', 1);
        } else if (orientation === 'h' && yDims === 0) {
            coerce('y0', 0);
            coerce('dy', 1);
        }
    } else {
        if (orientation === 'v' && xDims === 0) {
            coerce('x0');
        } else if (orientation === 'h' && yDims === 0) {
            coerce('y0');
        }
    }

    const handleCalendarDefaults = getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y'], layout);
}

function handlePointsDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: Function, opts: { prefix: string }): void {
    const prefix = opts.prefix;

    const outlierColorDflt = Lib.coerce2(traceIn, traceOut, attributes, 'marker.outliercolor');
    const lineoutliercolor = coerce('marker.line.outliercolor');

    let modeDflt = 'outliers';
    if (traceOut._hasPreCompStats) {
        modeDflt = 'all';
    } else if (outlierColorDflt || lineoutliercolor) {
        modeDflt = 'suspectedoutliers';
    }

    const mode = coerce(prefix + 'points', modeDflt);

    if (mode) {
        coerce('jitter', mode === 'all' ? 0.3 : 0);
        coerce('pointpos', mode === 'all' ? -1.5 : 0);

        coerce('marker.symbol');
        coerce('marker.opacity');
        coerce('marker.size');
        coerce('marker.angle');

        coerce('marker.color', traceOut.line.color);
        coerce('marker.line.color');
        coerce('marker.line.width');

        if (mode === 'suspectedoutliers') {
            coerce('marker.line.outliercolor', traceOut.marker.color);
            coerce('marker.line.outlierwidth');
        }

        coerce('selected.marker.color');
        coerce('unselected.marker.color');
        coerce('selected.marker.size');
        coerce('unselected.marker.size');

        coerce('text');
        coerce('hovertext');
    } else {
        delete traceOut.marker;
    }

    const hoveron = coerce('hoveron');
    if (hoveron === 'all' || hoveron.indexOf('points') !== -1) {
        coerce('hovertemplate');
        coerce('hovertemplatefallback');
    }

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}

function crossTraceDefaults(fullData: FullTrace[], fullLayout: FullLayout): void {
    let traceIn, traceOut: any;

    function coerce(attr: any) {
        return Lib.coerce(traceOut._input, traceOut, attributes, attr);
    }

    for (let i = 0; i < fullData.length; i++) {
        traceOut = fullData[i];
        const traceType = traceOut.type;

        if (traceType === 'box' || traceType === 'violin') {
            traceIn = traceOut._input;
            const mode = fullLayout[traceType + 'mode'];
            if (mode === 'group') {
                handleGroupingDefaults(traceIn, traceOut, fullLayout, coerce, mode);
            }
        }
    }
}

export default {
    supplyDefaults: supplyDefaults,
    crossTraceDefaults: crossTraceDefaults,

    handleSampleDefaults: handleSampleDefaults,
    handlePointsDefaults: handlePointsDefaults
};
