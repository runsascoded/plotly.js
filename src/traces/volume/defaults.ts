import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import _defaults from '../isosurface/defaults.js';
const { supplyIsoDefaults } = _defaults;
import _defaults2 from '../surface/defaults.js';
const { opacityscaleDefaults } = _defaults2;
import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout) {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    supplyIsoDefaults(traceIn, traceOut, defaultColor, layout, coerce);

    opacityscaleDefaults(traceIn, traceOut, layout, coerce);
}
