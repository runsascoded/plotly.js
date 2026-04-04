# d3 v7 data join bugs: stale DOM elements cause crashes

## Problem

Two runtime crashes caused by d3 v7 behavior changes in data joins:

### 1. `singlePointStyle`: `Cannot read properties of undefined (reading 'line')`

**Location**: `src/components/drawing/index.ts:799`
**Trigger**: Scatter traces with `mode: 'lines'` (no marker)

In `src/traces/scatter/plot.ts:489`:
```ts
function hideFilter() { return false; }
let markerFilter = hideFilter;
...
join = selection.data(markerFilter, keyFunc);  // line 515
```

**d3 v3**: `selection.data(fn)` called `fn` per element as a filter.
**d3 v7**: `selection.data(value, key)` expects `value` to be an array/iterable. A function as first arg is NOT a filter — DOM nodes survive and `singlePointStyle` is called on marker-less traces.

**Fix**: Replace `hideFilter` with an empty array:
```ts
const EMPTY: any[] = [];
let markerFilter: any = EMPTY;
```
Same for `textFilter` on the next line.

### 2. `appendBarText`: `Cannot read properties of undefined (reading 'hasB')`

**Location**: `src/traces/bar/plot.ts:561`
**Trigger**: Switching between datasets of different lengths (e.g. NJSP 17 years → DOT 23 years) via `Plotly.react()`

In `src/traces/bar/plot.ts:131`:
```ts
bars.merge(barsEnter).each(function(di, i) {
    ...
    appendBarText(gd, plotinfo, bar, cd, i, ...);  // line 510
});
```

`appendBarText` uses `cd[i]` (line 559) where `i` is the d3 selection index. When `Plotly.react()` updates with different-length data, stale bar DOM elements may survive the data join, making `i` exceed `cd.length` → `cd[i]` is `undefined`.

**Fix**: Guard `cd[i]`:
```ts
const calcBar = cd[i];
if (!calcBar) return;  // stale element from previous data
```

Or investigate why `bars.exit().remove()` (line 129) isn't cleaning up the stale elements — this may also be a d3 v7 behavior change in how `exit()` works with the `identity` data function.

## Reproduction

nj-crashes project:
1. `singlePointStyle`: "Car Crash Deaths" → "By Month" (adds 12-mo avg scatter lines with `mode: 'lines'`)
2. `appendBarText`: "Car Crash Deaths vs. Homicides" → click "DOT ('01-'23)" then back to "NJSP ('08-'24)"

## Scope

Search for other `selection.data(someFunction)` patterns where the function was used as a d3 v3 filter. The `hideFilter` pattern may appear in other trace types.

```bash
grep -rn 'hideFilter\|function.*Filter.*return.*false' src/traces/
```
