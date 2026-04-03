import { isArrayOrTypedArray } from './array.js';
import isPlainObject from './is_plain_object.js';
export default function relinkPrivateKeys(toContainer, fromContainer) {
    for (const k in fromContainer) {
        const fromVal = fromContainer[k];
        const toVal = toContainer[k];
        if (toVal === fromVal)
            continue;
        if (k.charAt(0) === '_' || typeof fromVal === 'function') {
            // if it already exists at this point, it's something
            // that we recreate each time around, so ignore it
            if (k in toContainer)
                continue;
            toContainer[k] = fromVal;
        }
        else if (isArrayOrTypedArray(fromVal) && isArrayOrTypedArray(toVal) && isPlainObject(fromVal[0])) {
            // filter out data_array items that can contain user objects
            // most of the time the toVal === fromVal check will catch these early
            // but if the user makes new ones we also don't want to recurse in.
            if (k === 'customdata' || k === 'ids')
                continue;
            // recurse into arrays containers
            const minLen = Math.min(fromVal.length, toVal.length);
            for (let j = 0; j < minLen; j++) {
                if ((toVal[j] !== fromVal[j]) && isPlainObject(fromVal[j]) && isPlainObject(toVal[j])) {
                    relinkPrivateKeys(toVal[j], fromVal[j]);
                }
            }
        }
        else if (isPlainObject(fromVal) && isPlainObject(toVal)) {
            // recurse into objects, but only if they still exist
            relinkPrivateKeys(toVal, fromVal);
            if (!Object.keys(toVal).length)
                delete toContainer[k];
        }
    }
}
