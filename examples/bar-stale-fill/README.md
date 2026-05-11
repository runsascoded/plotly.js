# `bar-stale-fill` example

Self-contained React + Plotly reproducer for the bar SVG fill staleness
bug described in
[`specs/done/bar-stale-fill-on-react-trace-count-drop.md`](../../specs/done/bar-stale-fill-on-react-trace-count-drop.md).

## What it does

A two-state React app that mounts via `Plotly.newPlot` with **View A**
(3 bar traces with distinct `marker.color`s — cyan / orange / purple —
plus 1 scatter), then on button click invokes `Plotly.react` with
**View B** (2 bar traces with different `marker.color`s — red / green —
plus 1 scatter).

The Playwright test asserts the rendered `<path>.style.fill` on each
bar `<g.trace.bars>` matches the **new** `marker.color`. Before the
fix, those fills stay at View A's cyan/orange even though
`gd._fullData[i].marker.color` and `gd.calcdata[i][0].trace.marker.color`
both correctly reflect View B.

## Root cause (fixed)

`ensureSingle` in `src/lib/index.ts` returns existing nodes via
`querySelector` + `d3.select`, deliberately not propagating data. When
`Bar.plot` / `Scatter.plot` / `BarPolar.plot` re-run on `Plotly.react`,
the existing `<g.points>` child gets reused but keeps its previous
render's `__data__`. Downstream `style` routines that iterate via
`s.selectAll('g.points').each(d => ...)` then read that stale `d` (d3
v5+ stopped propagating parent `__data__` through `selectAll`).

Fix: explicitly `pointGroup.datum(cd)` after `ensureSingle` in each
caller (`bar/plot.ts`, `scatter/plot.ts`, `barpolar/plot.ts`).

## Run

```bash
pnpm install                # one-time
pnpm exec playwright install chromium  # one-time
pnpm dev                    # dev server on :5274 for manual exploration
pnpm test                   # headless Playwright assertion run
```

## Files

- `src/main.tsx` — the React app
- `index.html` — Vite entry
- `vite.config.ts` — port 5274
- `test.mjs` — boots Vite, drives Playwright, asserts SVG fill matches state
- `package.json` — own deps; `plotly.js` linked via `link:../..`
