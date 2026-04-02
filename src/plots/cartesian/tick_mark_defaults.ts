import { coerce2 } from '../../lib/index.js';
import layoutAttributes from './layout_attributes.js';

export default function handleTickMarkDefaults(containerIn?: any, containerOut?: any, coerce?: any, options?: any): void {
    const isMinor = options.isMinor;
    const cIn = isMinor ? containerIn.minor || {} : containerIn;
    const cOut = isMinor ? containerOut.minor : containerOut;
    const lAttr = isMinor ? layoutAttributes.minor : layoutAttributes;
    const prefix = isMinor ? 'minor.' : '';

    const tickLen = coerce2(cIn, cOut, lAttr, 'ticklen', isMinor ? ((containerOut.ticklen || 5) * 0.6) : undefined);
    const tickWidth = coerce2(cIn, cOut, lAttr, 'tickwidth', isMinor ? (containerOut.tickwidth || 1) : undefined);
    const tickColor = coerce2(cIn, cOut, lAttr, 'tickcolor', (isMinor ? containerOut.tickcolor : undefined) || cOut.color);
    const showTicks = coerce(prefix + 'ticks', (
        (!isMinor && options.outerTicks) || tickLen || tickWidth || tickColor
    ) ? 'outside' : '');

    if(!showTicks) {
        delete cOut.ticklen;
        delete cOut.tickwidth;
        delete cOut.tickcolor;
    }
}
