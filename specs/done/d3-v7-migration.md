# Migrate from `@plotly/d3` (v3) to d3 v7 ESM packages

## Status: DONE

Completed 2026-03-28.

## Summary

Replaced `@plotly/d3` (vendored d3 v3 CJS bundle, 229 KB) with individual d3 v7 ESM packages across 94 source files. Net bundle size reduction: **160 KB / 8%** (lite bundle: 1,990 KB → 1,831 KB).

## What was done

### Import conversion (94 files)
- `import d3 from '@plotly/d3'` → individual named imports from d3 v7 packages
- Automated via `tasks/migrate-d3.mjs` (handles select, scale, shape, interpolate, format, zoom, drag, brush, axis, color, dispatch, ease, timer, array)
- Manual fixes for multi-line chains (`d3.select(this)`, `d3.transition()`)

### d3 v3 → v7 behavioral differences (handled by `src/lib/d3-compat.js`)
- **`.style({obj})`/`.attr({obj})` object form**: Removed in d3 v4. Polyfilled on `Selection.prototype`.
- **`.attr()` getter on null node**: v7 crashes, v3 returned undefined. Polyfilled.
- **Enter/update auto-merge**: In v3, `enter().append()` auto-merged into update selection. In v4+, they're separate. Polyfilled by patching `Selection.prototype.enter()`.
- **`.select()` data propagation**: v4+ copies parent `__data__` to children via `.select()`, overwriting existing data. Polyfilled to preserve child data (v3 behavior).

### Event/API changes (manual fixes)
- **`d3.event` removal**: 87 call sites converted to receive `event` as callback parameter (`tasks/fix-d3-event.mjs`)
- **`dragstart`/`dragend` → `start`/`end`**: d3-drag v4+ renamed events (7 files: legend, scrollbox, sankey, parcats, parcoords, table)
- **`.each('end')`/`.each('interrupt')` → `.on('end')`/`.on('interrupt')`**: Transition event listeners (12 files)
- **`.selectAll().map()` → `.selectChildren().sort()`**: d3 v3 selections were arrays; v7 selections are not (cartesian/index.js)
- **`d3.round()` → inline function**: Removed in d3 v4 (symbol_defs.js)
- **`d3.json(url, cb)` → `fetch(url).then(r => r.json())`**: Callback → Promise (geo files)
- **`d3.rebind()` → `Object.assign()`**: Removed in d3 v4 (svg_text_utils.js, geo/zoom.js)

### Dependency changes
- Removed: `@plotly/d3` (3.8.2)
- Added: `d3-array`, `d3-axis`, `d3-color`, `d3-dispatch`, `d3-drag`, `d3-ease`, `d3-scale`, `d3-selection`, `d3-shape`, `d3-transition`, `d3-zoom` (all v3.x/v4.x)
- Updated: `d3-force`, `d3-format`, `d3-geo`, `d3-geo-projection`, `d3-hierarchy`, `d3-time`, `d3-time-format` to latest major versions

## Key insight: d3 v3 and v7 cannot coexist

Different `Selection` prototypes cause cross-contamination. The migration had to be all-or-nothing across 94 files. The `d3-compat.js` polyfill bridges the behavioral gap so that v3-era plotly code works with v7 selections.

## Potential future work

- Replace `d3-compat.js` polyfills with native v4+ patterns (`.join()`, explicit `.merge()`, etc.) to remove the compat layer
- Some d3 packages may still be at older major versions in areas not exercised by the lite bundle
