import type { FullLayout } from '../../../types/core';
import Lib from '../../lib/index.js';
import Color from '../color/index.js';

export default function handleAnnotationCommonDefaults(annIn: any, annOut: any, fullLayout: FullLayout, coerce: any) {
    coerce('opacity');
    const bgColor = coerce('bgcolor');

    const borderColor = coerce('bordercolor');
    const borderOpacity = Color.opacity(borderColor);

    coerce('borderpad');

    const borderWidth = coerce('borderwidth');
    const showArrow = coerce('showarrow');

    coerce('text', showArrow ? ' ' : fullLayout._dfltTitle.annotation);
    coerce('textangle');
    Lib.coerceFont(coerce, 'font', fullLayout.font);

    coerce('width');
    coerce('align');

    const h = coerce('height');
    if(h) coerce('valign');

    if(showArrow) {
        const arrowside = coerce('arrowside');
        let arrowhead;
        let arrowsize;

        if(arrowside.indexOf('end') !== -1) {
            arrowhead = coerce('arrowhead');
            arrowsize = coerce('arrowsize');
        }

        if(arrowside.indexOf('start') !== -1) {
            coerce('startarrowhead', arrowhead);
            coerce('startarrowsize', arrowsize);
        }
        coerce('arrowcolor', borderOpacity ? annOut.bordercolor : Color.defaultLine);
        coerce('arrowwidth', ((borderOpacity && borderWidth) || 1) * 2);
        coerce('standoff');
        coerce('startstandoff');
    }

    const hoverText = coerce('hovertext');
    const globalHoverLabel = fullLayout.hoverlabel || {};

    if(hoverText) {
        const hoverBG = coerce('hoverlabel.bgcolor', globalHoverLabel.bgcolor ||
            (Color.opacity(bgColor) ? Color.rgb(bgColor) : Color.defaultLine)
        );

        const hoverBorder = coerce('hoverlabel.bordercolor', globalHoverLabel.bordercolor ||
            Color.contrast(hoverBG)
        );

        const fontDflt = Lib.extendFlat({}, globalHoverLabel.font);
        if(!fontDflt.color) {
            fontDflt.color = hoverBorder;
        }

        Lib.coerceFont(coerce, 'hoverlabel.font', fontDflt);
    }

    coerce('captureevents', !!hoverText);
}
