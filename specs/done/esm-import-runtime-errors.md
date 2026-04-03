# ESM import runtime errors in post-TS dist

## Problem

When consuming plotly.js via ESM imports (`import('plotly.js/basic')` → `lib/index-basic.js` → `src/...`), the following runtime errors occur:

### 1. `callback.apply is not a function`
```
TypeError: callback.apply is not a function
    at Selection.call_default [as call]
    at textLayout2
    at drawRaw → drawOne2 → draw3 → calcAutorange → positionAndAutorange → _doPlot
```

d3 `selection.call(fn)` receives a non-function. Likely a broken re-export from the d3 v7 migration — a module that exports an object/default instead of a callable function.

### 2. `id1.charAt is not a function`
```
TypeError: id1.charAt is not a function
    at idSort
    at Selection.sort_default [as sort]
    at makeSubplotLayer → drawFramework
```

`idSort` expects string arguments but gets something else (possibly a Symbol or number from the TS conversion).

## Context

- These errors do NOT occur with the pre-TS UMD bundles (`dist/plotly-basic.min.js` on dist `3d1fdb4f2`)
- They DO occur when importing via ESM (`plotly.js/basic` → `lib/` → `src/`) on dist `3cd4aab` / `007060b`
- The UMD bundles on the newer dist (`dist/basic.min.js`) were previously fixed for a different error (`d_apply`), but these ESM-specific errors are separate
- Plots partially render but with errors — some annotations/text layout and subplot ordering are broken

## Reproduction

```bash
# In nj-crashes project (www/):
pds gh plotly.js   # gets 007060b dist
# In main.tsx:
#   import('plotly.js/basic')
# Open browser console → errors on every Plotly.react() call
```

## Likely root cause

The ESM source tree passes through Vite's dependency optimizer differently than the UMD bundle. Module-level side effects, default vs named export mismatches, or circular dependency resolution may differ. The d3 selection `.call()` issue suggests a function export is being wrapped in a `{ default: fn }` object that doesn't get unwrapped.

## Suggested debugging

1. Check the `textLayout` function import chain — what does it receive as the callback argument?
2. Check `idSort` — what type is `id1`? Is it a d3 datum that changed type during TS conversion?
3. Compare the pre-bundled (Vite optimized) output with the UMD bundle to find where exports diverge
