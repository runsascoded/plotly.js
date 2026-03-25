import baseAttrs from '../../plots/attributes.js';
import fontAttrs from '../../plots/font_attributes.js';
import makeFillcolorAttr from '../scatter/fillcolor_attribute.js';
import scatterAttrs from '../scatter/attributes.js';
import { axisHoverFormat } from '../../plots/cartesian/axis_format_attributes.js';
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import sortObjectKeys from '../../lib/sort_object_keys.js';
import { extendFlat } from '../../lib/extend.js';
import { overrideAll } from '../../plot_api/edit_types.js';
import { DASHES } from './constants.js';

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
