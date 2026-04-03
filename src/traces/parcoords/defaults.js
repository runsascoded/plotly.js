import Lib from '../../lib/index.js';
import _helpers from '../../components/colorscale/helpers.js';
const { hasColorscale } = _helpers;
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import handleArrayContainerDefaults from '../../plots/array_container_defaults.js';
import Axes from '../../plots/cartesian/axes.js';
import attributes from './attributes.js';
import axisBrush from './axisbrush.js';
import _constants from './constants.js';
const { maxDimensionCount } = _constants;
import mergeLength from './merge_length.js';
function handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce) {
    const lineColor = coerce('line.color', defaultColor);
    if (hasColorscale(traceIn, 'line') && Lib.isArrayOrTypedArray(lineColor)) {
        if (lineColor.length) {
            coerce('line.colorscale');
            colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: 'line.', cLetter: 'c' });
            // TODO: I think it would be better to keep showing lines beyond the last line color
            // but I'm not sure what color to give these lines - probably black or white
            // depending on the background color?
            return lineColor.length;
        }
        else {
            traceOut.line.color = defaultColor;
        }
    }
    return Infinity;
}
function dimensionDefaults(dimensionIn, dimensionOut, parentOut, opts) {
    function coerce(attr, dflt) {
        return Lib.coerce(dimensionIn, dimensionOut, attributes.dimensions, attr, dflt);
    }
    const values = coerce('values');
    let visible = coerce('visible');
    if (!(values && values.length)) {
        visible = dimensionOut.visible = false;
    }
    if (visible) {
        coerce('label');
        coerce('tickvals');
        coerce('ticktext');
        coerce('tickformat');
        const range = coerce('range');
        dimensionOut._ax = {
            _id: 'y',
            type: 'linear',
            showexponent: 'all',
            exponentformat: 'B',
            range: range
        };
        Axes.setConvert(dimensionOut._ax, opts.layout);
        coerce('multiselect');
        const constraintRange = coerce('constraintrange');
        if (constraintRange) {
            dimensionOut.constraintrange = axisBrush.cleanRanges(constraintRange, dimensionOut);
        }
    }
}
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const dimensionsIn = traceIn.dimensions;
    if (Array.isArray(dimensionsIn) && dimensionsIn.length > maxDimensionCount) {
        Lib.log('parcoords traces support up to ' + maxDimensionCount + ' dimensions at the moment');
        dimensionsIn.splice(maxDimensionCount);
    }
    const dimensions = handleArrayContainerDefaults(traceIn, traceOut, {
        name: 'dimensions',
        layout: layout,
        handleItemDefaults: dimensionDefaults
    });
    const len = handleLineDefaults(traceIn, traceOut, defaultColor, layout, coerce);
    handleDomainDefaults(traceOut, layout, coerce);
    if (!Array.isArray(dimensions) || !dimensions.length) {
        traceOut.visible = false;
    }
    mergeLength(traceOut, dimensions, 'values', len);
    // make default font size 10px (default is 12),
    // scale linearly with global font size
    const fontDflt = Lib.extendFlat({}, layout.font, {
        size: Math.round(layout.font.size / 1.2)
    });
    Lib.coerceFont(coerce, 'labelfont', fontDflt);
    Lib.coerceFont(coerce, 'tickfont', fontDflt, { autoShadowDflt: true });
    Lib.coerceFont(coerce, 'rangefont', fontDflt);
    coerce('labelangle');
    coerce('labelside');
    coerce('unselected.line.color');
    coerce('unselected.line.opacity');
}
