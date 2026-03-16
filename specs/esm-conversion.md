# ESM conversion

## Problem

Plotly.js uses CommonJS (`require()`/`module.exports`) throughout its 971 source files. This prevents tree-shaking — bundlers like Vite/esbuild can only eliminate unused code from ES modules (`import`/`export`). Even the lite bundle at 949 KB minified includes code paths that consumer apps never execute.

## Scope

- 971 JS files in `src/` and `lib/`
- ~3900 `require()` calls
- ~890 `module.exports` assignments
- Zero conditional/dynamic requires (all top-level)

## Conversion patterns

All patterns are mechanical and automatable:

### Top-level variable requires
```js
// Before:
var Lib = require('./lib');
var { foo, bar } = require('./baz');

// After:
import Lib from './lib.js';
import { foo, bar } from './baz.js';
```

### Module.exports (default export)
```js
// Before:
module.exports = function plot() { ... };

// After:
export default function plot() { ... };
```

### Exports.* (named exports)
```js
// Before:
exports.foo = function() { ... };
exports.bar = 42;

// After:
export function foo() { ... }
export var bar = 42;
```

### Mixed exports (common in plotly)
Many files do `exports.foo = ...; exports.bar = ...;` throughout the file body. These become named exports. Files that also do `module.exports = { ... }` are default exports.

### Object literal requires (trace module index files)
```js
// Before:
module.exports = {
    attributes: require('./attributes'),
    supplyDefaults: require('./defaults'),
    calc: require('./calc'),
};

// After:
import attributes from './attributes.js';
import supplyDefaults from './defaults.js';
import calc from './calc.js';

export default {
    attributes,
    supplyDefaults,
    calc,
};
```

### 'use strict' removal
ESM is strict by default. All `'use strict';` lines can be removed.

## Implementation strategy

### Phase 1: Convert source files (`src/`)
Convert all files under `src/` from CJS to ESM. This is the bulk of the work but is mechanical.

### Phase 2: Convert entry points (`lib/`)
Convert `lib/core.js`, `lib/core-lite.js`, `lib/index-*.js` to ESM.

### Phase 3: Package.json
Add `"type": "module"` to `package.json`, or use `.mjs` extensions (`.js` with `"type": "module"` is cleaner).

### Phase 4: Build/test infrastructure
Update `tasks/`, `test/`, and `devtools/` scripts as needed.

## What enables tree-shaking after conversion

With ESM, bundlers can:
1. **Drop unused trace types** — if you only `import scatter` and `import bar`, other traces are eliminated
2. **Drop unused components** — if legend is the only component imported, others are dead code
3. **Drop unused functions within modules** — named exports that are never imported get eliminated

This could reduce the lite bundle from 949 KB to potentially 600-700 KB (estimated).

## Risks

- **Circular dependencies**: CJS handles circular deps differently from ESM. Need to audit.
- **Build tool compat**: The existing npm build scripts use CJS assumptions. Need updating.
- **Test infrastructure**: Karma/Jasmine test setup uses CJS. May need migration.
- **Upstream merge conflicts**: Converting to ESM makes future cherry-picks from upstream plotly/plotly.js harder (they're still CJS).

## Decision

Given the risks with upstream merges, consider converting only the critical path files (core, components, traces used by consumer apps) rather than the entire codebase. This gives tree-shaking benefits where they matter most without making the fork unmergeable.
