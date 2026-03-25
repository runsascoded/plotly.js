import colorScaleAttrs from '../../components/colorscale/attributes.js';
import isosurfaceAttrs from '../isosurface/attributes.js';
import surfaceAttrs from '../surface/attributes.js';
import baseAttrs from '../../plots/attributes.js';
import { extendFlat } from '../../lib/extend.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;

var attrs = ({});

attrs.x.editType = attrs.y.editType = attrs.z.editType = attrs.value.editType = 'calc+clearAxisTypes';

export default attrs;
