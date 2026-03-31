import getShowAttrDflt from './show_dflt.js';

export default function handlePrefixSuffixDefaults(containerIn?: any, containerOut?: any, coerce?: any, axType?: any, options?: any): any {
    if(!options) options = {};
    var tickSuffixDflt = options.tickSuffixDflt;

    var showAttrDflt = getShowAttrDflt(containerIn);

    var tickPrefix = coerce('tickprefix');
    if(tickPrefix) coerce('showtickprefix', showAttrDflt);

    var tickSuffix = coerce('ticksuffix', tickSuffixDflt);
    if(tickSuffix) coerce('showticksuffix', showAttrDflt);
}
