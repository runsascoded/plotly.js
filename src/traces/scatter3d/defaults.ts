import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { handleTraceDefaults as calendarTraceDefaults } from '../../components/calendars/index.js';
import { errorbarSupplyDefaults } from '../../components/errorbars/index.js';
import Lib from '../../lib/index.js';
import subTypes from '../scatter/subtypes.js';
import handleMarkerDefaults from '../scatter/marker_defaults.js';
import handleLineDefaults from '../scatter/line_defaults.js';
import handleTextDefaults from '../scatter/text_defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleXYZDefaults(traceIn, traceOut, coerce, layout);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('xhoverformat');
    coerce('yhoverformat');
    coerce('zhoverformat');

    coerce('mode');

    if (subTypes.hasMarkers(traceOut)) {
        handleMarkerDefaults(traceIn, traceOut, defaultColor, layout, coerce, { noSelect: true, noAngle: true });
    }

    if (subTypes.hasLines(traceOut)) {
        coerce('connectgaps');
        handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);
    }

    if (subTypes.hasText(traceOut)) {
        coerce('texttemplate');
        coerce('texttemplatefallback');
        handleTextDefaults(traceIn, traceOut, layout, coerce, {
            noSelect: true,
            noFontShadow: true,
            noFontLineposition: true,
            noFontTextcase: true
        });
    }

    const lineColor = (traceOut.line || {}).color;
    const markerColor = (traceOut.marker || {}).color;
    if (coerce('surfaceaxis') >= 0) coerce('surfacecolor', lineColor || markerColor);

    const dims = ['x', 'y', 'z'];
    for (let i = 0; i < 3; ++i) {
        const projection = 'projection.' + dims[i];
        if (coerce(projection + '.show')) {
            coerce(projection + '.opacity');
            coerce(projection + '.scale');
        }
    }

    errorbarSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'z' });
    errorbarSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'y', inherit: 'z' });
    errorbarSupplyDefaults(traceIn, traceOut, lineColor || markerColor || defaultColor, { axis: 'x', inherit: 'z' });
}

function handleXYZDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: any, layout: FullLayout) {
    let len = 0;
    const x = coerce('x');
    const y = coerce('y');
    const z = coerce('z');

    calendarTraceDefaults(traceIn, traceOut, ['x', 'y', 'z'], layout);

    if (x && y && z) {
        // TODO: what happens if one is missing?
        len = Math.min(x.length, y.length, z.length);
        traceOut._length = traceOut._xlength = traceOut._ylength = traceOut._zlength = len;
    }

    return len;
}
