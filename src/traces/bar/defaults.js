import isNumeric from 'fast-isnumeric';
import Lib, { coerceFont, coerceSelectionMarkerOpacity, extendFlat } from '../../lib/index.js';
import Color from '../../components/color/index.js';
import { getComponentMethod } from '../../registry.js';
import handleXYDefaults from '../scatter/xy_defaults.js';
import handlePeriodDefaults from '../scatter/period_defaults.js';
import handleStyleDefaults from './style_defaults.js';
import handleGroupingDefaults from '../scatter/grouping_defaults.js';
import attributes from './attributes.js';
function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const len = handleXYDefaults(traceIn, traceOut, layout, coerce);
    if (!len) {
        traceOut.visible = false;
        return;
    }
    handlePeriodDefaults(traceIn, traceOut, layout, coerce);
    coerce('xhoverformat');
    coerce('yhoverformat');
    coerce('zorder');
    coerce('orientation', traceOut.x && !traceOut.y ? 'h' : 'v');
    coerce('base');
    coerce('offset');
    coerce('width');
    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    const textposition = coerce('textposition');
    handleText(traceIn, traceOut, layout, coerce, textposition, {
        moduleHasSelected: true,
        moduleHasUnselected: true,
        moduleHasConstrain: true,
        moduleHasCliponaxis: true,
        moduleHasTextangle: true,
        moduleHasInsideanchor: true
    });
    handleStyleDefaults(traceIn, traceOut, coerce, defaultColor, layout);
    const lineColor = (traceOut.marker.line || {}).color;
    // override defaultColor for error bars with defaultLine
    const errorBarsSupplyDefaults = getComponentMethod('errorbars', 'supplyDefaults');
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'y' });
    errorBarsSupplyDefaults(traceIn, traceOut, lineColor || Color.defaultLine, { axis: 'x', inherit: 'y' });
    coerceSelectionMarkerOpacity(traceOut, coerce);
}
function crossTraceDefaults(fullData, fullLayout) {
    let traceIn, traceOut;
    function coerce(attr, dflt) {
        return Lib.coerce(traceOut._input, traceOut, attributes, attr, dflt);
    }
    for (let i = 0; i < fullData.length; i++) {
        traceOut = fullData[i];
        if (traceOut.type === 'bar') {
            traceIn = traceOut._input;
            // `marker.cornerradius` needs to be coerced here rather than in handleStyleDefaults()
            // because it needs to happen after `layout.barcornerradius` has been coerced
            const r = coerce('marker.cornerradius', fullLayout.barcornerradius);
            if (traceOut.marker) {
                traceOut.marker.cornerradius = validateCornerradius(r);
            }
            handleGroupingDefaults(traceIn, traceOut, fullLayout, coerce, fullLayout.barmode);
        }
    }
}
// Returns a value equivalent to the given cornerradius value, if valid;
// otherwise returns`undefined`.
// Valid cornerradius values must be either:
//   - a numeric value (string or number) >= 0, or
//   - a string consisting of a number >= 0 followed by a % sign
// If the given cornerradius value is a numeric string, it will be converted
// to a number.
function validateCornerradius(r) {
    if (isNumeric(r)) {
        r = +r;
        if (r >= 0)
            return r;
    }
    else if (typeof r === 'string') {
        r = r.trim();
        if (r.slice(-1) === '%' && isNumeric(r.slice(0, -1))) {
            r = +r.slice(0, -1);
            if (r >= 0)
                return r + '%';
        }
    }
    return undefined;
}
function handleText(traceIn, traceOut, layout, coerce, textposition, opts) {
    opts = opts || {};
    const moduleHasSelected = !(opts.moduleHasSelected === false);
    const moduleHasUnselected = !(opts.moduleHasUnselected === false);
    const moduleHasConstrain = !(opts.moduleHasConstrain === false);
    const moduleHasCliponaxis = !(opts.moduleHasCliponaxis === false);
    const moduleHasTextangle = !(opts.moduleHasTextangle === false);
    const moduleHasInsideanchor = !(opts.moduleHasInsideanchor === false);
    const hasPathbar = !!opts.hasPathbar;
    const hasBoth = Array.isArray(textposition) || textposition === 'auto';
    const hasInside = hasBoth || textposition === 'inside';
    const hasOutside = hasBoth || textposition === 'outside';
    if (hasInside || hasOutside) {
        const dfltFont = coerceFont(coerce, 'textfont', layout.font);
        // Note that coercing `insidetextfont` is always needed –
        // even if `textposition` is `outside` for each trace – since
        // an outside label can become an inside one, for example because
        // of a bar being stacked on top of it.
        const insideTextFontDefault = extendFlat({}, dfltFont);
        const isTraceTextfontColorSet = traceIn.textfont && traceIn.textfont.color;
        const isColorInheritedFromLayoutFont = !isTraceTextfontColorSet;
        if (isColorInheritedFromLayoutFont) {
            delete insideTextFontDefault.color;
        }
        coerceFont(coerce, 'insidetextfont', insideTextFontDefault);
        if (hasPathbar) {
            const pathbarTextFontDefault = extendFlat({}, dfltFont);
            if (isColorInheritedFromLayoutFont) {
                delete pathbarTextFontDefault.color;
            }
            coerceFont(coerce, 'pathbar.textfont', pathbarTextFontDefault);
        }
        if (hasOutside)
            coerceFont(coerce, 'outsidetextfont', dfltFont);
        if (moduleHasSelected)
            coerce('selected.textfont.color');
        if (moduleHasUnselected)
            coerce('unselected.textfont.color');
        if (moduleHasConstrain)
            coerce('constraintext');
        if (moduleHasCliponaxis)
            coerce('cliponaxis');
        if (moduleHasTextangle)
            coerce('textangle');
        coerce('texttemplate');
        coerce('texttemplatefallback');
    }
    if (hasInside) {
        if (moduleHasInsideanchor)
            coerce('insidetextanchor');
    }
}
export default {
    supplyDefaults: supplyDefaults,
    crossTraceDefaults: crossTraceDefaults,
    handleText: handleText,
    validateCornerradius: validateCornerradius
};
