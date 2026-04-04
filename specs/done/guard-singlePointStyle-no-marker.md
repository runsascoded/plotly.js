# d3 v7 migration bug: `selection.data(filterFn)` doesn't filter anymore

## Problem

`singlePointStyle` in `src/components/drawing/index.ts:797` crashes on scatter traces with `mode: 'lines'` (no `marker`):

```
TypeError: Cannot read properties of undefined (reading 'line')
    at singlePointStyle (drawing/index.ts:799)
```

## Root cause: d3 v3 → v7 API change

In `src/traces/scatter/plot.ts:489`:

```ts
let markerFilter = hideFilter;  // function() { return false; }
...
join = selection.data(markerFilter, keyFunc);  // line 515
```

**d3 v3**: `selection.data(fn)` called `fn` per element as a filter — `hideFilter` returning `false` meant "no data, remove elements."

**d3 v7**: `selection.data(value, key)` expects `value` to be an **array or iterable**, NOT a filter function. Passing a function as the first arg doesn't filter — it may be treated as a single data value or ignored, leaving existing DOM nodes in place.

So marker DOM nodes from previous renders survive the data join, `join.each()` iterates over them, and `singlePointStyle` is called on a trace that has no `marker` property.

## Fix

Replace `hideFilter` function with an empty array:

```ts
// Before (d3 v3 pattern — broken in v7)
function hideFilter() { return false; }
let markerFilter = hideFilter;

// After (works in both)
const EMPTY: any[] = [];
let markerFilter: any = EMPTY;
```

Same for `textFilter` on the next line.

The guard in `singlePointStyle` (`if (!marker) return`) is also reasonable as defense-in-depth, but the real fix is the data join.

## Scope

Search for other `selection.data(someFunctionThatFilters)` patterns — the d3 v3 "data as filter function" idiom may be used elsewhere.

## Reproduction

nj-crashes "Car Crash Deaths" → "By Month" mode. The 12-month average lines use `mode: 'lines'` with no marker. Crashes on render.
