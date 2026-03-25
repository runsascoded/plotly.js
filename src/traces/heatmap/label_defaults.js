import Lib from '../../lib/index.js';

export default function handleHeatmapLabelDefaults(coerce, layout) {
    coerce('texttemplate');
    coerce('texttemplatefallback');

    var fontDflt = Lib.extendFlat({}, layout.font, {
        color: 'auto',
        size: 'auto'
    });
    Lib.coerceFont(coerce, 'textfont', fontDflt);
}
