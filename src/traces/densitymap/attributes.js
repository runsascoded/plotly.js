import colorScaleAttrs from '../../components/colorscale/attributes.js';
import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import baseAttrs from '../../plots/attributes.js';
import scatterMapAttrs from '../scattermap/attributes.js';
import { extendFlat } from '../../lib/extend.js';
export default extendFlat({
    lon: scatterMapAttrs.lon,
    lat: scatterMapAttrs.lat,
    z: {
        valType: 'data_array',
        editType: 'calc',
        description: [
            "Sets the points' weight.",
            'For example, a value of 10 would be equivalent to having 10 points of weight 1',
            'in the same spot'
        ].join(' ')
    },
    radius: {
        valType: 'number',
        editType: 'plot',
        arrayOk: true,
        min: 1,
        dflt: 30,
        description: [
            'Sets the radius of influence of one `lon` / `lat` point in pixels.',
            'Increasing the value makes the densitymap trace smoother, but less detailed.'
        ].join(' ')
    },
    below: {
        valType: 'string',
        editType: 'plot',
        description: [
            'Determines if the densitymap trace will be inserted',
            'before the layer with the specified ID.',
            'By default, densitymap traces are placed below the first',
            'layer of type symbol',
            "If set to '',",
            'the layer will be inserted above every existing layer.'
        ].join(' ')
    },
    text: scatterMapAttrs.text,
    hovertext: scatterMapAttrs.hovertext,
    hoverinfo: extendFlat({}, baseAttrs.hoverinfo, {
        flags: ['lon', 'lat', 'z', 'text', 'name']
    }),
    hovertemplate: hovertemplateAttrs(),
    hovertemplatefallback: templatefallbackAttrs(),
    showlegend: extendFlat({}, baseAttrs.showlegend, { dflt: false })
}, colorScaleAttrs('', {
    cLetter: 'z',
    editTypeOverride: 'calc'
}));
