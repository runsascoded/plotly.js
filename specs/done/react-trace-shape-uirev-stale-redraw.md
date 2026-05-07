# Spec: `Plotly.react` legend / axis stale-redraw on trace-shape change

Status: **done** (2026-05-07).

> Note on naming: this spec is about `Plotly.react()`, the function — the
> reactive-update entry point in plotly.js. It is *not* about the React
> framework. The bug is reproducible from any host (vanilla JS, Vue,
> Svelte, React, …); the section below uses pure-plotly calls.

## Problem

When `Plotly.react(div, data, layout)` is called and the new `data`
contains different traces than the previous render — and at least one
of the *previous* render's trace `uid`s contained a CSS-special
character (`:`, `,`, `[`, `.`, etc.) — the rendered SVG legend and axis
ticks remain stale from the previous render. The plot becomes
inconsistent with itself: bars positioned per the new data, but
legend/ticks per the old data.

`Plotly.newPlot` in place of `Plotly.react` renders correctly. The bug
is in the incremental-update path's cleanup step.

## Root cause

`cleanPlot` in `src/plots/plots.ts` removes leftover colorbars from
previous traces by class selector:

```ts
oldFullLayout._infolayer.select('.cb' + oldUid).remove();
```

The `uid` field on a trace is a user-supplied string with no
restrictions on contents. When concatenated raw into a CSS selector,
any uid containing a CSS-special character produces an invalid
selector. `querySelector` throws `SyntaxError`, `cleanPlot` aborts
mid-iteration, the calling `supplyDefaults` aborts, and the rest of
the `Plotly.react` pipeline (including `_doPlot`'s drawing routines —
legend draw, axis tick draw, etc.) silently never runs. The
internal-state mutations that happened *before* the throw stick (so
`gd._fullData` and `gd._fullLayout.yaxis.range` look correct), but the
SVG never gets the matching redraw.

Triggering uids in the wild include ctbk's `\`bar:${stackVal}\`` (which
becomes `bar:` when `stackVal === ''`) and `rollavg-outline:${stackVal}`.

## Fix

Wrap the uid in `CSS.escape()` before concatenation. The class itself
(set in `src/components/colorbar/draw.ts:134` as `'cb' + trace.uid +
...`) stores the raw value; only the *selector* needs escaping.

```ts
oldFullLayout._infolayer.select('.cb' + CSS.escape(oldUid)).remove();
```

`CSS.escape` is a browser builtin (Window.CSS) shipped in all major
browsers since 2016 and supported by jsdom. plotly.js is browser-only
in the relevant code path, so no fallback shim is needed.

## Reproducer

`examples/react-stale-redraw/` is a self-contained sub-project (own
`package.json`, React + Vite + Playwright). It mirrors pltly's
`<Plot>` useEffect pattern: a button toggles between View A (2 traces,
one with `uid: 'bar:'`) and View B (4 traces, none matching View A's
uids). The Playwright test asserts legend SVG + ytick formatting after
the click.

- **Without the fix**: `pnpm test` exits 1, "Bug REPRODUCED",
  pageerror "`.cbbar:` is not a valid selector".
- **With the fix**: `pnpm test` exits 0, "Bug NOT reproduced".

Linked at `link:../..` so the example tracks the local fork live.

## How this got mis-diagnosed initially

The first version of this spec proposed two fixes in
`src/plot_api/plot_api.ts`:
1. Lift the `transition` guard in `diffData` for trace-count change.
2. Have `applyUIRevisions` return a "uirev families changed" set and
   OR it into `relayoutFlags`.

Both were misdirected. The spec's stated premise ("`_fullLayout.transition`
defaults to a truthy object") was wrong — it's `undefined` unless the
user sets it explicitly. So the existing `!transition && !sameTraceLength`
guard in `diffData` already takes the `fullReplot` path, and Fix 1
would be a no-op. Fix 2 likewise wouldn't have helped, since the
`_doPlot` branch IS taken — it just throws partway through cleanup.

The actual cause was found by instrumenting `react()` / `_doPlot` /
`supplyDefaults` / `legend.draw` with `[STALE]`-tagged `console.log`s,
running ctbk against the local fork via `pds l plotly`, clicking the
Examples link with the workaround disabled, and observing that
`_doPlot` entered but never reached its config log — followed by a
pageerror with stack trace pointing into `cleanPlot` at the
`'.cbbar:'` selector.

## References

- ctbk.dev workaround commits: `021a93a3` (Home.tsx) and `eaa5fb5e`
  (YmrgtbChart.tsx, prior). Both add `key={plotKey}` (joined trace
  names) to force a fresh React mount on shape change. Once this fix
  is deployed, those workarounds can be removed.
- ctbk.dev y-axis sibling fix: `b90933d5` (per-attribute
  `yaxis.uirevision`). Independent of this bug; addresses a different
  same-trace-shape filter-toggle case.
