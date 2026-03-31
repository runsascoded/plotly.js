import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';

export default function handleLabelDefaults(coerce,  layout: FullLayout,  lineColor,  opts) {
    if(!opts) opts = {};
    var showLabels = coerce('contours.showlabels');
    if(showLabels) {
        var globalFont = layout.font;
        Lib.coerceFont(coerce, 'contours.labelfont', globalFont, { overrideDflt: {
            color: lineColor
        }});
        coerce('contours.labelformat');
    }

    if(opts.hasHover !== false) coerce('zhoverformat');
}
