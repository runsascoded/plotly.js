import colorScaleAttrs from '../../components/colorscale/attributes.js';
import isosurfaceAttrs from '../isosurface/attributes.js';
import surfaceAttrs from '../surface/attributes.js';
import baseAttrs from '../../plots/attributes.js';
import { extendFlat } from '../../lib/extend.js';
import _edit_types from '../../plot_api/edit_types.js';
const { overrideAll } = _edit_types;

const attrs = overrideAll(
    extendFlat(
        {
            x: isosurfaceAttrs.x,
            y: isosurfaceAttrs.y,
            z: isosurfaceAttrs.z,
            value: isosurfaceAttrs.value,
            isomin: isosurfaceAttrs.isomin,
            isomax: isosurfaceAttrs.isomax,
            surface: isosurfaceAttrs.surface,
            spaceframe: {
                show: {
                    valType: 'boolean',
                    dflt: false,
                    description: [
                        'Displays/hides tetrahedron shapes between minimum and',
                        'maximum iso-values. Often useful when either caps or',
                        'surfaces are disabled or filled with values less than 1.'
                    ].join(' ')
                },
                fill: {
                    valType: 'number',
                    min: 0,
                    max: 1,
                    dflt: 1,
                    description: [
                        'Sets the fill ratio of the `spaceframe` elements. The default fill value',
                        'is 1 meaning that they are entirely shaded. Applying a `fill` ratio less',
                        'than one would allow the creation of openings parallel to the edges.'
                    ].join(' ')
                }
            },

            slices: isosurfaceAttrs.slices,
            caps: isosurfaceAttrs.caps,
            text: isosurfaceAttrs.text,
            hovertext: isosurfaceAttrs.hovertext,
            xhoverformat: isosurfaceAttrs.xhoverformat,
            yhoverformat: isosurfaceAttrs.yhoverformat,
            zhoverformat: isosurfaceAttrs.zhoverformat,
            valuehoverformat: isosurfaceAttrs.valuehoverformat,
            hovertemplate: isosurfaceAttrs.hovertemplate,
            hovertemplatefallback: isosurfaceAttrs.hovertemplatefallback
        },

        colorScaleAttrs('', {
            colorAttr: '`value`',
            showScaleDflt: true,
            editTypeOverride: 'calc'
        }),
        {
            colorbar: isosurfaceAttrs.colorbar,
            opacity: isosurfaceAttrs.opacity,
            opacityscale: surfaceAttrs.opacityscale,

            lightposition: isosurfaceAttrs.lightposition,
            lighting: isosurfaceAttrs.lighting,
            flatshading: isosurfaceAttrs.flatshading,
            contour: isosurfaceAttrs.contour,

            hoverinfo: extendFlat({}, baseAttrs.hoverinfo),
            showlegend: extendFlat({}, baseAttrs.showlegend, { dflt: false })
        }
    ),
    'calc',
    'nested'
);

attrs.x.editType = attrs.y.editType = attrs.z.editType = attrs.value.editType = 'calc+clearAxisTypes';

export default attrs;
