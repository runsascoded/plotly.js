import Lib from '../../lib/index.js';
import handleSampleDefaults from './sample_defaults.js';
import handleStyleDefaults from '../heatmap/style_defaults.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import handleHeatmapLabelDefaults from '../heatmap/label_defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    handleSampleDefaults(traceIn, traceOut, coerce, layout);
    if (traceOut.visible === false) return;

    handleStyleDefaults(traceIn, traceOut, coerce, layout);
    colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'z' });
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    handleHeatmapLabelDefaults(coerce, layout);

    coerce('xhoverformat');
    coerce('yhoverformat');
}
