# `Plotly.react()` doesn't handle `visible` toggling correctly

## Problem

When calling `Plotly.react()` with changed `visible` properties on bar traces (toggling between `true` and `'legendonly'`), the DOM doesn't update correctly:

1. **Bars disappear but don't reappear**: Setting `visible: 'legendonly'` removes bars from the stack, but setting `visible: true` on the next `react()` call doesn't recreate them
2. **Stale DOM elements**: Bar `<g class="point">` elements from previous renders persist in the SVG even after their data is removed via the d3 data join
3. **Index mismatch**: `bars.merge(barsEnter).each(fn)` iterates over stale elements where `i` exceeds `cd.length`, causing `cd[i]` to be `undefined`

## Root cause

d3 v7 data join behavior change. In `src/traces/bar/plot.ts:125`:
```ts
const bars = pointGroup.selectAll('g.point').data(identity, keyFunc);
bars.exit().remove();
bars.merge(barsEnter).each(...)
```

`exit().remove()` doesn't fully clean up when trace visibility changes via `Plotly.react()`. The `identity` function may not produce the expected data binding in d3 v7, or the key function doesn't match correctly across visibility transitions.

Also in `src/traces/scatter/plot.ts:489`: `hideFilter` function used as data argument (d3 v3 filter pattern) doesn't work in d3 v7 — needs to be an empty array.

## Consumer impact

Any app that toggles trace visibility via `Plotly.react()` (e.g. solo/highlight on legend hover) gets broken bar charts. Workaround: force full remount via React `key` prop change, which triggers `Plotly.purge()` + fresh `Plotly.react()`. This causes a visible flash/flicker on every toggle.

## Reproduction

nj-crashes "Car Crash Deaths" plot:
1. Hover a type LI (e.g. "Pedestrians") → sets 3 traces to `visible: 'legendonly'`, 1 to `true`
2. Unhover → sets all back to `visible: true`
3. Bars from step 1 don't reappear, or stale bars cause crashes

## Fix areas

1. `src/traces/bar/plot.ts` — investigate why `exit().remove()` doesn't work for visibility transitions
2. `src/traces/scatter/plot.ts:489` — replace `hideFilter` function with empty array `[]`
3. Consider adding a guard: `if (!cd[i]) return` at the top of the `.each()` callback as defense-in-depth
4. Add e2e test: `Plotly.react()` with toggled `visible` on stacked bar traces
