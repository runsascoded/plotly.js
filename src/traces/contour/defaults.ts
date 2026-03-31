import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import handleXYZDefaults from '../heatmap/xyz_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import handleConstraintDefaults from './constraint_defaults.js';
import handleContoursDefaults from './contours_defaults.js';
import handleStyleDefaults from './style_defaults.js';
import handleHeatmapLabelDefaults from '../heatmap/label_defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn: InputTrace,  traceOut: FullTrace,  defaultColor: string,  layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    function coerce2(attr: string) {
        return Lib.coerce2(traceIn, traceOut, attributes, attr);
    }

    var len = handleXYZDefaults(traceIn, traceOut, coerce, layout);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('text');
    coerce('hovertext');
    coerce('hoverongaps');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    var isConstraint = coerce('contours.type') === 'constraint';
    coerce('connectgaps', Lib.isArray1D(traceOut.z));

    if (isConstraint) {
        handleConstraintDefaults(traceIn, traceOut, coerce, layout, defaultColor);
    } else {
        handleContoursDefaults(traceIn, traceOut, coerce, coerce2);
        handleStyleDefaults(traceIn, traceOut, coerce, layout);
    }

    if (traceOut.contours && traceOut.contours.coloring === 'heatmap') {
        handleHeatmapLabelDefaults(coerce, layout);
    }
    coerce('zorder');
}
