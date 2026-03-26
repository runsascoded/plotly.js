# ESM conversion: missing ternary axis initialization

## Problem

`src/plots/ternary/layout_attributes.js` — the ESM converter turned:

```js
var attrs = module.exports = overrideAll({
    domain: domainAttrs({name: 'ternary'}),
    bgcolor: { ... },
    sum: { ... },
    aaxis: ternaryAxesAttrs,
    baxis: ternaryAxesAttrs,
    caxis: ternaryAxesAttrs
}, 'plot', 'from-root');
```

into:

```js
var attrs = {};
```

Dropping the entire `overrideAll(...)` call. Then `attrs.aaxis.uirevision = ...` fails because `attrs.aaxis` is undefined.

## Fix

```js
var attrs = overrideAll({
    domain: domainAttrs({name: 'ternary'}),
    bgcolor: {
        valType: 'color',
        dflt: colorAttrs.background,
        description: 'Set the background color of the subplot'
    },
    sum: {
        valType: 'number',
        dflt: 1,
        min: 0,
        description: [
            'The number each triplet should sum to,',
            'and the maximum range of each axis'
        ].join(' ')
    },
    aaxis: ternaryAxesAttrs,
    baxis: ternaryAxesAttrs,
    caxis: ternaryAxesAttrs
}, 'plot', 'from-root');
```

Then keep the existing uirevision assignments and `export default attrs;`.

## Root cause

The converter didn't handle the `var X = module.exports = expr(...)` pattern — it recognized `module.exports` and replaced the whole statement with `var X = {}` instead of `var X = expr(...)`.

**Audit all files for this pattern** — search for `module.exports = ` where the RHS is a function call, not a simple object literal. These are likely all broken.
