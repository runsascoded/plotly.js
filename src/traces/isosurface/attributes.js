import colorScaleAttrs from '../../components/colorscale/attributes.js';
import { axisHoverFormat } from '../../plots/cartesian/axis_format_attributes.js';
import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import meshAttrs from '../mesh3d/attributes.js';
import baseAttrs from '../../plots/attributes.js';
import { extendFlat } from '../../lib/extend.js';
import { overrideAll } from '../../plot_api/edit_types.js';

function makeSliceAttr(axLetter) {
    return {
        show: {
            valType: 'boolean',
            dflt: false,
            description: ['Determines whether or not slice planes about the', axLetter, 'dimension are drawn.'].join(
                ' '
            )
        },
        locations: {
            valType: 'data_array',
            dflt: [],
            description: [
                'Specifies the location(s) of slices on the axis.',
                'When not specified slices would be created for',
                'all points of the axis',
                axLetter,
                'except start and end.'
            ].join(' ')
        },
        fill: {
            valType: 'number',
            min: 0,
            max: 1,
            dflt: 1,
            description: [
                'Sets the fill ratio of the `slices`. The default fill value of the',
                '`slices` is 1 meaning that they are entirely shaded. On the other hand',
                'Applying a `fill` ratio less than one would allow the creation of',
                'openings parallel to the edges.'
            ].join(' ')
        }
    };
}

function makeCapAttr(axLetter) {
    return {
        show: {
            valType: 'boolean',
            dflt: true,
            description: [
                'Sets the fill ratio of the `slices`. The default fill value of the',
                axLetter,
                '`slices` is 1 meaning that they are entirely shaded. On the other hand',
                'Applying a `fill` ratio less than one would allow the creation of',
                'openings parallel to the edges.'
            ].join(' ')
        },
        fill: {
            valType: 'number',
            min: 0,
            max: 1,
            dflt: 1,
            description: [
                'Sets the fill ratio of the `caps`. The default fill value of the',
                '`caps` is 1 meaning that they are entirely shaded. On the other hand',
                'Applying a `fill` ratio less than one would allow the creation of',
                'openings parallel to the edges.'
            ].join(' ')
        }
    };
}

var attrs = ({});

// required defaults to speed up surface normal calculations
attrs.flatshading.dflt = true;
attrs.lighting.facenormalsepsilon.dflt = 0;

attrs.x.editType = attrs.y.editType = attrs.z.editType = attrs.value.editType = 'calc+clearAxisTypes';

export default attrs;
