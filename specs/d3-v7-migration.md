# Migrate from `@plotly/d3` (v3) to d3 v7 ESM packages

## Problem

`@plotly/d3` is a vendored d3 v3 bundle from 2013 — a single 229 KB CJS file. It's the largest dependency in plotly.js and the primary source of CJS interop issues:

- **CJS import**: must use `import d3 from '@plotly/d3'` (default import), relying on bundler CJS interop
- **Mutable state**: plotly mutates `d3.event` during zoom/drag, which breaks `import * as d3` (frozen namespace)
- **No tree-shaking**: it's a monolithic bundle; plotly uses ~40% of d3's API but ships 100%
- **Outdated API**: d3 v3 patterns (e.g. `d3.event`, `d3.behavior.zoom()`) were replaced in v4+

## What d3 v7 gives us

d3 v7 is fully ESM and published as individual packages. Import only what you use:
```js
import { select, selectAll } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
```

Estimated savings: 70-150 KB (based on shim experiment that showed 70 KB on the lite bundle).

## Approach: file-by-file migration, NOT a shim

A drop-in shim was attempted and failed — d3 v3→v7 has real behavioral differences:
- `d3.select()` return values have different method chains
- `d3.event` (mutable global) was removed; events are callback parameters in v4+
- `d3.svg.line()` → `d3.line()`, `d3.behavior.zoom()` → `d3.zoom()`, etc.
- Transition API changes

The correct approach: migrate each file individually, replacing `d3.xxx` calls with d3 v7 equivalents and testing that file's functionality.

## d3 API usage in plotly.js (94 files)

| d3 v3 API | Count | d3 v7 equivalent | Migration difficulty |
|---|---|---|---|
| `d3.select()` / `d3.selectAll()` | 347 | `import { select } from 'd3-selection'` | Easy (same API) |
| `d3.event` | 87 | `event` param in callbacks | Hard (refactor every handler) |
| `d3.mouse()` | 15 | `import { pointer } from 'd3-selection'` | Medium |
| `d3.behavior.zoom()` / `.drag()` | 12 | `import { zoom } from 'd3-zoom'` | Medium (API renamed) |
| `d3.round()` | 10 | inline `Math.round` wrapper | Easy |
| `d3.scale.linear()` etc. | 9 | `import { scaleLinear } from 'd3-scale'` | Easy (renamed) |
| `d3.svg.line()` / `.area()` / `.arc()` | 2 | `import { line, area, arc } from 'd3-shape'` | Easy (moved) |
| `d3.rebind()` | 2 | Remove (obsolete pattern) | Medium |
| `d3.json()` | 2 | `fetch().then(r => r.json())` | Easy |
| Other (`d3.locale`, `d3.dispatch`, etc.) | ~15 | Various d3 v7 packages | Easy-Medium |

## Migration order

### Phase 1: Easy replacements (no behavioral changes)

Files that only use `d3.select()` / `d3.selectAll()` — the API is identical in v7.
Replace `import d3 from '@plotly/d3'` with `import { select, selectAll } from 'd3-selection'`,
then change `d3.select(...)` to `select(...)`.

~60 files use only select/selectAll. This is mechanical and low-risk.

### Phase 2: Scale, shape, format changes (renamed APIs)

Replace `d3.scale.linear()` → `scaleLinear()`, `d3.svg.line()` → `line()`, etc.
API behavior is the same, just renamed. ~15 files.

### Phase 3: Event and interaction changes (behavioral)

The hard part: `d3.event` removal affects 87 call sites across zoom, drag, brush,
and click handlers. Each handler's callback signature changes from
`function() { var e = d3.event; ... }` to `function(event) { ... }`.

Also `d3.mouse(container)` → `pointer(event, container)` (needs the event object).

### Phase 4: Remove `@plotly/d3`

Once all 94 files are migrated, remove `@plotly/d3` from dependencies.
