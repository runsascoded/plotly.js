import scatterAttrs from '../scatter/attributes.js';
import fontAttrs from '../../plots/font_attributes.js';
import colorAttributes from '../../components/colorscale/attributes.js';
import { axisHoverFormat } from '../../plots/cartesian/axis_format_attributes.js';
import { hovertemplateAttrs, texttemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import baseAttrs from '../../plots/attributes.js';
import DASHES from '../../constants/gl3d_dashes.js';
import MARKER_SYMBOLS from '../../constants/gl3d_markers.js';
import { extendFlat } from '../../lib/extend.js';
import { overrideAll } from '../../plot_api/edit_types.js';
import sortObjectKeys from '../../lib/sort_object_keys.js';

var scatterLineAttrs = scatterAttrs.line;
var scatterMarkerAttrs = scatterAttrs.marker;
var scatterMarkerLineAttrs = scatterMarkerAttrs.line;

var lineAttrs = extendFlat(
    {
        width: scatterLineAttrs.width,
        dash: {
            valType: 'enumerated',
            values: sortObjectKeys(DASHES),
            dflt: 'solid',
            description: 'Sets the dash style of the lines.'
        }
    },
    colorAttributes('line')
);

function makeProjectionAttr(axLetter) {
    return {
        show: {
            valType: 'boolean',
            dflt: false,
            description: ['Sets whether or not projections are shown along the', axLetter, 'axis.'].join(' ')
        },
        opacity: {
            valType: 'number',
            min: 0,
            max: 1,
            dflt: 1,
            description: 'Sets the projection color.'
        },
        scale: {
            valType: 'number',
            min: 0,
            max: 10,
            dflt: 2 / 3,
            description: ['Sets the scale factor determining the size of the', 'projection marker points.'].join(' ')
        }
    };
}

var attrs = ({});

attrs.x.editType = attrs.y.editType = attrs.z.editType = 'calc+clearAxisTypes';

export default attrs;
