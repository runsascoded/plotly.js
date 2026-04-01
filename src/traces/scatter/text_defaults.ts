import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import { coerceFont } from '../../lib/index.js';

export default function(traceIn: InputTrace, traceOut: FullTrace, layout: FullLayout, coerce: any, opts?: any): void {
    opts = opts || {};

    coerce('textposition');
    coerceFont(coerce, 'textfont', opts.font || layout.font, opts);

    if(!opts.noSelect) {
        coerce('selected.textfont.color');
        coerce('unselected.textfont.color');
    }
}
