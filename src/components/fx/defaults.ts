import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib, { extendFlat } from '../../lib/index.js';
import attributes from './attributes.js';
import handleHoverLabelDefaults from './hoverlabel_defaults.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): void {
    function coerce(attr: string, dflt?: any): any {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    const opts: any = extendFlat({}, layout.hoverlabel);
    if(traceOut.hovertemplate) opts.namelength = -1;

    handleHoverLabelDefaults(traceIn, traceOut, coerce, opts);
}
