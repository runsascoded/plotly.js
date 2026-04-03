# Compile `src/*.ts` → `src/*.js` for dist branch

## Problem

The dist branch ships raw `.ts` files in `src/`, but `lib/*.js` re-exports reference `.js` extensions:

```js
// lib/bar.js
export { default } from '../src/traces/bar/index.js';
```

Since `src/traces/bar/index.ts` exists but `index.js` does not, ESM imports through `lib/` fail:

```
Could not resolve "../src/traces/bar/index.js" from "lib/bar.js"
```

This means clean imports like `import('plotly.js/basic')` (which routes to `lib/index-basic.js` via `exports` map) don't work for consumers using the GH dist.

**Note**: The UMD bundles in `dist/` (e.g. `dist/basic.min.js`) work fine — they're self-contained. This only affects ESM consumption through `lib/`.

## Root cause

The `build-dist.yml` workflow uses `preserve_dirs: dist,lib,src,...` which copies `src/` as-is from the source tree. Since source files are `.ts`, consumers can't import them.

## Fix

Add a `tsc` compilation step to the dist build, before `npm-dist` runs:

```yaml
- name: Compile TypeScript for dist
  run: pnpm tsc --outDir src --rootDir src --declaration false
```

Or alternatively, in the build script that already runs (`pnpm run build`), include a step that compiles `src/` to `.js`.

The key requirement: after the build step, `src/traces/bar/index.js` must exist alongside (or instead of) `src/traces/bar/index.ts`.

## Verification

After fix, this should work from a consumer using the GH dist:

```ts
import Plotly from 'plotly.js/basic'  // resolves via exports → lib/index-basic.js → src/...
Plotly.newPlot(div, data, layout)
```

## Relation to `fix-dist-bundles-after-ts-conversion.md`

That spec was moved to `done/` after the UMD bundle fix, but it also listed this `lib/` → `src/*.ts` issue. This spec tracks the remaining piece.
