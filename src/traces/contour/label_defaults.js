import Lib from '../../lib/index.js';
export default function handleLabelDefaults(coerce, layout, lineColor, opts) {
    if (!opts)
        opts = {};
    const showLabels = coerce('contours.showlabels');
    if (showLabels) {
        const globalFont = layout.font;
        Lib.coerceFont(coerce, 'contours.labelfont', globalFont, { overrideDflt: {
                color: lineColor
            } });
        coerce('contours.labelformat');
    }
    if (opts.hasHover !== false)
        coerce('zhoverformat');
}
