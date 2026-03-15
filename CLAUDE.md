# plotly.js fork context

This is a fork of [plotly/plotly.js](https://github.com/plotly/plotly.js) maintained at [runsascoded/plotly.js](https://github.com/runsascoded/plotly.js).

## Purpose

Provide a customized plotly.js for use across several projects (NJ crashes, PATH ridership, hub-bound travel, etc.) via the [pltly](https://gitlab.com/runsascoded/js/pltly) React wrapper and [pds](https://github.com/runsascoded/pnpm-dep-source) dependency management.

## Current fork changes (vs upstream v3.3.1)

- **z-order fix**: Preserve z-indexed subplots during `relayout` for correct pan/zoom
- **Touch fix**: Prevent duplicate `plotly_click` and scroll-triggered clicks
- **Flush legend toggle rects**: Expand legend item hit areas so they tile flush (no hover gaps)
- **Treemap transpose**: Add `tiling.transpose` attribute for treemap traces

## Build

```bash
# Full build (slow, ~5min, all bundles + locales)
npm run build

# Just the extra bundles (basic, cartesian, etc.)
npm run extra-bundles

# Note: if used as a local pds dep in a pnpm workspace, esbuild must be
# installed locally (`npm install esbuild`) to prevent workspace resolution
# conflicts. See pds spec `vite-cjs-compat.md`.
```

The dist branch is auto-built by GHA on push to `main`.

## Downstream stack

```
plotly.js (this fork)
  └─ pltly (React hooks: hover, solo, pin, fade, dual-axis, theme)
       └─ consumer apps (crashes, path, hub-bound, etc.)
```

- **pltly** wraps plotly.js with React hooks for legend interaction, trace highlighting, mobile touch fixes, and theme support
- **pds** manages switching between local/GH-dist/npm versions across the stack

## Design philosophy

### Minimize "custom" code in consumer apps

Consumer apps should NOT need to:
- Build their own legend UIs (icons, pin/hover behavior)
- Implement their own trace fading/highlighting
- Handle mobile touch quirks
- Manage plotly bundle loading

Instead, these should be handled by plotly.js (rendering) and pltly (React integration).

### Legend customization belongs in plotly.js

Currently, some consumer apps build "custom" React legends because plotly.js's native legend only supports colored squares. But the interaction logic (hover-to-highlight, click-to-pin, fade non-active traces) is identical. The difference is purely visual: icons vs squares.

Plotly.js should support:
- Custom legend symbols (SVG icons per trace, not just colored squares)
- The legend items should have flush hit areas by default (done)
- Legend item styling hooks (bold on pin, opacity on fade)

This would eliminate the need for custom React legends entirely, letting pltly's `usePinnedLegend` handle all cases.

### What to upstream vs keep in fork

**Keep in fork** (unlikely to be accepted upstream):
- Custom legend symbols/icons
- Any breaking changes to legend behavior

**Consider upstreaming** (bug fixes, non-breaking):
- Flush legend toggle rects (PR-able)
- z-order relayout fix (PR-able)
- Touch interaction fixes

## Specs

Specs for planned changes live in `specs/`:
- `flush-legend-toggle-rects.md` — expand legend item hit areas (done)
- Future: custom legend symbols, icon support

## Testing locally

To test in a consumer project (e.g. crashes):
```bash
# In consumer project:
pds l plotly.js          # switch to local
# plotly.js must have dist built: npm run extra-bundles
# Consumer imports plotly.js/lib/index-basic (CJS source, Vite pre-bundles it)
```
