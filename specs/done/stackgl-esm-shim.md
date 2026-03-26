# stackgl_modules: ESM re-export shim

## Problem

`stackgl_modules/index.js` is a webpack-bundled CJS blob (40K lines, `module.exports = __webpack_exports__`). The ESM-converted source uses named imports:

```js
import { gl_error3d as createErrorBars } from '../../../stackgl_modules/index.js';
```

Vite dev mode can't extract named exports from CJS when it's not pre-bundled (local symlink via `pds l`, or excluded from optimizeDeps).

## Quick fix

Add `stackgl_modules/esm.js` that re-exports from the CJS bundle:

```js
import mod from './index.js';
export const {
    alpha_shape,
    convex_hull,
    delaunay_triangulate,
    gl_cone3d,
    gl_error3d,
    gl_line3d,
    gl_mesh3d,
    gl_plot3d,
    gl_scatter3d,
    gl_streamtube3d,
    gl_surface3d,
    ndarray,
    ndarray_linear_interpolate,
} = mod;
```

Then update all `import { ... } from '../../../stackgl_modules/index.js'` to `from '../../../stackgl_modules/esm.js'`.

## Why this works

`import mod from './index.js'` (default import from CJS) works everywhere — Vite, Node, Rollup all handle CJS default interop. The named re-exports then work as standard ESM.

## Better long-term fix

Rebuild `stackgl_modules` with webpack `output.library.type: 'module'` to produce native ESM, or replace with direct imports of the individual packages if they have ESM builds.
