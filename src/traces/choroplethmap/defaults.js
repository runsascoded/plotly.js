import Lib from '../../lib/index.js';
import colorscaleDefaults from '../../components/colorscale/defaults.js';
import attributes from './attributes.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const locations = coerce('locations');
    const z = coerce('z');
    const geojson = coerce('geojson');
    if (!Lib.isArrayOrTypedArray(locations) ||
        !locations.length ||
        !Lib.isArrayOrTypedArray(z) ||
        !z.length ||
        !((typeof geojson === 'string' && geojson !== '') || Lib.isPlainObject(geojson))) {
        traceOut.visible = false;
        return;
    }
    coerce('featureidkey');
    traceOut._length = Math.min(locations.length, z.length);
    coerce('below');
    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');
    const mlw = coerce('marker.line.width');
    if (mlw)
        coerce('marker.line.color');
    coerce('marker.opacity');
    colorscaleDefaults(traceIn, traceOut, layout, coerce, { prefix: '', cLetter: 'z' });
    Lib.coerceSelectionMarkerOpacity(traceOut, coerce);
}
