import type { FullLayout, FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import { defaults as handleDomainDefaults } from '../../plots/domain.js';

function defaultColumnOrder(traceOut: FullTrace, coerce: (attr: string, dflt?: any) => any) {
    const specifiedColumnOrder = traceOut.columnorder || [];
    const commonLength = traceOut.header.values.length;
    const truncated = specifiedColumnOrder.slice(0, commonLength);
    const sorted = truncated.slice().sort((a: any, b: any) => a - b);
    const oneStepped = truncated.map((d: any) => sorted.indexOf(d));
    for(let i = oneStepped.length; i < commonLength; i++) {
        oneStepped.push(i);
    }
    coerce('columnorder', oneStepped);
}

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace, defaultColor: string, layout: FullLayout): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }

    handleDomainDefaults(traceOut, layout, coerce);

    coerce('columnwidth');

    coerce('header.values');
    coerce('header.format');
    coerce('header.align');

    coerce('header.prefix');
    coerce('header.suffix');
    coerce('header.height');
    coerce('header.line.width');
    coerce('header.line.color');
    coerce('header.fill.color');
    Lib.coerceFont(coerce, 'header.font', layout.font);

    defaultColumnOrder(traceOut, coerce);

    coerce('cells.values');
    coerce('cells.format');
    coerce('cells.align');
    coerce('cells.prefix');
    coerce('cells.suffix');
    coerce('cells.height');
    coerce('cells.line.width');
    coerce('cells.line.color');
    coerce('cells.fill.color');
    Lib.coerceFont(coerce, 'cells.font', layout.font);

    // disable 1D transforms
    traceOut._length = null;
}
