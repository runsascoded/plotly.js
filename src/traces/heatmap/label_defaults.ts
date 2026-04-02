import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';

export default function handleHeatmapLabelDefaults(coerce,  layout: FullLayout) {
    coerce('texttemplate');
    coerce('texttemplatefallback');

    const fontDflt = Lib.extendFlat({}, layout.font, {
        color: 'auto',
        size: 'auto'
    });
    Lib.coerceFont(coerce, 'textfont', fontDflt);
}
