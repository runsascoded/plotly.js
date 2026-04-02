import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import attributes from './attributes.js';
import mergeLength from '../parcoords/merge_length.js';
import { isTypedArraySpec } from '../../lib/array.js';

function handleLineDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout, coerce: any) {
    coerce('line.shape');
    coerce('line.hovertemplate');
    coerce('line.hovertemplatefallback');

    const lineColor = coerce('line.color', layout.colorway[0]);
    if (hasColorscale(traceIn, 'line') && Lib.isArrayOrTypedArray(lineColor)) {
        if (lineColor.length) {
            coerce('line.colorscale');
            colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: 'line.', cLetter: 'c' });
            return lineColor.length;
        } else {
            traceOut.line.color = defaultColor;
        }
    }
    return Infinity;
}

function dimensionDefaults(dimensionIn: any, dimensionOut: any) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(dimensionIn, dimensionOut, attributes.dimensions, attr, dflt);
    }

    const values = coerce('values');
    let visible = coerce('visible');
    if (!(values && values.length)) {
        visible = dimensionOut.visible = false;
    }

    if (visible) {
        // Dimension level
        coerce('label');
        coerce('displayindex', dimensionOut._index);

        // Category level
        const arrayIn = dimensionIn.categoryarray;
        const isValidArray = (Lib.isArrayOrTypedArray(arrayIn) && arrayIn.length > 0) || isTypedArraySpec(arrayIn);

        let orderDefault;
        if (isValidArray) orderDefault = 'array';
        const order = coerce('categoryorder', orderDefault);

        // coerce 'categoryarray' only in array order case
        if (order === 'array') {
            coerce('categoryarray');
            coerce('ticktext');
        } else {
            delete dimensionIn.categoryarray;
            delete dimensionIn.ticktext;
        }

        // cannot set 'categoryorder' to 'array' with an invalid 'categoryarray'
        if (!isValidArray && order === 'array') {
            dimensionOut.categoryorder = 'trace';
        }
    }
}

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: any, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const dimensions = handleArrayContainerDefaults(traceIn, traceOut, {
        name: 'dimensions',
        handleItemDefaults: dimensionDefaults
    });

    const len = handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    handleDomainDefaults(traceOut, layout, coerce);

    if (!Array.isArray(dimensions) || !dimensions.length) {
        traceOut.visible = false;
    }

    mergeLength(traceOut, dimensions, 'values', len);

    coerce('hoveron');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    coerce('arrangement');
    coerce('bundlecolors');
    coerce('sortpaths');
    coerce('counts');

    const layoutFont = layout.font;

    Lib.coerceFont(coerce, 'labelfont', layoutFont, {
        overrideDflt: {
            size: Math.round((layoutFont!.size as any))
        }
    });

    Lib.coerceFont(coerce, 'tickfont', layoutFont, {
        autoShadowDflt: true,
        overrideDflt: {
            size: Math.round(layoutFont!.size! / 1.2)
        }
    });
}
