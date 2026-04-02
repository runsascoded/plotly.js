import type { FullTrace, InputTrace } from '../../../types/core';
import Lib from '../../lib/index.js';
import attributes from './attributes.js';
import constants from './constants.js';
import { IMAGE_URL_PREFIX as dataUri } from '../../snapshot/helpers.js';

export default function supplyDefaults(traceIn: InputTrace, traceOut: FullTrace): void {
    function coerce(attr: string, dflt?: any) {
        return Lib.coerce(traceIn, traceOut, attributes, attr, dflt);
    }
    coerce('source');
    // sanitize source to only allow for data URI representing images
    if (traceOut.source && !traceOut.source.match(dataUri)) delete traceOut.source;
    traceOut._hasSource = !!traceOut.source;

    const z = coerce('z');
    traceOut._hasZ = !(z === undefined || !z.length || !z[0] || !z[0].length);
    if (!traceOut._hasZ && !traceOut._hasSource) {
        traceOut.visible = false;
        return;
    }

    coerce('x0');
    coerce('y0');
    coerce('dx');
    coerce('dy');

    let cm;
    if (traceOut._hasZ) {
        coerce('colormodel', 'rgb');
        cm = (constants.colormodel as any)[traceOut.colormodel];
        coerce('zmin', cm.zminDflt || cm.min);
        coerce('zmax', cm.zmaxDflt || cm.max);
    } else if (traceOut._hasSource) {
        traceOut.colormodel = 'rgba256';
        cm = (constants.colormodel as any)[traceOut.colormodel];
        traceOut.zmin = cm.zminDflt;
        traceOut.zmax = cm.zmaxDflt;
    }

    coerce('zsmooth');
    coerce('text');
    coerce('hovertext');
    coerce('hovertemplate');
    coerce('hovertemplatefallback');

    traceOut._length = null;

    coerce('zorder');
}
