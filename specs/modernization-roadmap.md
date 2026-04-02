# plotly.js modernization roadmap

What plotly.js would look like if written from scratch today, and how to get there incrementally.

## Current state (2026-04-02)

- **ESM**: 835 source files converted from CJS
- **d3 v7**: replaced `@plotly/d3` (v3) with modern d3 v7 ESM packages; d3-compat.ts reduced to 21 lines (1 tiny null-safety patch)
- **TypeScript**: 835/835 files (100%), `strict: true`, real types on core signatures
- **Modern JS**: `const`/`let` (0 `var`), arrow functions, rest params, function declarations
- **Tree-shakeable factory**: `createPlotly()` — 681 KB min (-37.5% vs upstream basic 1,089 KB)
- **Registry refactored**: all 275 `Registry.*` calls converted to direct named imports (0 `import Registry from` remaining)
- **Demo site**: 5 plot types with side-by-side comparison + E2E tests
- **CI**: perf benchmarks, bundle-compare, demo E2E, dist gated on perf passing

## Completed steps

### 1. `var` → `const`/`let` ✅
Zero `var` remaining. ~14,600 `const`, ~3,500 `let`.

### 2. `strict: true` ✅
All strict flags enabled: `strictFunctionTypes`, `noImplicitThis`, `strictNullChecks`, `noImplicitAny`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`, `useUnknownInCatchVariables`.

### 3. Remove d3-compat polyfill ✅
4 major polyfills removed:
- `.style({obj})` → individual `.style('key', val)` calls (52 sites)
- `.attr({obj})` → individual `.attr('key', val)` calls or `setAttrs()` (157 sites)
- Enter/update auto-merge → explicit `.merge()` (194 sites)
- `.select()` data propagation → `querySelector` in `ensureSingle` (195 sites)

Only remaining: `.attr()` getter null-safety (5 LOC).

### 5. Remove registration system ✅ (namespace indirection)
All 275 `Registry.*` calls converted to direct named imports:
- `Registry.traceIs` (60) → `traceIs()` from `trace_categories.ts`
- `Registry.call` (69) → direct function imports from `plot_api.ts`
- `Registry.getComponentMethod` (100) → named import
- `Registry.*` data (47) → named imports (`subplotsRegistry`, `modules`, etc.)

The registry **module** still exists (runtime registration), but the **namespace** (`import Registry from`) is eliminated.

### 7. Modern JS patterns ✅
- 280+ callback `function` keywords → arrow functions
- `arguments` object → rest params
- `export const = function` → `export function` declarations
- `.then(function)` / `.catch(function)` → arrows

## Remaining work

### 4. Proper interfaces
**Status: partially done (~5,400 `: any` remain)**

The `any` count increased from ~2,500 to ~5,400 during strict mode enablement (implicit anys made explicit). Key areas:
- Schema-generated types exist (`types/schema.d.ts`) but aren't used in source yet
- `[key: string]: any` escape hatches on core interfaces
- ~100 `getComponentMethod` calls return `any` (the component method types)

### 6. Split monolithic files
**Status: not started**

| File | Lines | What to split |
|---|---|---|
| `axes.ts` | 4,673 | tick-calc, tick-draw, grid, labels, autorange |
| `plot_api.ts` | 3,800+ | newPlot, restyle, relayout, animate, purge |
| `plots.ts` | 3,300+ | supplyDefaults, doCalcdata, style, autoMargin |
| `drawing/index.ts` | 1,967 | primitives, text, markers, gradients |

### 8. Remove default exports
**Status: drawing done, lib/plots still have default exports**

### Next frontier: static component resolution

The `getComponentMethod('name', 'method')` pattern is still a **runtime** lookup — the bundler can't tree-shake unused components that are registered. To enable "one big import + automatic tree-shaking":

1. Replace `getComponentMethod` with **direct imports** where the component is always needed (e.g., `fx.hover` is called from every cartesian subplot)
2. For truly optional components (shapes, annotations, colorbar), pass through a **context object** on `gd._fullLayout._components` populated at registration time
3. Eventually: consumers just `import { newPlot } from 'plotly.js'` and the bundler drops unused code

This is the remaining gap between "factory lets you choose" (current) and "bundler figures it out automatically" (goal).

## Bundle size progress

| Milestone | Factory size | vs upstream |
|---|---|---|
| Initial (lite bundle) | 832 KB | -24% |
| createPlotly() factory | 763 KB | -30% |
| + dep inlining | 686 KB | -37% |
| + all modernization | **681 KB** | **-37.5%** |
| Target (static components) | ~600 KB | ~-45% |
| Theoretical floor | ~500 KB | ~-54% |
