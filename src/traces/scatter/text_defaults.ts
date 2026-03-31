import { coerceFont } from '../../lib/index.js';

export default function(traceIn: any, traceOut: any, layout: any, coerce: any, opts?: any): void {
    opts = opts || {};

    coerce('textposition');
    coerceFont(coerce, 'textfont', opts.font || layout.font, opts);

    if(!opts.noSelect) {
        coerce('selected.textfont.color');
        coerce('unselected.textfont.color');
    }
}
