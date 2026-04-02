import type { FullTrace, InputTrace } from '../../../types/core';
export default function handleContourDefaults(traceIn: InputTrace, traceOut: FullTrace, coerce: any, coerce2: any) {
    const contourStart = coerce2('contours.start');
    const contourEnd = coerce2('contours.end');
    const missingEnd = (contourStart === false) || (contourEnd === false);

    // normally we only need size if autocontour is off. But contour.calc
    // pushes its calculated contour size back to the input trace, so for
    // things like restyle that can call supplyDefaults without calc
    // after the initial draw, we can just reuse the previous calculation
    const contourSize = coerce('contours.size');
    let autoContour;

    if(missingEnd) autoContour = traceOut.autocontour = true;
    else autoContour = coerce('autocontour', false);

    if(autoContour || !contourSize) coerce('ncontours');
}
