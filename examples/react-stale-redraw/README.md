# `react-stale-redraw` example

Self-contained React + Plotly reproducer scaffold for the legend / axis
stale-redraw bug described in
[`specs/react-trace-shape-uirev-stale-redraw.md`](../../specs/react-trace-shape-uirev-stale-redraw.md).

## What it does

A two-state React app with a button that toggles between **View A** (2
traces, `uirevision: 'rev-A'`, `yaxis.uirevision: 'yrev-A'`,
autoranged y-axis) and **View B** (4 traces, `uirevision: 'rev-B'`,
`yaxis.uirevision: 'yrev-B'`, explicit `yaxis.range: [0, 1.01]` with
`tickformat: '.0%'`).

The component mirrors pltly's `<Plot>` pattern: first mount calls
`Plotly.newPlot`, subsequent renders call `Plotly.react` from a
`useEffect` keyed on `[data, layout]`. Layout includes `barmode:
'stack'`, `hovermode: 'x unified'`, custom `legend` placement, explicit
`xaxis.range` — the ctbk shape.

## Status (2026-05-07)

**Bug does NOT reproduce in this scenario.** `pnpm test` passes:
`_fullData`, legend SVG, `_fullLayout.yaxis.range`, and ytick text
formatting all update correctly after the View A → View B click.

This is useful negative evidence: it rules out the spec's literal
"trace count change + uirevision change + per-axis uirevision +
stacked bars + percent-tickformat flip" as a sufficient trigger inside
React. The actual bug as observed in ctbk requires something more
that's not yet captured here.

Candidates not yet attempted in this example:
- Multiple rapid React re-renders (e.g. URL params changing one-at-a-time
  through a chain of `useUrlState` hooks, instead of a single state flip)
- React Router `useLocation()` causing extra renders
- StrictMode double-effect-invoke
- Async data fetch timing (initial render with empty data, then again with real)
- Theme-provider state changing on the same render
- Specific data values (NaN, nulls, very-long arrays)

If iterating: tweak `src/main.tsx`, run `pnpm test`, and grow the example
toward firing the bug. Once it fires, instrument plotly.js (add
`console.log` in `_doPlot` / `drawData` / `subroutines.doLegend` /
`Axes.drawTicks`) to localize the actual failure point before proposing
a fix.

## Run

```bash
pnpm install                # one-time
pnpm exec playwright install chromium  # one-time
pnpm dev                    # dev server on :5273 for manual exploration
pnpm test                   # headless Playwright assertion run
```

## Files

- `src/main.tsx` — the React app (mirrors pltly's `<Plot>` pattern)
- `index.html` — Vite entry
- `vite.config.ts` — port 5273
- `test.mjs` — boots Vite, drives Playwright, asserts SVG matches state
- `package.json` — own deps; `plotly.js` linked via `file:../..`
