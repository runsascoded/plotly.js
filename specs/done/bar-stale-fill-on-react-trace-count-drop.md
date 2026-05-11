# Bar SVG `fill` is stale after `Plotly.react` drops trace count

Status: **done** (2026-05-11). Root cause and fix at the bottom.

## Symptom

Sequence (reproducible at <http://localhost:8858/bt> after `?c=g` →
click "By Vehicle"):

1. Initial plot has 7 traces: 6 bar traces (each with explicit
   `marker.color`) + 1 scatter line.
2. `Plotly.react(div, newData, ...)` called with 4 traces: 3 NEW bar
   traces (different names, different `marker.color`s) + 1 scatter
   line.
3. Bar SVG `<path>` elements at indices 0..2 still display the OLD
   traces' fills.

Visual: the new "Buses/Trucks/Autos" bar trio renders in the OLD
"Bayonne/Outerbridge/Goethals" colors (cyan/orange/purple) instead of
the new red/green/blue.

## Empirical state after the bug fires

| layer | inspected value | status |
|---|---|---|
| `gd.data[0].marker.color` | `#EF553B` | ✓ correct (new) |
| `gd._fullData[0].marker.color` | `#EF553B` | ✓ correct (new) |
| `gd.calcdata[0][0].trace.marker.color` | `#EF553B` | ✓ correct (new) |
| `gd.calcdata[0][0].mc` | `undefined` | (no per-point override) |
| `<path>.style.fill` in `g.trace.bars[0]` | `rgb(25, 211, 243)` | ✗ stale (old Bayonne cyan) |
| `<path>` `style` attr | `"... fill: rgb(25, 211, 243); fill-opacity: 1;"` | ✗ inline style not re-applied |

So all upstream data layers (`data`, `_fullData`, `calcdata.trace`)
are updated to the new traces. Only the rendered DOM is stale.

## Recovery attempts

| call | result |
|---|---|
| `Plotly.restyle(div, {'marker.color': '#EF553B'}, [0])` | data updated, **fill still stale** |
| `Plotly.redraw(div)` | **fill still stale** |
| `Plotly.newPlot(div, sameData, sameLayout)` | ✓ fill correct |

`newPlot` works because it purges the DOM and re-renders from scratch.
That isolates the bug to the **incremental render** path that's
reusing existing bar `<path>` nodes without re-applying inline
`style="fill: ..."`.

## Trace through `Plotly.react`

`Plotly.react` (`src/plot_api/plot_api.ts:2637`):

1. `supplyDefaults(gd, { skipUpdateCalc: true })` → updates
   `gd._fullData` with new traces (correct `marker.color`s).
2. `diffData(...)` returns `{ fullReplot: true, calc: true }` because
   `oldFullData.length !== newFullData.length`
   (`plot_api.ts:2808-2812`).
3. `gd.calcdata = undefined` (because `restyleFlags.calc`).
4. Branch at `plot_api.ts:2757`: since `fullReplot`,
   `gd._fullLayout._skipDefaults = true; seq.push(_doPlot)`.
5. `_doPlot` runs. The `_skipDefaults` flag makes `supplyDefaults`
   bail out early (`plots.ts:268`) — fine, because step 1 already set
   `_fullData`.
6. `_doPlot` rebuilds `calcdata` via `doCalcdata` (since cleared in
   step 3) and proceeds to render.

The bar render path should call `Bar.plot` (in
`src/traces/bar/plot.ts`) which joins `<path>` elements to calcdata
points and applies fill via `Bar.style` (`src/traces/bar/style.ts:15`).

## Hypothesis

The bar `style()` selection is keyed to trace indices, but the
existing DOM `<g.trace.bars>` elements from the previous render carry
the OLD per-point `<path>` nodes with their inline
`style="fill: …(old)…"`. On the incremental re-draw, the D3 join
finds the existing `<path>`s and skips re-applying the fill — likely
because:

- the bar `style()` function relies on d3's enter/update join where
  *update* selections don't re-run the fill setter, **or**
- the `<path>`s are reused across the data-bound update but the
  iterator that should re-style them is keyed to old uids/indices and
  doesn't fire for the swapped trace.

