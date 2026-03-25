import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import _defaults from '../isosurface/defaults.js';
const { supplyIsoDefaults } = _defaults;
import _defaults2 from '../surface/defaults.js';
const { opacityscaleDefaults } = _defaults2;

export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    supplyIsoDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    opacityscaleDefaults(traceIn, traceOut, layout, coerce);
}
