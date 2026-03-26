# ESM conversion: CSS imports

## Problem

The CJS→ESM converter blindly converted CSS `require()` calls to `import` statements:

```js
// Before (CJS, worked fine):
require('maplibre-gl/dist/maplibre-gl.css');

// After (broken ESM):
import _req0 from 'maplibre-gl/dist/maplibre-gl.css';
```

Rollup fails: `"default" is not exported by "maplibre-gl/dist/maplibre-gl.css"`.

In `src/registry.js` line 10. The CSS was loaded as a side-effect `require()` (no return value used) — it injects styles into the page.

## Fix

CSS side-effect imports in ESM should be bare imports (no binding):

```js
import 'maplibre-gl/dist/maplibre-gl.css';
```

Or, since plotly.js manually extracts CSS rules from the stylesheet at runtime (lines 151-159 in registry.js), the CSS import may not be needed at all — check if the runtime code already handles loading the styles. If so, remove the import entirely.

Audit all `.css` imports in the converted source for the same pattern.
