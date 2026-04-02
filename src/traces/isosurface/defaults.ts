import Lib from '../../lib/index.js';
import Registry from '../../registry.js';
import attributes from './attributes.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    supplyIsoDefaults(traceIn, traceOut, defaultColor, layout, coerce);
}

function supplyIsoDefaults(traceIn, traceOut, defaultColor, layout, coerce) {
    const isomin = coerce('isomin');
    const isomax = coerce('isomax');

    if(isomax !== undefined && isomax !== null &&
        isomin !== undefined && isomin !== null &&
         isomin > isomax) {
        // applying default values in this case:
        traceOut.isomin = null;
        traceOut.isomax = null;
    }

    const x = coerce('x');
    const y = coerce('y');
    const z = coerce('z');
    const value = coerce('value');

    if(
        !x || !x.length ||
        !y || !y.length ||
        !z || !z.length ||
        !value || !value.length
    ) {
        traceOut.visible = false;
        return;
    }

    const handleCalendarDefaults = Registry.getComponentMethod('calendars', 'handleTraceDefaults');
    handleCalendarDefaults(traceIn, traceOut, ['x', 'y', 'z'], layout);

    coerce('valuehoverformat');
    ['x', 'y', 'z'].forEach(function(dim) {
        coerce(dim + 'hoverformat');

        const capDim = 'caps.' + dim;
        const showCap = coerce(capDim + '.show');
        if(showCap) {
            coerce(capDim + '.fill');
        }

        const sliceDim = 'slices.' + dim;
        const showSlice = coerce(sliceDim + '.show');
        if(showSlice) {
            coerce(sliceDim + '.fill');
            coerce(sliceDim + '.locations');
        }
    });

    const showSpaceframe = coerce('spaceframe.show');
    if(showSpaceframe) {
        coerce('spaceframe.fill');
    }

    const showSurface = coerce('surface.show');
    if(showSurface) {
        coerce('surface.count');
        coerce('surface.fill');
        coerce('surface.pattern');
    }

    const showContour = coerce('contour.show');
    if(showContour) {
        coerce('contour.color');
        coerce('contour.width');
    }

    // Coerce remaining properties
    [
        'text',
        'hovertext',
        'hovertemplate',
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
        'opacity'
    ].forEach(function(x) { coerce(x); });

    colorscaleDefaults(traceIn, traceOut, layout, coerce, {prefix: '', cLetter: 'c'});

    // disable 1D transforms (for now)
    traceOut._length = null;
}

export default {
    supplyDefaults: supplyDefaults,
    supplyIsoDefaults: supplyIsoDefaults
};
