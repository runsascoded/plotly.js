/**
 * Check if a trace has a given category, without going through the Registry.
 *
 * Works with:
 * - Full trace objects (after supplyDefaults): checks trace._module.categories
 * - Trace input objects: checks trace.type against registered modules (falls back to Registry)
 *
 * This replaces Registry.traceIs() for call sites that already have
 * a fully-defaulted trace object, enabling tree-shaking by removing
 * the Registry dependency.
 */
import { modules } from '../registry.js';
import basePlotAttributes from '../plots/attributes.js';
export function traceIs(trace, category) {
    // Fast path: trace already has _module (post-supplyDefaults)
    // Note: _module.categories is an array on the raw module but
    // an object after registration. Check for object type.
    if (trace && trace._module && trace._module.categories &&
        !Array.isArray(trace._module.categories)) {
        return !!trace._module.categories[category];
    }
    // Slow path: look up by type string (pre-supplyDefaults)
    const traceType = typeof trace === 'string' ? trace :
        (trace && trace.type) ? trace.type : basePlotAttributes.type.dflt;
    if (traceType === 'various')
        return false;
    let _module = modules[traceType];
    if (!_module)
        _module = modules[basePlotAttributes.type.dflt];
    if (!_module)
        return false;
    return !!_module.categories[category];
}
