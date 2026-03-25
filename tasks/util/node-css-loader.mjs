// Node.js custom loader that treats .css imports as empty modules.
// Usage: node --loader ./tasks/util/node-css-loader.mjs script.mjs

export async function resolve(specifier, context, next) {
    if (specifier.endsWith('.css')) {
        return { url: new URL(specifier, context.parentURL || import.meta.url).href, shortCircuit: true };
    }
    return next(specifier, context);
}

export async function load(url, context, next) {
    if (url.endsWith('.css')) {
        return { format: 'module', source: 'export default "";\n', shortCircuit: true };
    }
    return next(url, context);
}
