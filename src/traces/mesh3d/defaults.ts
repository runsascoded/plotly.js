import Registry from '../../registry.js';
import Lib from '../../lib/index.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import attributes from './attributes.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    // read in face/vertex properties
    function readComponents(array: any) {
        const ret = array.map((attr: any) => {
            const result = coerce(attr);

            if (result && Lib.isArrayOrTypedArray(result)) return result;
            return null;
        });

        return (
            ret.every(function (x: any) {
                return x && x.length === ret[0].length;
            }) && ret
        );
    }

    const coords = readComponents(['x', 'y', 'z']);
    if (!coords) {
        traceOut.visible = false;
        return;
    }

    readComponents(['i', 'j', 'k']);
    // three indices should be all provided or not
    if (
        (traceOut.i && (!traceOut.j || !traceOut.k)) ||
        (traceOut.j && (!traceOut.k || !traceOut.i)) ||
        (traceOut.k && (!traceOut.i || !traceOut.j))
    ) {
        traceOut.visible = false;
        return;
    }

    const handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y', 'z'], layout);

    // Coerce remaining properties
    [
        'lighting.ambient',
        'lighting.diffuse',
        'lighting.specular',
        'lighting.roughness',
        'lighting.fresnel',
        'lighting.vertexnormalsepsilon',
        'lighting.facenormalsepsilon',
        'lightposition.x',
        'lightposition.y',
        'lightposition.z',
        'flatshading',
        'alphahull',
        'delaunayaxis',
        'opacity'
    ].forEach((x) => {
        coerce(x);
    });

    const showContour = coerce('contour.show');
    if (showContour) {
        coerce('contour.color');
        coerce('contour.width');
    }

    if ('intensity' in traceIn) {
        coerce('intensity');
        coerce('intensitymode');
        colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'c' });
    } else {
        traceOut.showscale = false;

        if ('facecolor' in traceIn) coerce('facecolor');
        else if ('vertexcolor' in traceIn) coerce('vertexcolor');
        else coerce('color', defaultColor);
    }

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('xhoverformat');
    coerce('yhoverformat');
    coerce('zhoverformat');

    // disable 1D transforms
    // x/y/z should match lengths, and i/j/k should match as well, but
    // the two sets have different lengths so transforms wouldn't work.
    traceOut._length = null;
}
