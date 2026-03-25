# ESM Conversion

## Problem

Plotly.js uses CommonJS (`require()`/`module.exports`) throughout its source files. This causes:

1. **No tree-shaking** — bundlers can only eliminate unused code from ES modules. Even the lite bundle includes unused code paths.
2. **Separate `plotly.js-dist-min` package** — consumers can't bundle from source efficiently, so pre-built min bundles exist as a separate npm package. This creates a confusing dep story and cross-package resolution issues.
3. **Dev/build divergence** — Vite pre-bundles CJS deps differently in dev vs build mode, causing bugs where local dev works but production doesn't (e.g. touch-click fix present in dev but not prod).
4. **`pds` complexity** — `pds l` (local symlink) vs `pds g` (GH dist) behave differently because CJS resolution differs between symlinked source and installed dist bundles.

## What ESM conversion eliminates

Beyond tree-shaking, converting to ESM removes an entire class of build tooling workarounds:

- **`plotly.js-dist-min` npm package** — consumers import `plotly.js` or `plotly.js/lite` directly; bundlers tree-shake from source
- **Vite `resolve.alias` hacks** — no need to alias `plotly.js-dist-min` → fork's dist file
- **`pdsPlugin({ extra: ['plotly.js-dist-min'] })` workaround** — the `extra` option was specifically for this cross-package mapping
- **Pre-built `dist/*.min.js` bundles** (for bundler consumers) — bundlers produce better output from ESM source than from re-bundling a pre-minified CJS blob. (Keep dist bundles for CDN/script-tag usage only.)
- **`optimizeDeps` configuration** — Vite's CJS pre-bundling is the source of dev/build divergence; ESM deps skip pre-bundling entirely
- **`pds l` / `pds g` divergence** — with ESM source, local symlink and GH dist behave identically

## Scope

- ~971 JS files in `src/` and `lib/`
- ~3900 `require()` calls
- ~890 `module.exports` assignments
- Zero conditional/dynamic requires (all top-level) — fully mechanical conversion

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
Add `"type": "module"` to `package.json`. Update `exports` map:
```json
{
  "type": "module",
  "exports": {
    ".": "./lib/index.js",
    "./lite": "./lib/index-lite.js",
    "./basic": "./lib/index-basic.js",
    ...
  }
}
```

### Phase 4: Build/test infrastructure
Update `tasks/`, `test/`, and `devtools/` scripts as needed.

### Phase 5: Downstream updates
After ESM conversion ships:
- **pltly**: change `import('plotly.js-dist-min')` → `import('plotly.js')` (or `plotly.js/lite`). Let consumer's bundler tree-shake.
- **Consumer apps** (hudson-transit etc.): remove `plotly.js-dist-min` dep, vite alias hack, `pdsPlugin` extra config. Just `pds [l|g] plotly.js` works.

## What enables tree-shaking after conversion

With ESM, bundlers can:
1. **Drop unused trace types** — import only scatter + bar, others eliminated
2. **Drop unused components** — unused legend, rangeslider, etc. are dead code
3. **Drop unused functions within modules** — named exports that are never imported get eliminated

## Risks

- **Circular dependencies**: CJS handles circular deps differently from ESM. Need to audit and break cycles.
- **Build tool compat**: The existing npm build scripts use CJS assumptions. Need updating.
- **Test infrastructure**: Karma/Jasmine test setup uses CJS. May need migration.
- **Upstream merge conflicts**: Converting to ESM makes future cherry-picks from upstream plotly/plotly.js harder. Acceptable given low upstream velocity and existing fork divergence.
