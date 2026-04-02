import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';

export default function handleLabelDefaults(coerce: any,  layout: FullLayout,  lineColor: any,  opts: any) {
    if(!opts) opts = {};
    const showLabels = coerce('contours.showlabels');
    if(showLabels) {
        const globalFont = layout.font;
        Lib.coerceFont(coerce, 'contours.labelfont', globalFont, { overrideDflt: {
            color: lineColor
        }});
        coerce('contours.labelformat');
    }

    if(opts.hasHover !== false) coerce('zhoverformat');
}
