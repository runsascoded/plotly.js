import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';
import _defaults from '../bar/defaults.js';
const { handleText } = _defaults;
import _defaults2 from '../pie/defaults.js';
const { handleMarkerDefaults } = _defaults2;
import Colorscale from '../../components/colorscale/index.js';
const hasColorscale = Colorscale.hasColorscale;
const colorscaleDefaults = Colorscale.handleDefaults;

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const labels = coerce('labels');
    const parents = coerce('parents');

    if (!labels || !labels.length || !parents || !parents.length) {
        traceOut.visible = false;
        return;
    }

    const vals = coerce('values');
    if (vals && vals.length) {
        coerce('branchvalues');
    } else {
        coerce('count');
    }

    coerce('level');
    coerce('maxdepth');

    // @ts-expect-error pie handleMarkerDefaults accepts variable args
    handleMarkerDefaults(traceIn, traceOut, layout, coerce);

    const withColorscale = (traceOut._hasColorscale =
        hasColorscale(traceIn, 'marker', 'colors') || (traceIn.marker || {}).coloraxis); // N.B. special logic to consider "values" colorscales
    if (withColorscale) {
        colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: 'marker.', cLetter: 'c' });
    }

    coerce('leaf.opacity', withColorscale ? 1 : 0.7);

    const text = coerce('text');
    coerce('texttemplate');
    coerce('texttemplatefallback');
    if (!traceOut.texttemplate) coerce('textinfo', Lib.isArrayOrTypedArray(text) ? 'text+label' : 'label');

    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    const textposition = 'auto';
    handleText(traceIn, traceOut, layout, coerce, textposition, {
        moduleHasSelected: false,
        moduleHasUnselected: false,
        moduleHasConstrain: false,
        moduleHasCliponaxis: false,
        moduleHasTextangle: false,
        moduleHasInsideanchor: false
    });

    coerce('insidetextorientation');

    coerce('sort');

    coerce('rotation');

    coerce('root.color');

    handleDomainDefaults(traceOut, layout, coerce);

    // do not support transforms for now
    traceOut._length = null;
}
