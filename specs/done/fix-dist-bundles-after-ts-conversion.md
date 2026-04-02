# Fix dist bundles after TS conversion

## Problem

The dist bundles built from the TS-converted source (`84bfd04` and later) are broken at runtime. Errors observed in the browser:

```
TypeError: Plotly.d_apply is not a function
TypeError: Plotly.e.charAt is not a function
```

These appear when loading `dist/basic.min.js` (and likely other bundles). The pre-TS dist (`3d1fdb4f2`, built from the `var`→`const`/`let` commit) works fine.

## Reproduction

```bash
# Working dist (pre-TS):
pds gh plotly.js   # gets 3d1fdb4f2
# → dist/plotly-basic.min.js loads and renders plots correctly

# Broken dist (post-TS):
pds gh plotly.js   # gets 84bfd04 or later (c3c622e)
# → dist/basic.min.js loads but throws at runtime
```

Tested in: nj-crashes project, Vite dev server + Chromium, loading via `PlotlyProvider` dynamic import.

## Likely cause

The TS conversion changed source files from `.js` to `.ts`, but the bundle build (`npm run build`) may not be compiling TS correctly before bundling. Possible issues:

1. **Bundle script doesn't run `tsc` first** — the bundle tasks (`tasks/bundle.mjs`, `tasks/extra_bundles.mjs`) may use Browserify/transforms that expect `.js` input, not `.ts`
2. **Source map / minification issue** — the TS output may have different variable naming that breaks Terser's mangling (the `d_apply`, `e.charAt` errors look like mangled names)
3. **ESM→UMD wrapping issue** — the source is now ESM (`import`/`export`) but the UMD bundle wrapper may not be handling it correctly

## Additional issue: `lib/` re-exports to `src/*.ts`

The dist branch ships `lib/` and `src/` via `preserve_dirs`, but `lib/core.js` does:
```js
export { default } from '../src/core.js';
```

While `src/` contains `.ts` files (e.g. `src/core.ts`), not `.js`. So ESM imports through `lib/` also fail:
```
Could not resolve "../src/traces/bar/index.js" from "lib/bar.js"
```

This means clean subpath imports (`import('plotly.js/basic')` via the `exports` map) don't work on the dist branch either.

## Fix

1. **Bundles**: Ensure the build pipeline compiles TS → JS before bundling. Verify with a simple smoke test: load each bundle in a browser and call `Plotly.newPlot()`.

2. **`lib/` re-exports**: Either:
   - Compile `src/*.ts` → `src/*.js` before shipping to dist, or
   - Have `lib/*.js` contain the actual compiled code (inline, not re-exports), or
   - Don't ship `lib/`+`src/` on dist at all — just ship `dist/` bundles and rewrite `exports` to point there (the `npm-dist` `exports_map` approach)

3. **CI gate**: Add a basic smoke test to the dist build workflow — import each bundle and verify `Plotly.newPlot` exists. The perf workflow already builds bundles; extend it to verify they actually load.

## Bundle naming

Also note: bundle names changed from `plotly-basic.min.js` to `basic.min.js` in the TS conversion. This is a breaking change for consumers using direct `dist/` paths. Consider keeping the `plotly-` prefix for backward compat, or document the rename.
