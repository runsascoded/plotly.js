# plotly.js modernization roadmap

What plotly.js would look like if written from scratch today, and how to get there incrementally.

## Current state (2026-04-02)

- **ESM**: 835 source files converted from CJS
- **d3 v7**: replaced `@plotly/d3` (v3) with modern d3 v7 ESM packages
- **TypeScript**: 835/835 files converted (100%), real types (`GraphDiv`, `FullTrace`, etc.) on core signatures
- **Tree-shakeable factory**: `createPlotly()` at `lib/factory.js` — 685 KB min (-37% vs upstream basic)
- **Demo site**: 5 plot types with side-by-side upstream vs fork comparison + E2E tests
- **CI**: perf benchmarks, bundle-compare, demo E2E, dist gated on perf passing

## Remaining work (in priority order)

### 1. `var` → `const`/`let`
**Status: not started**
**Effort: large, mechanical**

The entire codebase uses `var`. Modern JS/TS uses `const` for values that don't change (vast majority) and `let` for the few that do. This is the single biggest code quality improvement remaining.

Approach:
- Convert `var` → `const` everywhere
- Fix errors where `const` doesn't work (reassigned variables) → use `let`
- Can be automated with eslint `--fix` or a codemod
- ~10,000+ `var` declarations across 835 files

### 2. `strict: true` in tsconfig
**Status: not started (currently `strict: false`)**
**Effort: large, reveals real bugs**

Enabling strict mode turns on:
- `noImplicitAny` — no implicit `any` types
- `strictNullChecks` — `null`/`undefined` must be explicitly handled
- `strictFunctionTypes` — function parameter types checked contravariantly
- `noImplicitThis` — `this` must be typed in functions

This will surface hundreds of real type issues that are currently hidden. Each is either a genuine bug or needs an explicit type annotation.

Approach: enable one flag at a time, fix errors, repeat.

### 3. Remove d3-compat polyfill
**Status: not started (~480 v3 patterns remain)**
**Effort: large, high-value**

`src/lib/d3-compat.ts` patches `Selection.prototype` at runtime to handle d3 v3 patterns. This is un-TypeScript and prevents proper d3 typing. Four patterns need native v7 conversion:

| Pattern | Count | v7 equivalent |
|---|---|---|
| `enter().append()` auto-merge | ~130 | `enter().append().merge(update)` or `.join()` |
| `.style({obj})` object form | ~52 | Individual `.style('key', val)` calls |
| `.attr({obj})` object form | ~105 | Individual `.attr('key', val)` calls |
| `.select()` data non-propagation | ~195 | Use `node.querySelector()` where data matters |

Also: ~20+ `.on()` callbacks still use d3 v3 signature `(datum)` instead of v7 `(event, datum)`. The `fix-d3-event.mjs` script fixed most but missed custom handlers (pie, sunburst, parcats, sankey, etc.).

### 4. Proper interfaces for common `any` patterns
**Status: partially done (core types exist, ~2,500 `any`s remain)**
**Effort: medium, ongoing**

Key areas:
- **`opts: any`** (83 occurrences) — define interfaces for tick options, drag options, hover options, etc.
- **`coerce: any`** (24) — standardize coerce function signature
- **`d: any`** (202) — many are `CalcDatum` but d3's typing makes this hard
- **`s: any`** (65) — d3 `Selection<Element, Datum, ...>` types
- **Schema-generated types** — `types/schema.d.ts` exists but isn't used in source yet; replace `[key: string]: any` escape hatches on `FullTrace`/`FullLayout` with exhaustive property lists

### 5. Remove registration system
**Status: partially done (factory works around it, shapes/modebar decoupled)**
**Effort: large, high-value for tree-shaking**

226 `Registry.*` call sites across ~91 files:
- `Registry.getComponentMethod` (96 calls) → context object on `gd`
- `Registry.call` (69 calls) → direct function imports
- `Registry.traceIs` (61 calls) → `trace._module.categories` (static)

See `specs/remove-registration-system.md` for detailed plan.

### 6. Split monolithic files
**Status: not started**
**Effort: large**

| File | Lines | What to split |
|---|---|---|
| `axes.ts` | 4,673 | tick-calc, tick-draw, grid, labels, autorange |
| `plot_api.ts` | 3,800+ | newPlot, restyle, relayout, animate, purge |
| `plots.ts` | 3,300+ | supplyDefaults, doCalcdata, style, autoMargin |
| `drawing/index.ts` | 1,967 | primitives, text, markers, gradients |

Enables tree-shaking within modules (e.g., a plot without animations doesn't need `animate`).

### 7. Modern JS patterns
**Status: not started (beyond ESM conversion)**
**Effort: ongoing, can happen alongside any of the above**

- `arguments` object → rest params (`...args`)
- `for(var i=0; i<arr.length; i++)` → `for...of` or array methods
- String concatenation → template literals
- `prototype` patterns → classes or plain functions
- `Object.keys(x).forEach(function(k) {...})` → `for...of Object.entries()`
- `typeof x !== 'undefined'` → optional chaining (`x?.prop`)
- `a || defaultVal` → nullish coalescing (`a ?? defaultVal`)
- Manual array/object cloning → spread (`{...obj}`, `[...arr]`)

### 8. Remove backward-compat default exports
**Status: drawing done, lib/plots still have default exports**
**Effort: medium**

`lib/index.ts` and `plots/plots.ts` still export `export default` objects alongside named exports. The default export keeps all code alive for tree-shaking purposes. Converting ALL consumers (~350 for lib, ~40 for plots) to named imports enables removing the defaults.

## Measuring progress

- `perf/bundle-compare/compare.mjs` — fork vs upstream sizes
- `demo/test.mjs` — E2E rendering tests
- `npx tsc --noEmit` — type safety
- `grep -r 'var ' src/ --include='*.ts' | wc -l` — modernization progress
- `grep -r ': any' src/ --include='*.ts' | wc -l` — type coverage

## Targets

| Metric | Current | After var→const/let | After strict | After d3-compat removal |
|---|---|---|---|---|
| `var` count | ~10,000 | 0 | 0 | 0 |
| `: any` count | ~2,500 | ~2,500 | ~500 | ~300 |
| d3-compat polyfills | 4 | 4 | 4 | 0 |
| Factory bundle | 685 KB | 685 KB | 685 KB | ~670 KB |
| Registry calls | 226 | 226 | 226 | 0 (after step 5) |
