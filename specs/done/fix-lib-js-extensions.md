# Fix `lib/*.js` re-exports: `.js` extensions don't resolve to `.ts` source

## Problem

`lib/*.js` files use explicit `.js` extensions in their re-exports:

```js
// lib/bar.js
export { default } from '../src/traces/bar/index.js';
```

But `src/` contains `.ts` files. This breaks in two scenarios:

### 1. Local dev (`pds local plotly.js`)
Vite serves source files directly. `../src/traces/bar/index.js` doesn't exist — only `index.ts`. Vite doesn't auto-resolve `.js` → `.ts`.

### 2. GH dist (before `compile-src-for-dist` fix)
If the dist branch doesn't compile `src/*.ts` → `src/*.js`, same issue.

The GH dist now ships compiled `.js` (fix landed), but local dev is still broken.

## Fix

Remove `.js` extensions from `lib/*.js` re-exports:

```js
// lib/bar.js — before
export { default } from '../src/traces/bar/index.js';

// lib/bar.js — after
export { default } from '../src/traces/bar/index';
```

Vite, Node (with `--experimental-specifier-resolution=node`), and bundlers all resolve extensionless imports to either `.ts` or `.js` based on what exists. This makes `lib/` work in both local dev (`.ts`) and dist (`.js`).

Alternatively, use `.ts` extensions and rely on TypeScript's `allowImportingTsExtensions` (but this breaks non-TS consumers). Extensionless is the safest.

## Scope

All files in `lib/` that re-export from `src/`:

```bash
grep -r "from '../src/.*\.js'" lib/ | wc -l
```

## Interaction with consumers

Once fixed, `import('plotly.js/basic')` will work with both `pds local` and `pds gh` without any Vite config workarounds (`optimizeDeps.exclude`, `global` shim, etc.).
