import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { isArrayOrTypedArray } from '../../lib/index.js';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleDefaults from '../../components/colorscale/defaults.js';

export default function lineDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout, coerce: any, opts?: any): void {
    if(!opts) opts = {};

    var markerColor = (traceIn.marker || {}).color;
    if(markerColor && markerColor._inputArray) markerColor = markerColor._inputArray;

    coerce('line.color', defaultColor);

    if(hasColorscale(traceIn, 'line')) {
        colorscaleDefaults(traceIn, traceOut, layout, coerce, {prefix: 'line.', cLetter: 'c'});
    } else {
        var lineColorDflt = (isArrayOrTypedArray(markerColor) ? false : markerColor) || defaultColor;
        coerce('line.color', lineColorDflt);
    }

    coerce('line.width');

    if(!opts.noDash) coerce('line.dash');
    if(opts.backoff) coerce('line.backoff');
}
