# plotly.js fork context

This is a fork of [plotly/plotly.js] maintained at [runsascoded/plotly.js].

## Purpose

Provide a customized plotly.js for use across several projects (NJ crashes, PATH ridership, hub-bound travel, etc.) via [pltly] (React wrapper) and [pds] (dependency management).

## Current fork changes (vs upstream v3.3.1)

- **z-order fix**: Preserve z-indexed subplots during `relayout` for correct pan/zoom
- **Touch fix**: Prevent duplicate `plotly_click` and scroll-triggered clicks
- **Flush legend toggle rects**: Expand legend item hit areas so they tile flush (no hover gaps)
- **Custom legend symbols**: `legendsymbol.path` trace attribute for custom SVG legend icons
- **Treemap transpose**: Add `tiling.transpose` attribute for treemap traces
- **`exports` map**: Subpath imports (`plotly.js/basic`, `plotly.js/core`, etc.) via `lib/`
- **Lite bundle**: `plotly.js/lite` — scatter + bar with only essential components (949 KB minified)
- **Deferred margins**: `config.deferAutoMargin` for 15-29% faster first paint
- **Perf instrumentation**: `performance.measure()` around key render phases

## Build & dist

Built files are **not tracked on `main`**. The `dist` branch is auto-built by GHA on push to `main`, including all bundles (basic, cartesian, finance, geo, etc.), locales, and schema.

```bash
# Full local build (slow, ~5min, all bundles + locales)
npm run build

# Just the extra bundles (basic, cartesian, etc.)
npm run extra-bundles
```

`dist/topojson/`, `dist/plot-schema.json`, `dist/plotly-geo-assets.js`, and `dist/translation-keys.txt` are tracked (source/data files that live under `dist/`). The JS/CSS bundles are gitignored.

## Bundle variants

| Bundle | Entry point | Minified | Contents |
|---|---|---|---|
| **lite** | `plotly.js/lite` | 949 KB | scatter + bar, 6 components (legend, fx, shapes, errorbars, colorscale, modebar) |
| minimal | `plotly.js/minimal` | 1,051 KB | scatter + bar, all 15 components |
| basic | `plotly.js/basic` | 1,157 KB | scatter + bar + pie + calendars, all 15 components |

## Performance testing

```bash
npm run perf        # benchmark minimal bundle
npm run perf:lite   # benchmark lite bundle
npm run perf:basic  # benchmark basic bundle

# Options:
node perf/bench.mjs --lite --minify   # minified bundle
node perf/bench.mjs --lite --defer    # with deferAutoMargin
node perf/bench.mjs --lite --update   # accept new bundle size
node perf/bench.mjs --lite --headed   # visible browser
```

Bundle sizes are asserted at the exact byte level in `perf/thresholds.json`. If the size changes, the test fails; pass `--update` to accept the new size. Render times are tracked in JSONL history files under `perf/results/`.

## Downstream stack

```
plotly.js (this fork)
  └─ pltly (React hooks: hover, solo, pin, fade, dual-axis, theme)
       └─ consumer apps (crashes, path, hub-bound, awair, etc.)
```

- **[pltly]** wraps plotly.js with React hooks for legend interaction, trace highlighting, mobile touch fixes, and theme support
- **[pds]** manages switching between local/GH-dist/npm versions across the stack

### Testing in consumer projects

```bash
# In consumer project (e.g. crashes, awair/www):
pds l plotly     # switch to local (resolves to lib/ source, Vite pre-bundles)
pds gh plotly    # switch to GitHub dist branch
pds n plotly     # switch to npm
```

Local mode resolves to `lib/` via the `main` entry point — no local build needed.

## Design philosophy

### Minimize "custom" code in consumer apps

Consumer apps should NOT need to:
- Build their own legend UIs (icons, pin/hover behavior)
- Implement their own trace fading/highlighting
- Handle mobile touch quirks
- Manage plotly bundle loading

Instead, these should be handled by plotly.js (rendering) and pltly (React integration).

### Legend customization belongs in plotly.js

`legendsymbol.path` lets traces specify custom SVG paths as legend icons, replacing the default colored squares. This eliminates the need for custom React legends — pltly's `usePinnedLegend` handles all cases with native plotly legend items.

### What to upstream vs keep in fork

**Keep in fork** (unlikely to be accepted upstream):
- Custom legend symbols/icons
- Lite bundle / component stripping
- Any breaking changes to legend behavior

**Consider upstreaming** (bug fixes, non-breaking):
- Flush legend toggle rects (PR-able)
- z-order relayout fix (PR-able)
- Touch interaction fixes
- `deferAutoMargin` config option

## Specs

Completed specs live in `specs/done/`:
- `flush-legend-toggle-rects.md` — expand legend item hit areas
- `legend-icon-symbols.md` — custom SVG legend symbols via `legendsymbol.path`
- `dist-extra-bundles.md` — build all bundles for dist branch
- `custom-minimal-bundle.md` — lite/minimal bundle analysis
- `perf-harness.md` — automated Playwright perf benchmark
- `fast-initial-render.md` — deferred margin calculation, perf instrumentation

[plotly/plotly.js]: https://github.com/plotly/plotly.js
[runsascoded/plotly.js]: https://github.com/runsascoded/plotly.js
[pltly]: https://gitlab.com/runsascoded/js/pltly
[pds]: https://github.com/runsascoded/pnpm-dep-source
