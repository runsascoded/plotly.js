import baseAttrs from '../../plots/attributes.js';
import fontAttrs from '../../plots/font_attributes.js';
import makeFillcolorAttr from '../scatter/fillcolor_attribute.js';
import scatterAttrs from '../scatter/attributes.js';
import _axis_format_attributes from '../../plots/cartesian/axis_format_attributes.js';
const { axisHoverFormat } = _axis_format_attributes;
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import sortObjectKeys from '../../lib/sort_object_keys.js';
import { extendFlat } from '../../lib/extend.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;
import _constants from './constants.js';
const { DASHES } = _constants;

var scatterLineAttrs = scatterAttrs.line;
var scatterMarkerAttrs = scatterAttrs.marker;
var scatterMarkerLineAttrs = scatterMarkerAttrs.line;

var attrs = ({});

attrs.x.editType = attrs.y.editType = attrs.x0.editType = attrs.y0.editType = 'calc+clearAxisTypes';
attrs.hovertemplate = scatterAttrs.hovertemplate;
attrs.hovertemplatefallback = scatterAttrs.hovertemplatefallback;
attrs.texttemplate = scatterAttrs.texttemplate;
attrs.texttemplatefallback = scatterAttrs.texttemplatefallback;

export default attrs;
