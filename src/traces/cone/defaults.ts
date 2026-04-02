import Lib from '../../lib/index.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import attributes from './attributes.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const u = coerce('u');
    const v = coerce('v');
    const w = coerce('w');

    const x = coerce('x');
    const y = coerce('y');
    const z = coerce('z');

    if (
        !u ||
        !u.length ||
        !v ||
        !v.length ||
        !w ||
        !w.length ||
        !x ||
        !x.length ||
        !y ||
        !y.length ||
        !z ||
        !z.length
    ) {
        traceOut.visible = false;
        return;
    }

    const sizemode = coerce('sizemode');
    coerce('sizeref', sizemode === 'raw' ? 1 : 0.5);

    coerce('anchor');

    coerce('lighting.ambient');
    coerce('lighting.diffuse');
    coerce('lighting.specular');
    coerce('lighting.roughness');
    coerce('lighting.fresnel');
    coerce('lightposition.x');
    coerce('lightposition.y');
    coerce('lightposition.z');

    colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'c' });

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('uhoverformat');
    coerce('vhoverformat');
    coerce('whoverformat');
    coerce('xhoverformat');
    coerce('yhoverformat');
    coerce('zhoverformat');

    // disable 1D transforms (for now)
    traceOut._length = null;
}
