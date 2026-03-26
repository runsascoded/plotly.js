# Dist branch: missing source directories

## Problem

When bundling from ESM source (the new default), Rollup/Vite follows import chains into `src/` subdirectories. Some source files reference directories that aren't included in the dist branch:

```
Could not resolve "../../../stackgl_modules/index.js"
from "plotly.js/src/traces/surface/convert.js"
```

`stackgl_modules/` lives at the repo root and is needed by 3D/WebGL traces (surface, gl3d, mesh3d, etc.).

## Fix

The `npm-dist` workflow needs to include all directories that `src/` and `lib/` reference:

- `stackgl_modules/` — WebGL/stackgl shims used by 3D traces
- Any other root-level dirs imported by source (audit `src/` for `../../../` imports)

In the dist branch build step, copy these alongside `lib/` and `src/`.

## Workaround

Consumers that don't need 3D traces can import `plotly.js/lite` or `plotly.js/basic` to avoid the missing dependency. But the full `plotly.js` entry point should work from the dist branch.
