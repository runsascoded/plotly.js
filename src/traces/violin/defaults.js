import Lib from '../../lib/index.js';
import Color from '../../components/color/index.js';
import boxDefaults from '../box/defaults.js';
import attributes from './attributes.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    function coerce2(attr, dflt) {
        return Lib.coerce2(traceIn, traceOut, attributes, attr, dflt);
    }
    boxDefaults.handleSampleDefaults(traceIn, traceOut, coerce, layout);
    if (traceOut.visible === false)
        return;
    coerce('bandwidth');
    coerce('side');
    const width = coerce('width');
    if (!width) {
        coerce('scalegroup', traceOut.name);
        coerce('scalemode');
    }
    const span = coerce('span');
    let spanmodeDflt;
    if (Array.isArray(span))
        spanmodeDflt = 'manual';
    coerce('spanmode', spanmodeDflt);
    const lineColor = coerce('line.color', (traceIn.marker || {}).color || defaultColor);
    const lineWidth = coerce('line.width');
    const fillColor = coerce('fillcolor', Color.addOpacity(traceOut.line.color, 0.5));
    boxDefaults.handlePointsDefaults(traceIn, traceOut, coerce, { prefix: '' });
    const boxWidth = coerce2('box.width');
    const boxFillColor = coerce2('box.fillcolor', fillColor);
    const boxLineColor = coerce2('box.line.color', lineColor);
    const boxLineWidth = coerce2('box.line.width', lineWidth);
    const boxVisible = coerce('box.visible', Boolean(boxWidth || boxFillColor || boxLineColor || boxLineWidth));
    if (!boxVisible)
        traceOut.box = { visible: false };
    const meanLineColor = coerce2('meanline.color', lineColor);
    const meanLineWidth = coerce2('meanline.width', lineWidth);
    const meanLineVisible = coerce('meanline.visible', Boolean(meanLineColor || meanLineWidth));
    if (!meanLineVisible)
        traceOut.meanline = { visible: false };
    coerce('quartilemethod');
    coerce('zorder');
}
