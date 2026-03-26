# Migrate from `@plotly/d3` (v3) to d3 v7 ESM packages

## Problem

`@plotly/d3` is a vendored d3 v3 bundle from 2016 — a single 229 KB CJS file. It's the largest dependency in plotly.js and the primary source of CJS interop issues:

- **CJS import**: must use `import d3 from '@plotly/d3'` (default import), relying on bundler CJS interop
- **Mutable state**: plotly mutates `d3.event` during zoom/drag, which breaks `import * as d3` (frozen namespace)
- **No tree-shaking**: it's a monolithic bundle; plotly uses ~40% of d3's API but ships 100%
- **Outdated API**: d3 v3 patterns (e.g. `d3.event`, `d3.behavior.zoom()`) were replaced in v4+

## What d3 v7 gives us

d3 v7 is fully ESM and published as individual packages:
- `d3-selection` — DOM manipulation
- `d3-scale` — scales
- `d3-axis` — axis rendering
- `d3-shape` — line/area/arc generators
- `d3-transition` — animations
- `d3-zoom`, `d3-drag`, `d3-brush` — interactions
- etc.

Each is tree-shakeable. Import only what you use:
```js
import { select, selectAll } from 'd3-selection';
import { scaleLinear } from 'd3-scale';
```

## Scope

`@plotly/d3` is imported in 94 files. The main APIs used:

| d3 v3 API | d3 v7 equivalent | Files |
|---|---|---|
| `d3.select()` / `d3.selectAll()` | `import { select } from 'd3-selection'` | ~80 |
| `d3.format()` / `d3.numberFormat()` | `import { format } from 'd3-format'` | ~15 |
| `d3.scale.linear()` | `import { scaleLinear } from 'd3-scale'` | ~20 |
| `d3.svg.line()` / `d3.svg.area()` | `import { line, area } from 'd3-shape'` | ~10 |
| `d3.behavior.zoom()` | `import { zoom } from 'd3-zoom'` | ~5 |
| `d3.behavior.drag()` | `import { drag } from 'd3-drag'` | ~3 |
| `d3.event` (mutable) | `event` param in callbacks (v4+) | ~10 |
| `d3.interpolate()` | `import { interpolate } from 'd3-interpolate'` | ~5 |
| `d3.time.format()` | `import { timeFormat } from 'd3-time-format'` | ~5 |

## Breaking changes (v3 → v7)

### `d3.event` removal
d3 v4 removed the mutable `d3.event` global. Events are now passed as the first argument to callbacks:

```js
// v3:
d3.behavior.zoom().on('zoom', function() { var e = d3.event; ... })

// v7:
d3.zoom().on('zoom', function(event) { ... })
```

This is the biggest migration effort — every zoom/drag/brush handler needs updating.

### `d3.svg.*` → `d3.*`
```js
// v3: d3.svg.line(), d3.svg.area(), d3.svg.arc()
// v7: d3.line(), d3.area(), d3.arc()
```

### Scale constructors
```js
// v3: d3.scale.linear(), d3.scale.ordinal()
// v7: d3.scaleLinear(), d3.scaleOrdinal()
```

### Transitions
```js
// v3: selection.transition().duration(300)
// v7: same API, but import from 'd3-transition' (side-effect import extends selection)
```

## Implementation strategy

### Phase 1: Add d3 v7 packages alongside v3
Install `d3-selection`, `d3-scale`, `d3-shape`, etc. as deps. Don't remove `@plotly/d3` yet.

### Phase 2: Migrate file by file
For each file that imports `@plotly/d3`:
1. Replace `import d3 from '@plotly/d3'` with specific d3 v7 imports
2. Update API calls to v7 patterns
3. Test that file's trace type / component still renders

Start with the simplest files (just `d3.select()`) and work toward the complex ones (zoom, drag, event handling).

### Phase 3: Remove `@plotly/d3`
Once all 94 files are migrated, remove `@plotly/d3` from deps.

## Expected impact

- **Bundle size**: ~229 KB → ~80 KB (estimated, only used d3 modules)
- **CJS interop**: eliminated — all d3 packages are ESM
- **Tree-shaking**: per-function granularity
- **No `d3.event` mutation**: removes the main blocker for strict ESM imports

## Risk

This is the largest single refactor after the ESM conversion. d3 v3→v7 has subtle behavior changes in scales, transitions, and event handling. Each trace type needs visual verification after migration.
