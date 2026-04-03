import { coerceFont } from '../../lib/index.js';
export default function (traceIn, traceOut, layout, coerce, opts) {
    opts = opts || {};
    coerce('textposition');
    coerceFont(coerce, 'textfont', opts.font || layout.font, opts);
    if (!opts.noSelect) {
        coerce('selected.textfont.color');
        coerce('unselected.textfont.color');
    }
}
