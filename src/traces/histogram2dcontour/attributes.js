import histogram2dAttrs from '../histogram2d/attributes.js';
import contourAttrs from '../contour/attributes.js';
import colorScaleAttrs from '../../components/colorscale/attributes.js';
import _axis_format_attributes from '../../plots/cartesian/axis_format_attributes.js';
const { axisHoverFormat } = _axis_format_attributes;
import { extendFlat } from '../../lib/extend.js';
export default extendFlat({
    x: histogram2dAttrs.x,
    y: histogram2dAttrs.y,
    z: histogram2dAttrs.z,
    marker: histogram2dAttrs.marker,
    histnorm: histogram2dAttrs.histnorm,
    histfunc: histogram2dAttrs.histfunc,
    nbinsx: histogram2dAttrs.nbinsx,
    xbins: histogram2dAttrs.xbins,
    nbinsy: histogram2dAttrs.nbinsy,
    ybins: histogram2dAttrs.ybins,
    autobinx: histogram2dAttrs.autobinx,
    autobiny: histogram2dAttrs.autobiny,
    bingroup: histogram2dAttrs.bingroup,
    xbingroup: histogram2dAttrs.xbingroup,
    ybingroup: histogram2dAttrs.ybingroup,
    autocontour: contourAttrs.autocontour,
    ncontours: contourAttrs.ncontours,
    contours: contourAttrs.contours,
    line: {
        color: contourAttrs.line.color,
        width: extendFlat({}, contourAttrs.line.width, {
            dflt: 0.5,
            description: 'Sets the contour line width in (in px)'
        }),
        dash: contourAttrs.line.dash,
        smoothing: contourAttrs.line.smoothing,
        editType: 'plot'
    },
    xhoverformat: axisHoverFormat('x'),
    yhoverformat: axisHoverFormat('y'),
    zhoverformat: axisHoverFormat('z', 1),
    hovertemplate: histogram2dAttrs.hovertemplate,
    hovertemplatefallback: histogram2dAttrs.hovertemplatefallback,
    texttemplate: contourAttrs.texttemplate,
    texttemplatefallback: contourAttrs.texttemplatefallback,
    textfont: contourAttrs.textfont
}, colorScaleAttrs('', {
    cLetter: 'z',
    editTypeOverride: 'calc'
}));
