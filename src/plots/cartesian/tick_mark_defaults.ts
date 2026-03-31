import { coerce2 } from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function handleTickMarkDefaults(containerIn?: any, containerOut?: any, coerce?: any, options?: any): any {
    var isMinor = options.isMinor;
    var cIn = isMinor ? containerIn.minor || {} : containerIn;
    var cOut = isMinor ? containerOut.minor : containerOut;
    var lAttr = isMinor ? layoutAttributes.minor : layoutAttributes;
    var prefix = isMinor ? 'minor.' : '';

    var tickLen = coerce2(cIn, cOut, lAttr, 'ticklen', isMinor ? ((containerOut.ticklen || 5) * 0.6) : undefined);
    var tickWidth = coerce2(cIn, cOut, lAttr, 'tickwidth', isMinor ? (containerOut.tickwidth || 1) : undefined);
    var tickColor = coerce2(cIn, cOut, lAttr, 'tickcolor', (isMinor ? containerOut.tickcolor : undefined) || cOut.color);
    var showTicks = coerce(prefix + 'ticks', (
        (!isMinor && options.outerTicks) || tickLen || tickWidth || tickColor
    ) ? 'outside' : '');

    if(!showTicks) {
        delete cOut.ticklen;
        delete cOut.tickwidth;
        delete cOut.tickcolor;
    }
}
