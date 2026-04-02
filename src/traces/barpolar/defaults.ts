import Lib from '../../lib/index.js';
import _defaults from '../scatterpolar/defaults.js';
const { handleRThetaDefaults } = _defaults;
import handleStyleDefaults from '../bar/style_defaults.js';
import attributes from './attributes.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const len = handleRThetaDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }

    // coerce('orientation', (traceOut.theta && !traceOut.r) ? 'angular' : 'radial');

    coerce('thetaunit');
    coerce('base');
    coerce('offset');
    coerce('width');

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    // const textPosition = coerce('textposition');
    // const hasBoth = Array.isArray(textPosition) || textPosition === 'auto';
    // const hasInside = hasBoth || textPosition === 'inside';
    // const hasOutside = hasBoth || textPosition === 'outside';

    // if(hasInside || hasOutside) {
    //     const textFont = coerceFont(coerce, 'textfont', layout.font);
    //     if(hasInside) coerceFont(coerce, 'insidetextfont', textFont);
    //     if(hasOutside) coerceFont(coerce, 'outsidetextfont', textFont);
    //     coerce('constraintext');
    //     coerce('selected.textfont.color');
    //     coerce('unselected.textfont.color');
    //     coerce('cliponaxis');
    // }

    handleStyleDefaults(traceIn, traceOut, coerce, defaultColor, layout);

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
