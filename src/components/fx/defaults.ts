import Lib, { extendFlat } from '../../lib/index.js';
import attributes from './attributes.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';

export default function supplyDefaults(traceIn: any, traceOut: any, defaultColor: any, layout: any): void {
    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    var opts: any = extendFlat({}, layout.hoverlabel);
    if(traceOut.hovertemplate) opts.namelength = -1;

    handleHoverLabelDefaults(traceIn, traceOut, coerce, opts);
}
