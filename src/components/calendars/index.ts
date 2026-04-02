import calendars from './calendars.js';
import Lib from '../../lib/index.js';
import { CANONICAL_TICK, CANONICAL_SUNDAY, DFLTRANGE, getCal, worldCalFmt } from './helpers.js';

export { CANONICAL_TICK, CANONICAL_SUNDAY, DFLTRANGE, getCal, worldCalFmt };

const attributes = {
    valType: 'enumerated',
    values: Lib.sortObjectKeys(calendars.calendars),
    editType: 'calc',
    dflt: 'gregorian'
};

export const handleDefaults = (contIn: any, contOut: any, attr: any, dflt: any) => {
    const attrs: any = {};
    attrs[attr] = attributes;

    return Lib.coerce(contIn, contOut, attrs, attr, dflt);
};

export const handleTraceDefaults = (traceIn: any, traceOut: any, coords: any, layout: any) => {
    for(let i = 0; i < coords.length; i++) {
        handleDefaults(traceIn, traceOut, coords[i] + 'calendar', layout.calendar);
    }
};

function makeAttrs(description: any) {
    return Lib.extendFlat({}, attributes, { description: description });
}

function makeTraceAttrsDescription(coord: any) {
    return 'Sets the calendar system to use with `' + coord + '` date data.';
}

const xAttrs = {
    xcalendar: makeAttrs(makeTraceAttrsDescription('x'))
};

const xyAttrs = Lib.extendFlat({}, xAttrs, {
    ycalendar: makeAttrs(makeTraceAttrsDescription('y'))
});

const xyzAttrs = Lib.extendFlat({}, xyAttrs, {
    zcalendar: makeAttrs(makeTraceAttrsDescription('z'))
});

const axisAttrs = makeAttrs([
    'Sets the calendar system to use for `range` and `tick0`',
    'if this is a date axis. This does not set the calendar for',
    'interpreting data on this axis, that\'s specified in the trace',
    'or via the global `layout.calendar`'
].join(' '));

export default {
    moduleType: 'component',
    name: 'calendars',

    schema: {
        traces: {
            scatter: xyAttrs,
            bar: xyAttrs,
            box: xyAttrs,
            heatmap: xyAttrs,
            contour: xyAttrs,
            histogram: xyAttrs,
            histogram2d: xyAttrs,
            histogram2dcontour: xyAttrs,
            scatter3d: xyzAttrs,
            surface: xyzAttrs,
            mesh3d: xyzAttrs,
            scattergl: xyAttrs,
            ohlc: xAttrs,
            candlestick: xAttrs
        },
        layout: {
            calendar: makeAttrs([
                'Sets the default calendar system to use for interpreting and',
                'displaying dates throughout the plot.'
            ].join(' '))
        },
        subplots: {
            xaxis: {calendar: axisAttrs},
            yaxis: {calendar: axisAttrs},
            scene: {
                xaxis: {calendar: axisAttrs},
                yaxis: {calendar: axisAttrs},
                zaxis: {calendar: axisAttrs}
            },
            polar: {
                radialaxis: {calendar: axisAttrs}
            }
        }
    },

    layoutAttributes: attributes,

    handleDefaults: handleDefaults,
    handleTraceDefaults: handleTraceDefaults,

    CANONICAL_SUNDAY: CANONICAL_SUNDAY,
    CANONICAL_TICK: CANONICAL_TICK,
    DFLTRANGE: DFLTRANGE,

    getCal: getCal,
    worldCalFmt: worldCalFmt
};
