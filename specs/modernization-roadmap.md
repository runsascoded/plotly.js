# plotly.js modernization roadmap

What plotly.js would look like if written from scratch today, and how to get there incrementally.

## Current state (after ESM + d3 v7 + factory)

- ESM source, d3 v7, tree-shakeable factory entry point
- Factory: 686 KB min (-37% vs upstream basic)
- Registration system still intact (226 call sites)
- All JS, no types, heavy `var` + mutation patterns

## Target state

### 1. No registration system

**Status: partially done (factory works around it), not removed**

Replace the 3 main Registry patterns:

#### `Registry.getComponentMethod('name', 'method')` → direct imports (96 calls)
```ts
// Before:
Registry.getComponentMethod('legend', 'draw')(gd);
// After:
import { draw as drawLegend } from './components/legend/draw.js';
drawLegend(gd);
// Or via context for optional components:
gd._components.legend?.draw(gd);
```

#### `Registry.traceIs(trace, 'category')` → static metadata (61 calls)
```ts
// Before:
Registry.traceIs(trace, 'cartesian')
// After:
trace._module.categories.cartesian  // already available after supplyDefaults
```

#### `Registry.call('apiMethod', ...args)` → direct function calls (69 calls)
```ts
// Before:
Registry.call('relayout', gd, update);
// After:
import { relayout } from './plot_api/plot_api.js';
relayout(gd, update);
```
The `Registry.call` pattern exists to avoid circular imports (plot_api ↔ plots). Fix with a thin internal dispatch module or by restructuring the dependency graph.

### 2. TypeScript

**Status: not started**

Priority order for TS conversion:
1. **Core types** (new file): define `PlotlyGd`, `FullLayout`, `FullTrace`, `PlotInfo`, `CalcData` etc. — the shapes that flow through everything
2. **lib/index.ts** — utility module, pure functions, easy to type
3. **registry.ts** → **context.ts** — replace with typed component/trace context
4. **plot_api/*.ts** — core API with typed signatures
5. **plots/plots.ts** — core plotting infrastructure
6. **traces/scatter/*.ts**, **traces/bar/*.ts** — trace modules
7. **components/** — one at a time

Benefits:
- Self-documenting object shapes (no more guessing what's on `gd._fullLayout`)
- Catch type errors at build time (currently caught at runtime or not at all)
- Better IDE support for consumers
- Enables stricter tree-shaking (TS compiler can identify dead code)

Approach:
- Use `allowJs: true` in tsconfig for incremental migration
- Convert one module at a time, starting from leaves (lib utilities) toward the core
- Define interface files first (`types/`) before converting implementations
- Keep `.js` extension in imports (for ESM compat)

### 3. Remove backward-compat default exports

**Status: 3 modules converted to named exports but still have `export default` for backward compat**

The named-export conversions (drawing, lib, plots) only save ~13 KB because `export default { allMethods }` keeps everything alive. To get the full tree-shaking benefit:
- Convert ALL consumers of each module to named imports (not just factory-bundle ones)
- Remove `export default` entirely
- This is ~400 files for lib, ~50 for drawing, ~40 for plots

Effort: large but mechanical. Could be automated with a codemod.

### 4. Split monolithic files

**Status: not started**

| File | Lines | Size | Split into |
|---|---|---|---|
| `axes.js` | 4,673 | 160 KB | tick-calc, tick-draw, grid, labels, autorange |
| `plot_api.js` | 3,800+ | 143 KB | newPlot, restyle, relayout, animate, purge |
| `plots.js` | 3,300+ | 115 KB | supplyDefaults, doCalcdata, style, autoMargin |
| `drawing/index.js` | 1,967 | 89 KB | primitives, text, markers, gradients |

Benefits: enables tree-shaking within modules (e.g., a plot without animations doesn't need `animate`).

### 5. Modern JS patterns

- `var` → `const`/`let` everywhere
- Mutation-heavy patterns → immutable where practical
- `arguments` object → rest params
- `for(var i=0; ...)` → `for...of` or array methods
- String concatenation → template literals
- `prototype` patterns → classes or plain functions

## Recommended order

1. **TypeScript types** — define core interfaces without converting code (immediate DX benefit)
2. **Remove remaining `export default`** from drawing/lib/plots (unlock tree-shaking, ~20-30 KB)
3. **Registry.traceIs → static** (61 calls, mechanical, enables trace-level tree-shaking)
4. **Registry.call → direct imports** (69 calls, needs circular dep resolution)
5. **Registry.getComponentMethod → context** (96 calls, biggest refactor)
6. **TS conversion** of core files (incremental, module by module)
7. **Split monolithic files** (axes, plot_api, plots, drawing)
8. **Modern JS patterns** (can happen alongside any of the above)

## Measuring progress

The `perf/bundle-compare/compare.mjs` CI job tracks fork vs upstream sizes. Each improvement should show up there, especially the factory line.

Current: 686 KB min (-37% vs upstream basic)
Target after removing default exports: ~650-660 KB
Target after full registry removal: ~600-620 KB (components fully tree-shakeable)
Target after splitting monolithic files: ~550-580 KB
Theoretical floor (scatter+bar+legend, no dead code): ~400-500 KB
