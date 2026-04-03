import colorScaleAttrs from '../../components/colorscale/attributes.js';
import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import baseAttrs from '../../plots/attributes.js';
import scatterMapboxAttrs from '../scattermapbox/attributes.js';
import { extendFlat } from '../../lib/extend.js';
export default extendFlat({
    lon: scatterMapboxAttrs.lon,
    lat: scatterMapboxAttrs.lat,
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
            'Increasing the value makes the densitymapbox trace smoother, but less detailed.'
        ].join(' ')
    },
    below: {
        valType: 'string',
        editType: 'plot',
        description: [
            'Determines if the densitymapbox trace will be inserted',
            'before the layer with the specified ID.',
            'By default, densitymapbox traces are placed below the first',
            'layer of type symbol',
            "If set to '',",
            'the layer will be inserted above every existing layer.'
        ].join(' ')
    },
    text: scatterMapboxAttrs.text,
    hovertext: scatterMapboxAttrs.hovertext,
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
