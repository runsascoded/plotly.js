import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { supplyIsoDefaults } from '../isosurface/defaults.js';
import { opacityscaleDefaults } from '../surface/defaults.js';

export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    supplyIsoDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    opacityscaleDefaults(traceIn, traceOut, layout, coerce);
}
