import getShowAttrDflt from './show_dflt.js';

export default function handlePrefixSuffixDefaults(containerIn?: any, containerOut?: any, coerce?: any, axType?: any, options?: any): void {
    if(!options) options = {};
    const tickSuffixDflt = options.tickSuffixDflt;

    const showAttrDflt = getShowAttrDflt(containerIn);

    const tickPrefix = coerce('tickprefix');
    if(tickPrefix) coerce('showtickprefix', showAttrDflt);

    const tickSuffix = coerce('ticksuffix', tickSuffixDflt);
    if(tickSuffix) coerce('showticksuffix', showAttrDflt);
}
