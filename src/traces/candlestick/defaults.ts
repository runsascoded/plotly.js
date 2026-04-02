import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import handleOHLC from '../ohlc/ohlc_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import attributes from './attributes.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleOHLC(traceIn, traceOut, coerce, layout);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce, { x: true });
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('line.width');

    handleDirection(traceIn, traceOut, coerce, 'increasing');
    handleDirection(traceIn, traceOut, coerce, 'decreasing');

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    coerce('whiskerwidth');

    layout._requestRangeslider[traceOut.xaxis] = true;
    coerce('zorder');
}

function handleDirection(traceIn: any, traceOut: any, coerce: any, direction: any) {
    const lineColor = coerce(direction + '.line.color');
    coerce(direction + '.line.width', traceOut.line.width);
    coerce(direction + '.fillcolor', Color.addOpacity(lineColor, 0.5));
}
