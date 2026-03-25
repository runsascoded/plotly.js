# Dist branch: ESM-compatible entry points

## Problem

The dist branch has `"type": "module"` in `package.json` but `exports`/`main` point at `./dist/plotly.min.js` — a pre-built CJS bundle (uses `require()`, `module.exports`). This is an invalid combination:

```
"type": "module"  ← tells Node/bundlers "all .js files are ESM"
"main": "./dist/plotly.min.js"  ← but this file is CJS
```

Causes runtime error in Vite dev:
```
Uncaught TypeError: Cannot set properties of undefined (setting 'uirevision')
```
Stack trace shows `__require` (CJS shim) inside the min bundle.

## Current dist branch `package.json`

```json
{
  "type": "module",
  "main": "./dist/plotly.min.js",
  "exports": {
    ".": "./dist/plotly.min.js",
    "./basic": "./dist/basic.min.js",
    "./lite": "./dist/lite.min.js",
    ...
  }
}
```

## Options

### Option A: Include ESM source in dist branch

Include `lib/` and `src/` in the dist branch. Point `exports` at ESM source:

```json
{
  "type": "module",
  "main": "./lib/index.js",
  "exports": {
    ".": "./lib/index.js",
    "./lite": "./lib/index-lite.js",
    "./basic": "./lib/index-basic.js",
    "./dist/*": "./dist/*"
  }
}
```

Consumers get tree-shakeable ESM by default. Pre-built bundles still available via `plotly.js/dist/plotly.min.js` for CDN/script-tag use.

**Pro**: tree-shaking works, clean ESM story
**Con**: dist branch is larger (includes source), pre-built bundles are still CJS

### Option B: Build ESM dist bundles

Use Rollup/esbuild to produce ESM output bundles (`dist/plotly.esm.js`, `dist/plotly.esm.min.js`). Point exports at those.

**Pro**: dist branch stays small (just bundles, no source)
**Con**: more build complexity, no tree-shaking (single-file bundles)

### Option C: Source-only dist, no pre-built bundles

Only include `lib/` + `src/` in dist. No `dist/` directory. Consumers must use a bundler.

**Pro**: simplest, smallest, fully tree-shakeable
**Con**: breaks CDN/script-tag usage, breaks `npm-dist` convention

## Recommendation

Option A. It's the least disruptive: pre-built bundles still exist for backwards compat, but default imports get ESM source. The `npm-dist` workflow needs to:

1. Copy `lib/` and `src/` into the dist branch (currently only copies `dist/`)
2. Set `main` and `exports["."]` to `./lib/index.js` (not `./dist/plotly.min.js`)
3. Keep `"./dist/*": "./dist/*"` for explicit dist bundle access

The pre-built CJS bundles in `dist/` don't need to change — they're only used when explicitly imported via `plotly.js/dist/plotly.min.js`.
