import Color from '../../components/color/index.js';
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import _axis_format_attributes from '../../plots/cartesian/axis_format_attributes.js';
const { axisHoverFormat } = _axis_format_attributes;
import { hovertemplateAttrs, templatefallbackAttrs } from '../../plots/template_attributes.js';
import baseAttrs from '../../plots/attributes.js';
import { extendFlat } from '../../lib/extend.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;

function makeContourProjAttr(axLetter) {
    return {
        valType: 'boolean',
        dflt: false,
        description: [
            'Determines whether or not these contour lines are projected',
            'on the',
            axLetter,
            'plane.',
            'If `highlight` is set to *true* (the default), the projected',
            'lines are shown on hover.',
            'If `show` is set to *true*, the projected lines are shown',
            'in permanence.'
        ].join(' ')
    };
}

function makeContourAttr(axLetter) {
    return {
        show: {
            valType: 'boolean',
            dflt: false,
            description: ['Determines whether or not contour lines about the', axLetter, 'dimension are drawn.'].join(
                ' '
            )
        },
        start: {
            valType: 'number',
            dflt: null,
            editType: 'plot',
            // impliedEdits: {'^autocontour': false},
            description: ['Sets the starting contour level value.', 'Must be less than `contours.end`'].join(' ')
        },
        end: {
            valType: 'number',
            dflt: null,
            editType: 'plot',
            // impliedEdits: {'^autocontour': false},
            description: ['Sets the end contour level value.', 'Must be more than `contours.start`'].join(' ')
        },
        size: {
            valType: 'number',
            dflt: null,
            min: 0,
            editType: 'plot',
            // impliedEdits: {'^autocontour': false},
            description: ['Sets the step between each contour level.', 'Must be positive.'].join(' ')
        },
        project: {
            x: makeContourProjAttr('x'),
            y: makeContourProjAttr('y'),
            z: makeContourProjAttr('z')
        },
        color: {
            valType: 'color',
            dflt: Color.defaultLine,
            description: 'Sets the color of the contour lines.'
        },
        usecolormap: {
            valType: 'boolean',
            dflt: false,
            description: [
                'An alternate to *color*.',
                'Determines whether or not the contour lines are colored using',
                'the trace *colorscale*.'
            ].join(' ')
        },
        width: {
            valType: 'number',
            min: 1,
            max: 16,
            dflt: 2,
            description: 'Sets the width of the contour lines.'
        },
        highlight: {
            valType: 'boolean',
            dflt: true,
            description: [
                'Determines whether or not contour lines about the',
                axLetter,
                'dimension are highlighted on hover.'
            ].join(' ')
        },
        highlightcolor: {
            valType: 'color',
            dflt: Color.defaultLine,
            description: 'Sets the color of the highlighted contour lines.'
        },
        highlightwidth: {
            valType: 'number',
            min: 1,
            max: 16,
            dflt: 2,
            description: 'Sets the width of the highlighted contour lines.'
        }
    };
}

var attrs = ({});

attrs.x.editType = attrs.y.editType = attrs.z.editType = 'calc+clearAxisTypes';

export default attrs;
