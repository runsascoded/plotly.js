# Split monolithic core files into tree-shakeable exports

## Problem

Tree-shaking operates at the **export** level. If a file has one default export (an object with 50 methods), the bundler includes all 50 methods even if only 5 are used. Plotly's largest files use the aggregation pattern:

```js
var axes = {};
axes.doTicks = function() { ... };
axes.draw = function() { ... };
axes.getAutoRange = function() { ... };
// ... 47 more methods
export default axes;
```

The bundler sees one export (`axes`) that's used, so everything stays.

## Files to split

| File | Size | Methods | Used by lite |
|---|---|---|---|
| `axes.js` | 160 KB | ~50 | ~15 |
| `plot_api.js` | 143 KB | ~20 | ~10 |
| `plots.js` | 115 KB | ~30 | ~15 |
| `fx/hover.js` | 88 KB | ~10 | ~5 |
| `drawing/index.js` | 61 KB | ~40 | ~20 |
| `dragbox.js` | 50 KB | ~5 | ~3 |

Total: 617 KB. If tree-shaking could drop ~40% of unused methods, that's ~250 KB savings.

## Approach

Convert the aggregation pattern to named exports:

```js
// Before:
var axes = {};
axes.doTicks = function() { ... };
export default axes;

// After:
export function doTicks() { ... }
export default { doTicks };  // backward compat
```

Files that do `import axes from './axes.js'; axes.doTicks()` keep working (default export still has everything). But files that only need `doTicks` can do `import { doTicks } from './axes.js'` and the bundler drops the rest.

## Relationship to registration system

The registration system uses `Registry.getComponentMethod('legend', 'draw')` — a runtime string lookup that the bundler can't analyze. Replacing these with direct imports (`import { draw } from '../components/legend/draw.js'`) is needed for tree-shaking to work. This is the same effort as removing the registration system.

## Order of operations

1. d3 v7 migration (self-contained, 70-150 KB)
2. Split core files into named exports (mechanical, enables tree-shaking)
3. Remove registration system (replace runtime lookups with static imports)
4. Remove sub-path entry points (consumers just import what they need)
