import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import handleXYZDefaults from './xyz_defaults.js';
import handleHeatmapLabelDefaults from './label_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import handleStyleDefaults from './style_defaults.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import attributes from './attributes.js';

export default function supplyDefaults(traceIn: InputTrace,  traceOut: FullTrace,  defaultColor: string,  layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const validData = handleXYZDefaults(traceIn, traceOut, coerce, layout);
    if (!validData) {
        traceOut.visible = false;
        return;
    }

    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    handleHeatmapLabelDefaults(coerce, layout);
    handleStyleDefaults(traceIn, traceOut, coerce, layout);

    coerce('hoverongaps');
    coerce('connectgaps', Lib.isArray1D(traceOut.z) && traceOut.zsmooth !== false);

    (colorscaleDefaults as any)(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'z' });
    coerce('zorder');
}
