import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import scatterGeoAttrs from '../scattergeo/attributes.js';
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import baseAttrs from '../../plots/attributes.js';
import { defaultLine } from '../../components/color/attributes.js';
import { extendFlat } from '../../lib/extend.js';

const scatterGeoMarkerLineAttrs = scatterGeoAttrs.marker.line;

export default extendFlat(
    {
        locations: {
            valType: 'data_array',
            editType: 'calc',
            description: ['Sets the coordinates via location IDs or names.', 'See `locationmode` for more info.'].join(
                ' '
            )
        },
        locationmode: scatterGeoAttrs.locationmode,
        z: {
            valType: 'data_array',
            editType: 'calc',
            description: 'Sets the color values.'
        },
        geojson: extendFlat({}, scatterGeoAttrs.geojson, {
            description: [
                'Sets optional GeoJSON data associated with this trace.',
                'If not given, the features on the base map are used.',

                'It can be set as a valid GeoJSON object or as a URL string.',
                'Note that we only accept GeoJSONs of type *FeatureCollection* or *Feature*',
                'with geometries of type *Polygon* or *MultiPolygon*.'

                // TODO add topojson support with additional 'topojsonobject' attr?
                // https://github.com/topojson/topojson-specification/blob/master/README.md
            ].join(' ')
        }),
        featureidkey: scatterGeoAttrs.featureidkey,

        text: extendFlat({}, scatterGeoAttrs.text, {
            description: 'Sets the text elements associated with each location.'
        }),
        hovertext: extendFlat({}, scatterGeoAttrs.hovertext, {
            description: 'Same as `text`.'
        }),
        marker: {
            line: {
                color: extendFlat({}, scatterGeoMarkerLineAttrs.color, { dflt: defaultLine }),
                width: extendFlat({}, scatterGeoMarkerLineAttrs.width, { dflt: 1 }),
                editType: 'calc'
            },
            opacity: {
                valType: 'number',
                arrayOk: true,
                min: 0,
                max: 1,
                dflt: 1,
                editType: 'style',
                description: 'Sets the opacity of the locations.'
            },
            editType: 'calc'
        },

        selected: {
            marker: {
                opacity: scatterGeoAttrs.selected.marker.opacity,
                editType: 'plot'
            },
            editType: 'plot'
        },
        unselected: {
            marker: {
                opacity: scatterGeoAttrs.unselected.marker.opacity,
                editType: 'plot'
            },
            editType: 'plot'
        },

        hoverinfo: extendFlat({}, baseAttrs.hoverinfo, {
            editType: 'calc',
            flags: ['location', 'z', 'text', 'name']
        }),
        hovertemplate: hovertemplateAttrs(),
        hovertemplatefallback: templatefallbackAttrs(),
        showlegend: extendFlat({}, baseAttrs.showlegend, { dflt: false })
    },

    colorScaleAttrs('', {
        cLetter: 'z',
        editTypeOverride: 'calc'
    })
);
