import { hovertemplateAttrs, texttemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import { extendFlat } from '../../lib/extend.js';
import makeFillcolorAttr from '../scatter/fillcolor_attribute.js';
import scatterAttrs from '../scatter/attributes.js';
import baseAttrs from '../../plots/attributes.js';
const lineAttrs = scatterAttrs.line;
export default {
    mode: scatterAttrs.mode,
    real: {
        valType: 'data_array',
        editType: 'calc+clearAxisTypes',
        description: [
            'Sets the real component of the data, in units of normalized impedance',
            'such that real=1, imag=0 is the center of the chart.'
        ].join(' ')
    },
    imag: {
        valType: 'data_array',
        editType: 'calc+clearAxisTypes',
        description: [
            'Sets the imaginary component of the data, in units of normalized impedance',
            'such that real=1, imag=0 is the center of the chart.'
        ].join(' ')
    },
    text: scatterAttrs.text,
    texttemplate: texttemplateAttrs({ editType: 'plot' }, { keys: ['real', 'imag', 'text'] }),
    texttemplatefallback: templatefallbackAttrs({ editType: 'plot' }),
    hovertext: scatterAttrs.hovertext,
    line: {
        color: lineAttrs.color,
        width: lineAttrs.width,
        dash: lineAttrs.dash,
        backoff: lineAttrs.backoff,
        shape: extendFlat({}, lineAttrs.shape, {
            values: ['linear', 'spline']
        }),
        smoothing: lineAttrs.smoothing,
        editType: 'calc'
    },
    connectgaps: scatterAttrs.connectgaps,
    marker: scatterAttrs.marker,
    cliponaxis: extendFlat({}, scatterAttrs.cliponaxis, { dflt: false }),
    textposition: scatterAttrs.textposition,
    textfont: scatterAttrs.textfont,
    fill: extendFlat({}, scatterAttrs.fill, {
        values: ['none', 'toself', 'tonext'],
        dflt: 'none',
        description: [
            'Sets the area to fill with a solid color.',
            'Use with `fillcolor` if not *none*.',
            'scattersmith has a subset of the options available to scatter.',
            '*toself* connects the endpoints of the trace (or each segment',
            'of the trace if it has gaps) into a closed shape.',
            '*tonext* fills the space between two traces if one completely',
            'encloses the other (eg consecutive contour lines), and behaves like',
            '*toself* if there is no trace before it. *tonext* should not be',
            'used if one trace does not enclose the other.'
        ].join(' ')
    }),
    fillcolor: makeFillcolorAttr(),
    hoverinfo: extendFlat({}, baseAttrs.hoverinfo, {
        flags: ['real', 'imag', 'text', 'name']
    }),
    hoveron: scatterAttrs.hoveron,
    hovertemplate: hovertemplateAttrs(),
    hovertemplatefallback: templatefallbackAttrs(),
    selected: scatterAttrs.selected,
    unselected: scatterAttrs.unselected
};
