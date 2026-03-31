import type { FullTrace, InputTrace } from '../../../types/core';
export default function handleContourDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: any, coerce2: any) {
    var contourStart = coerce2('contours.start');
    var contourEnd = coerce2('contours.end');
    var missingEnd = (contourStart === false) || (contourEnd === false);

    // normally we only need size if autocontour is off. But contour.calc
    // pushes its calculated contour size back to the input trace, so for
    // things like restyle that can call supplyDefaults without calc
    // after the initial draw, we can just reuse the previous calculation
    var contourSize = coerce('contours.size');
    var autoContour;

    if(missingEnd) autoContour = traceOut.autocontour = true;
    else autoContour = coerce('autocontour', false);

    if(autoContour || !contourSize) coerce('ncontours');
}
