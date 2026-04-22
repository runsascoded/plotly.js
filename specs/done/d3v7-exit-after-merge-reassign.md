# d3 v7 regression: `.exit()` after `var = var.merge(...)` is empty

## Summary

Under d3 v7, calling `.exit()` on a selection that has been reassigned from a
`.merge()` returns an empty selection, causing stale DOM nodes to leak when
traces are removed. Five call sites follow this pattern: the top-level
scatter data join (discovered first via the reproduction below) and four
additional sites surfaced by grep.

## Root cause

The d3 v3 → v7 migration replaced the implicit enter/update merge with an
explicit `.merge()` call (commit `49f25cf4e`). The idiomatic pattern became:

```ts
let join = parent.selectAll('...').data(items, keyFn)
const joinEnter = join.enter().append('...')
join = join.merge(joinEnter)      // ⚠️  reassignment
join.each(...)
// ... later ...
join.exit().remove()              // ⚠️  empty in d3 v7
```

In d3 v3, `.merge()` preserved the `_exit` property placed on the selection
by `.data()`, so `join.exit()` still returned the departing datums after the
reassignment.

In d3 v7, `selection.merge(other)` returns a **new** selection containing
the union of both; the `_exit` state attached by `.data()` to the original
selection is **not carried over**. `join.exit()` after the reassignment
returns an empty selection, so `.remove()` is a no-op and stale nodes
persist across renders.

`createFills()` in `src/traces/scatter/plot.ts:94-98` shows the correct d3 v7
pattern: call `.exit()` **before** the merge reassignment.

```ts
// Correct: exit BEFORE merge
const fillJoin = fills.selectAll('g').data(fillData, identity)
const fillJoinEnter = fillJoin.enter().append('g')
fillJoin.exit().each(...).remove()                          // ← exit first
fillJoin.merge(fillJoinEnter).order().each(...)             // ← then merge
```

## Reproduction (already confirmed on scatter trace join)

