import Lib from '../../lib/index.js';
import handleSampleDefaults from '../histogram2d/sample_defaults.js';
import handleContoursDefaults from '../contour/contours_defaults.js';
import handleStyleDefaults from '../contour/style_defaults.js';
import handleHeatmapLabelDefaults from '../heatmap/label_defaults.js';
import attributes from './attributes.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    function coerce2(attr) {
        return Lib.coerce2(traceIn, traceOut, attributes, attr);
    }
    handleSampleDefaults(traceIn, traceOut, coerce, layout);
    if (traceOut.visible === false)
        return;
    handleContoursDefaults(traceIn, traceOut, coerce, coerce2);
    handleStyleDefaults(traceIn, traceOut, coerce, layout);
    coerce('xhoverformat');
    coerce('yhoverformat');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    if (traceOut.contours && traceOut.contours.coloring === 'heatmap') {
        handleHeatmapLabelDefaults(coerce, layout);
    }
}
