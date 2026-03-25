import Lib from '../../lib/index.js';
import Color from '../color/index.js';
import { isUnifiedHover } from './helpers.js';

export default function handleHoverLabelDefaults(contIn, contOut, coerce, opts) {
    opts = opts || {};

    var hasLegend = contOut.legend;

    function inheritFontAttr(attr) {
        if(!opts.font[attr]) {
            opts.font[attr] = hasLegend ? contOut.legend.font[attr] : contOut.font[attr];
        }
    }

    // In unified hover, inherit from layout.legend if available or layout
    if(contOut && isUnifiedHover(contOut.hovermode)) {
        if(!opts.font) opts.font = {};
        inheritFontAttr('size');
        inheritFontAttr('family');
        inheritFontAttr('color');
        inheritFontAttr('weight');
        inheritFontAttr('style');
        inheritFontAttr('variant');

        if(hasLegend) {
            if(!opts.bgcolor) opts.bgcolor = Color.combine(contOut.legend.bgcolor, contOut.paper_bgcolor);
            if(!opts.bordercolor) opts.bordercolor = contOut.legend.bordercolor;
        } else {
            if(!opts.bgcolor) opts.bgcolor = contOut.paper_bgcolor;
        }
    }

    coerce('hoverlabel.bgcolor', opts.bgcolor);
    coerce('hoverlabel.bordercolor', opts.bordercolor);
    coerce('hoverlabel.namelength', opts.namelength);
    coerce('hoverlabel.showarrow', opts.showarrow);
    Lib.coerceFont(coerce, 'hoverlabel.font', opts.font);
    coerce('hoverlabel.align', opts.align);
}
