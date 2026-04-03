import Lib, { extendFlat } from '../../lib/index.js';
import attributes from './attributes.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';
export default function supplyDefaults(traceIn, traceOut, defaultColor, layout) {
    function coerce(attr, dflt) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    const opts = extendFlat({}, layout.hoverlabel);
    if (traceOut.hovertemplate)
        opts.namelength = -1;
    handleHoverLabelDefaults(traceIn, traceOut, coerce, opts);
}
