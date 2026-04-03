import isPlainObject from './is_plain_object.js';
const isArray = Array.isArray;
function primitivesLoopSplice(source, target) {
    let i, value;
    for (i = 0; i < source.length; i++) {
        value = source[i];
        if (value !== null && typeof (value) === 'object') {
            return false;
        }
        if (value !== void (0)) {
            target[i] = value;
        }
    }
    return true;
}
export function extendFlat(...args) {
    return _extend(args, false, false, false);
}
export function extendDeep(...args) {
    return _extend(args, true, false, false);
}
export function extendDeepAll(...args) {
    return _extend(args, true, true, false);
}
export function extendDeepNoArrays(...args) {
    return _extend(args, true, false, true);
}
/*
 * Inspired by https://github.com/justmoon/node-extend/blob/master/index.js
 * All credit to the jQuery authors for perfecting this amazing utility.
 *
 * API difference with jQuery version:
 * - No optional boolean (true -> deep extend) first argument,
 *   use `extendFlat` for first-level only extend and
 *   use `extendDeep` for a deep extend.
 *
 * Other differences with jQuery version:
 * - Uses a modern (and faster) isPlainObject routine.
 * - Expected to work with object {} and array [] arguments only.
 * - Does not check for circular structure.
 *   FYI: jQuery only does a check across one level.
 *   Warning: this might result in infinite loops.
 *
 */
function _extend(inputs, isDeep, keepAllKeys, noArrayCopies) {
    const target = inputs[0];
    const length = inputs.length;
    let input, key, src, copy, copyIsArray, clone, allPrimitives;
    if (length === 2 && isArray(target) && isArray(inputs[1]) && target.length === 0) {
        allPrimitives = primitivesLoopSplice(inputs[1], target);
        if (allPrimitives) {
            return target;
        }
        else {
            target.splice(0, target.length);
        }
    }
    for (let i = 1; i < length; i++) {
        input = inputs[i];
        for (key in input) {
            src = target[key];
            copy = input[key];
            if (noArrayCopies && isArray(copy)) {
                target[key] = copy;
            }
            else if (isDeep && copy && (isPlainObject(copy) || (copyIsArray = isArray(copy)))) {
                if (copyIsArray) {
                    copyIsArray = false;
                    clone = src && isArray(src) ? src : [];
                }
                else {
                    clone = src && isPlainObject(src) ? src : {};
                }
                target[key] = _extend([clone, copy], isDeep, keepAllKeys, noArrayCopies);
            }
            else if (typeof copy !== 'undefined' || keepAllKeys) {
                target[key] = copy;
            }
        }
    }
    return target;
}
export default { extendFlat, extendDeep, extendDeepAll, extendDeepNoArrays };
