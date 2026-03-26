# ESM conversion: CJS dependency interop

## Problem

Plotly.js source is ESM but most third-party deps (`@plotly/d3`, `fast-isnumeric`, `tinycolor2`, etc.) are CJS. The question is how to import them.

## Status: NOT FIXED — workaround in consumer apps

Neither import form works universally:

- **`import X from 'cjs-pkg'`** (default import, current state) — works in esbuild and in Vite WITH pre-bundling. Fails in Vite dev if the dep is excluded from pre-bundling ("no default export").

- **`import * as X from 'cjs-pkg'`** (namespace import) — works in strict ESM contexts. BUT fails when code mutates imported properties (e.g. `d3.event = e`, `mapboxgl.accessToken = token`), because ESM namespace objects are frozen.

## Current approach

We use `import X from` (default import) for all CJS deps. This works because:

1. **esbuild** (our build pipeline) handles CJS→default interop automatically
2. **Vite** pre-bundles `node_modules` deps by default, creating synthetic default exports

The error HT hit ("no default export") was caused by `optimizeDeps: { exclude: ['plotly.js'] }` in vite.config.ts — excluding plotly from pre-bundling also affected its CJS deps. The fix is in the consumer app: **remove the `optimizeDeps.exclude` config** (see `hudson-transit/www/specs/plotly-esm-cleanup.md`). The `pds` Vite plugin already handles ESM deps correctly without manual exclusion.

## `global` references in CJS deps

Some CJS deps (e.g. `has-hover`) reference `global` — a Node.js global not available in browsers. This causes `ReferenceError: global is not defined` when bundled from ESM source.

Fixes applied:
- `has-hover` inlined (replaced with 1-line browser check — the package was 5 lines, unmaintained since 2016)
- esbuild build defines `global: 'window'`
- Vite pre-bundling wraps CJS deps with appropriate shims

If consumers see `global is not defined`, they likely have plotly excluded from `optimizeDeps` — fix by removing the exclusion.

## Long-term fix

Replace CJS deps with ESM equivalents:
- `@plotly/d3` (229 KB, d3 v3) → modern `d3@7` ESM packages (see `specs/d3-v7-migration.md`)
- `has-hover` → already inlined
- `tinycolor2` → has ESM build (`tinycolor2/esm`)
- Others are small and work fine with Vite pre-bundling

## No changes needed in plotly.js

The `import X from 'cjs-pkg'` pattern is correct for our use case. The issue is purely in consumer Vite configuration.