Awair dashboard (https://github.com/runsascoded/awair) with `<Plot>` that
renders several scatter traces plus a user control that toggles one trace on
and off:

1. Start with 14 traces in `gd.data`.
2. Toggle a device on → 20 traces in `gd.data`, 20 `g.trace` nodes in SVG.
3. Toggle it back off → 14 traces in `gd.data` but 20 `g.trace` nodes in
   SVG — the 6 removed traces are still visible on the plot.

Repeating the toggle keeps accumulating stale nodes. Fixed in
`src/traces/scatter/plot.ts` by capturing `joinExit = join.exit()` before
the `join = join.merge(joinEnter)` reassignment.

## Remaining affected sites

A `grep` for `VAR = VAR.merge(…)` followed by `VAR.exit()` before any
reassignment turns up four more in the current `src/*.ts`:

### 1. `src/traces/scatter/plot.ts:521–568` — scatter markers

```ts
// L521
join = selection.data(markerFilter, keyFunc)
// L532–534
const enter = join.enter().append('path')
    .classed('point', true)
join = join.merge(enter)
// ...
// L562–568
if (transition) {
    join.exit().transition()
        .style('opacity', 0)
        .remove()
} else {
    join.exit().remove()
}
```

Impact: on a trace where `marker.mode` transitions from shown → hidden
(or where `markerFilter` produces a smaller array), stale `path.point`
DOM nodes are left inside the trace group.

### 2. `src/traces/scatter/plot.ts:573–612` — scatter text labels

```ts
// L573
join = selection.data(textFilter, keyFunc)
// L577–579
const textEnter = join.enter().append('g').classed('textpoint', true)
textEnter.append('text')
join = join.merge(textEnter)
// ...
// L612
join.exit().remove()
```

Impact: stale `g.textpoint` labels persist when text is toggled off.

### 3. `src/traces/sunburst/plot.ts:36–82` — sunburst trace join

```ts
// L36
let join = layer.selectAll('g.trace.sunburst').data(cdmodule, (cd) => cd[0].trace.uid)
// L40–42
const joinEnter = join.enter().append('g').classed('trace', true).classed('sunburst', true)
join = join.merge(joinEnter)
// ...
// L82
join.exit().remove()
```

Impact: stale sunburst traces leak on trace removal.

### 4. `src/traces/treemap/draw.ts:25–67` — treemap trace join

```ts
// L25–26
let join = layer.selectAll('g.trace.' + type)
    .data(cdmodule, (cd) => cd[0].trace.uid)
// L29–31
const joinEnter = join.enter().append('g').classed('trace', true).classed(type, true)
join = join.merge(joinEnter)
// ...
// L67
join.exit().remove()
```

Impact: stale treemap/icicle traces leak on trace removal.

## Fix pattern

For each site, capture the exit selection before the merge reassignment:

```diff
 join = selection.data(items, keyFn)
+const joinExit = join.exit()
 const joinEnter = join.enter().append(...)
 join = join.merge(joinEnter)
 // ... render ...
-join.exit().remove()
+joinExit.remove()
```

For scatter markers where the exit branches on `transition`:

```diff
-if (transition) {
-    join.exit().transition()
-        .style('opacity', 0)
-        .remove()
-} else {
-    join.exit().remove()
-}
+if (transition) {
+    joinExit.transition()
+        .style('opacity', 0)
+        .remove()
+} else {
+    joinExit.remove()
+}
```

Alternatively, reorder to call `.exit()` before the merge (matches the
`createFills` style):

```diff
 join = selection.data(items, keyFn)
+join.exit().remove()
 const joinEnter = join.enter().append(...)
 join = join.merge(joinEnter)
```

Either works; the "capture" form is mechanically identical to the current
structure (minimal diff) while "reorder" reads more naturally.

## Scope / out of scope

- This spec covers the four `VAR = VAR.merge(...)` + later `VAR.exit()`
  sites surfaced by the grep. Forms like `const NEW = OLD.merge(…).selectAll(...)`
  followed by `NEW.exit()` (seen in `sankey/render.ts:920/959` and
  `box/plot.ts:198/274`) are **not** the same bug: the `.selectAll()` starts
  a new selection chain with its own `.data()` call, so the `_exit` state on
  that chain is intact.
- Inline `VAR.enter().append(...).merge(VAR)` without a reassignment is fine
  — `VAR` retains the `_exit` from `.data()`.
- The `createFills` / `markerFilter`-with-`HIDE` sites that already call
  `.exit()` *before* the merge are correct and do not need changes.

## Tests

Add regression coverage for trace-removal DOM cleanup:

```js
// Pseudo-test for scatter (mirror for sunburst/treemap)
it('removes stale g.trace nodes when a trace is removed', async () => {
    await Plotly.newPlot(gd, [
        { type: 'scatter', x: [...], y: [...] },
        { type: 'scatter', x: [...], y: [...] },
        { type: 'scatter', x: [...], y: [...] },
    ])
    expect(gd.querySelectorAll('.scatterlayer .trace').length).toBe(3)
    await Plotly.react(gd, gd.data.slice(0, 2), gd.layout)  // remove one
    expect(gd.querySelectorAll('.scatterlayer .trace').length).toBe(2)
})
```

Add one test per affected site:
- `scatter/plot` trace-level
- scatter markers (toggle `mode: 'markers'` → `mode: 'lines'`)
- scatter text (toggle text on/off)
- sunburst trace-level
- treemap trace-level

Running in a d3 v3 baseline (if any comparison branch exists) should pass
without the fix; d3 v7 fails without the fix, passes with it.

## Caller-side note (unrelated mitigation)

Callers that omit `uid` on their trace input hit a secondary issue in
`src/plots/plots.ts:560` — when the new data has fewer traces than the old,
Plotly falls back to index-based random-uid reuse, causing trace identity
to shift on removal. Downstream apps should pass stable `uid`s per trace
regardless of this bug (we added them in awair while debugging); fixing
this d3 v7 issue doesn't make caller-side `uid`s unnecessary, just
ensures stale nodes get removed when the identity *is* stable.