Compare to the prior issue (`bfeba44` — "`Plotly.restyle` multi-index
multi-value form doesn't repaint bar SVGs"), which has the same flavor:
bar fills are uniquely fragile to incremental updates.

## Suggested investigation

1. Add a console log in `src/traces/bar/style.ts:15` and re-run the
   repro. Does `style(gd)` get called after react with new traces? If
   not — track up the call chain in `_doPlot` to find why
   `Bar.style` is skipped.
2. If `style()` *is* called, log the selection inside `s.selectAll('g.points').each(...)` (`bar/style.ts:37`) — does it iterate over the 3 new bar trace `<g>`s? Does `d[0].trace` resolve to the new trace? If yes, then `stylePoints → pointStyle` is being called against the new trace, and the bug is one level deeper (the `sel.style('fill', ...)` inside `singlePointStyle` not re-applying).
3. Consider whether the D3 v7 enter/update split is causing only "enter" selections to receive fill while existing "update" elements are passed over. If so, the fix is to apply fill to the merged selection (enter + update) rather than enter-only.

## Minimal repro outside the path repo

```js
const div = document.createElement('div')
document.body.appendChild(div)
await Plotly.newPlot(div, [
  { type: 'bar', name: 'A', x: ['x'], y: [1], marker: { color: '#19d3f3' } },
  { type: 'bar', name: 'B', x: ['x'], y: [2], marker: { color: '#FFA15A' } },
  { type: 'bar', name: 'C', x: ['x'], y: [3], marker: { color: '#ab63fa' } },
  { type: 'scatter', name: 'L', x: ['x'], y: [4], mode: 'lines' },
])
// Drop count from 4 → 4 with different bar marker.color values:
await Plotly.react(div, [
  { type: 'bar', name: 'X', x: ['x'], y: [1], marker: { color: '#EF553B' } },
  { type: 'bar', name: 'Y', x: ['x'], y: [2], marker: { color: '#00cc96' } },
  { type: 'scatter', name: 'L', x: ['x'], y: [4], mode: 'lines' },
])
// Expect: bar X = red, bar Y = green
// Actual: bar X = cyan, bar Y = orange (stale)
```

(7 → 4 also triggers this — the trigger is "count change + bars at
kept indices get new `marker.color`". Pure 7 → 7 with shuffled marker
colors at same indices may or may not repro — worth testing as part of
the fix.)

## Workaround in `pltly`

While this is being fixed, `pltly` calls `Plotly.newPlot` instead of
`Plotly.react` when trace identity changes (count change OR no name
overlap between old and new at any kept index). See
`pltly/specs/newplot-on-trace-identity-change.md`. After this fix
ships, that workaround can be removed.

## Root cause (verified via instrumentation)

The spec's "Suggested investigation (3)" guessed at d3 v7 enter/update
split. That was directionally right but on the wrong selection. The
actual cause:

`ensureSingle` (`src/lib/index.ts:733`) is deliberately built on
`querySelector` + `d3.select` so it does NOT propagate data:

```ts
const existing = node && node.querySelector(':scope > ' + selector);
if (existing) return select(existing);
```

When `bar/plot.ts` calls `ensureSingle(plotGroup, 'g', 'points')` on a
second render, it gets back the *existing* `<g.points>` node — and that
node's `__data__` is still whatever it had during the first render
(inherited via `append`'s data propagation back then).

Then `Bar.style` reads from that node:

```ts
s.selectAll('g.points').each(function(this, d) {
    const trace = d[0].trace;  // d is THIS element's __data__
    stylePoints(sel, trace, gd);
});
```

In d3 v3, `selectAll(selector)` propagated parent `__data__` to the
matched descendants — so `d` here would have been the trace's NEW
calcdata (because the parent `<g.trace.bars>` was correctly rebound by
`makeTraceGroups`). In d3 v5+ that propagation was removed: matched
elements keep their OWN `__data__`. Plotly's d3 v7 migration spec did
not catch this site.

Empirical confirmation from instrumented logs:

```
makeTraceGroups POST-join: merged size=2  bound data=[
  {name:'B1', uid:'a8c57d', color:'#EF553B'},     // <g.trace.bars> has NEW data ✓
  {name:'B2', uid:'e85b47', color:'#00cc96'}
]
Bar.style each g.points: trace.name='A1' color='#19d3f3'   // <g.points> has OLD data ✗
Bar.style each g.points: trace.name='A2' color='#FFA15A'
```

## Fix

Explicitly rebind `cd` after each `ensureSingle` call that creates
`g.points`:

```ts
const pointGroup = ensureSingle(plotGroup, 'g', 'points');
pointGroup.datum(cd);  // refresh __data__ so style readers see new trace
```

Applied to all three sites that have this pattern:
- `src/traces/bar/plot.ts:122`
- `src/traces/scatter/plot.ts:137` (also `text.datum(cdscatter)`)
- `src/traces/barpolar/plot.ts:19`

The fix at *write* time (after `ensureSingle`) is preferred over
fixing each *read* site (every `style` routine) — the underlying
invariant is "g.points's bound datum matches its parent trace's
calcdata", and read sites can keep assuming it.

## Regression guard

`examples/bar-stale-fill/` — self-contained React + Vite + Playwright
sub-project (own `package.json`). Mounts View A (3 bars
cyan/orange/purple) via `newPlot`, then on button click `react`s to
View B (2 bars red/green). Asserts the rendered `<path>.style.fill` on
each bar trace matches the new `marker.color`. Linked at
`link:../..` so it tracks the local fork live.

Verified: exits 1 ("Bug REPRODUCED") without the fix, exits 0 with it.

## Related

- `specs/done/d3v7-exit-after-merge-reassign.md` — sibling d3 v7
  migration miss. Same flavor (d3 selection state confusion) but a
  different mechanism (`merge()` dropping `_exit`, not `selectAll`
  dropping data propagation).
- `bfeba44` ("`Plotly.restyle` multi-index multi-value form doesn't
  repaint bar SVGs") — earlier bar-fill staleness in `restyle`. Same
  fragility class, separately fixed.
