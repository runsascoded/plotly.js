import Lib from '../../lib/index.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import attributes from './attributes.js';
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

const locationmodeBreakingChangeWarning = [
    'The library used by the *country names* `locationmode` option is changing in the next major version.',
    'Some country names in existing plots may not work in the new version.',
    'To ensure consistent behavior, consider setting `locationmode` to *ISO-3*.'
].join(' ');

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const locations = coerce('locations');
    const z = coerce('z');

    if (!(locations && locations.length && Lib.isArrayOrTypedArray(z) && z.length)) {
        traceOut.visible = false;
        return;
    }

    traceOut._length = Math.min(locations.length, z.length);

    const geojson = coerce('geojson');

    let locationmodeDflt;
    if ((typeof geojson === 'string' && geojson !== '') || Lib.isPlainObject(geojson)) {
        locationmodeDflt = 'geojson-id';
    }

    const locationMode = coerce('locationmode', locationmodeDflt);

    if (locationMode === 'country names') {
        Lib.warn(locationmodeBreakingChangeWarning);
    }

    if (locationMode === 'geojson-id') {
        coerce('featureidkey');
    }

    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    const mlw = coerce('marker.line.width');
    if (mlw) coerce('marker.line.color');
    coerce('marker.opacity');

    colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'z' });

    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
