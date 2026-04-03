import { traceIs } from '../../lib/trace_categories.js';
import autoType from './axis_autotype.js';
export default function handleTypeDefaults(containerIn, containerOut, coerce, options) {
    coerce('autotypenumbers', options.autotypenumbersDflt);
    const axType = coerce('type', (options.splomStash || {}).type);
    if (axType === '-') {
        setAutoType(containerOut, options.data);
        if (containerOut.type === '-') {
            containerOut.type = 'linear';
        }
        else {
            // copy autoType back to input axis
            // note that if this object didn't exist
            // in the input layout, we have to put it in
            // this happens in the main supplyDefaults function
            containerIn.type = containerOut.type;
        }
    }
}
function setAutoType(ax, data) {
    // new logic: let people specify any type they want,
    // only autotype if type is '-'
    if (ax.type !== '-')
        return;
    let id = ax._id;
    const axLetter = id.charAt(0);
    let i;
    // support 3d
    if (id.indexOf('scene') !== -1)
        id = axLetter;
    const d0 = getFirstNonEmptyTrace(data, id, axLetter);
    if (!d0)
        return;
    // first check for histograms, as the count direction
    // should always default to a linear axis
    if (d0.type === 'histogram' &&
        axLetter === { v: 'y', h: 'x' }[d0.orientation || 'v']) {
        ax.type = 'linear';
        return;
    }
    const calAttr = axLetter + 'calendar';
    let calendar = d0[calAttr];
    const opts = { noMultiCategory: !traceIs(d0, 'cartesian') || traceIs(d0, 'noMultiCategory') };
    // To not confuse 2D x/y used for per-box sample points for multicategory coordinates
    if (d0.type === 'box' && d0._hasPreCompStats &&
        axLetter === { h: 'x', v: 'y' }[d0.orientation || 'v']) {
        opts.noMultiCategory = true;
    }
    opts.autotypenumbers = ax.autotypenumbers;
    // check all boxes on this x axis to see
    // if they're dates, numbers, or categories
    if (isBoxWithoutPositionCoords(d0, axLetter)) {
        const posLetter = getBoxPosLetter(d0);
        const boxPositions = [];
        for (i = 0; i < data.length; i++) {
            const trace = data[i];
            if (!traceIs(trace, 'box-violin') || (trace[axLetter + 'axis'] || axLetter) !== id)
                continue;
            if (trace[posLetter] !== undefined)
                boxPositions.push(trace[posLetter][0]);
            else if (trace.name !== undefined)
                boxPositions.push(trace.name);
            else
                boxPositions.push('text');
            if (trace[calAttr] !== calendar)
                calendar = undefined;
        }
        ax.type = autoType(boxPositions, calendar, opts);
    }
    else if (d0.type === 'splom') {
        const dimensions = d0.dimensions;
        const dim = dimensions[d0._axesDim[id]];
        if (dim.visible)
            ax.type = autoType(dim.values, calendar, opts);
    }
    else {
        ax.type = autoType(d0[axLetter] || [d0[axLetter + '0']], calendar, opts);
    }
}
function getFirstNonEmptyTrace(data, id, axLetter) {
    for (let i = 0; i < data.length; i++) {
        const trace = data[i];
        if (trace.type === 'splom' &&
            trace._length > 0 &&
            (trace['_' + axLetter + 'axes'] || {})[id]) {
            return trace;
        }
        if ((trace[axLetter + 'axis'] || axLetter) === id) {
            if (isBoxWithoutPositionCoords(trace, axLetter)) {
                return trace;
            }
            else if ((trace[axLetter] || []).length || trace[axLetter + '0']) {
                return trace;
            }
        }
    }
}
function getBoxPosLetter(trace) {
    return { v: 'x', h: 'y' }[trace.orientation || 'v'];
}
function isBoxWithoutPositionCoords(trace, axLetter) {
    const posLetter = getBoxPosLetter(trace);
    const isBox = traceIs(trace, 'box-violin');
    const isCandlestick = traceIs(trace._fullInput || {}, 'candlestick');
    return (isBox &&
        !isCandlestick &&
        axLetter === posLetter &&
        trace[posLetter] === undefined &&
        trace[posLetter + '0'] === undefined);
}
