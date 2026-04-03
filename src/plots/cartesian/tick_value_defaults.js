import cleanTicks from './clean_ticks.js';
import { isArrayOrTypedArray } from '../../lib/index.js';
import { isTypedArraySpec } from '../../lib/array.js';
import { decodeTypedArraySpec } from '../../lib/array.js';
export default function handleTickValueDefaults(containerIn, containerOut, coerce, axType, opts) {
    if (!opts)
        opts = {};
    const isMinor = opts.isMinor;
    const cIn = isMinor ? containerIn.minor || {} : containerIn;
    const cOut = isMinor ? containerOut.minor : containerOut;
    const prefix = isMinor ? 'minor.' : '';
    function readInput(attr) {
        let v = cIn[attr];
        if (isTypedArraySpec(v))
            v = decodeTypedArraySpec(v);
        return (v !== undefined) ? v : (cOut._template || {})[attr];
    }
    const _tick0 = readInput('tick0');
    const _dtick = readInput('dtick');
    const _tickvals = readInput('tickvals');
    const tickmodeDefault = isArrayOrTypedArray(_tickvals) ? 'array' :
        _dtick ? 'linear' :
            'auto';
    const tickmode = coerce(prefix + 'tickmode', tickmodeDefault);
    if (tickmode === 'auto' || tickmode === 'sync') {
        coerce(prefix + 'nticks');
    }
    else if (tickmode === 'linear') {
        // dtick is usually a positive number, but there are some
        // special strings available for log or date axes
        // tick0 also has special logic
        const dtick = cOut.dtick = cleanTicks.dtick(_dtick, axType);
        cOut.tick0 = cleanTicks.tick0(_tick0, axType, containerOut.calendar, dtick);
    }
    else if (axType !== 'multicategory') {
        const tickvals = coerce(prefix + 'tickvals');
        if (tickvals === undefined)
            cOut.tickmode = 'auto';
        else if (!isMinor)
            coerce('ticktext');
    }
}
