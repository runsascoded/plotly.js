# Include extra bundles in dist branch

## Problem

The `npm-dist` GHA only includes the main bundle (`plotly.js`, `plotly.min.js`) and strict variant on the dist branch. The extra bundles (`plotly-basic`, `plotly-cartesian`, etc.) are not built or included.

Consumer projects that want the basic bundle (1.1MB vs 4.8MB full) can't use `plotly.js/dist/plotly-basic.min.js` from the GH dist — it doesn't exist.

## Current CI

The `build-dist` workflow runs:
```
npm run build
```

Which runs the full pipeline: `empty-dist → preprocess → find-strings → bundle → extra-bundles → locales → schema → stats`.

However, the `npm-dist` action only copies certain files to the dist branch. It likely only includes `dist/plotly.js`, `dist/plotly.min.js`, and `dist/plotly-strict.*`.

## Fix

Ensure the dist branch includes ALL bundles from `dist/`:
- `plotly-basic.js` / `plotly-basic.min.js`
- `plotly-cartesian.js` / `plotly-cartesian.min.js`
- `plotly-finance.js` / `plotly-finance.min.js`
- `plotly-geo.js` / `plotly-geo.min.js`
- `plotly-gl2d.js` / `plotly-gl2d.min.js`
- `plotly-gl3d.js` / `plotly-gl3d.min.js`
- `plotly-map.js` / `plotly-map.min.js`
- `plotly-mapbox.js` / `plotly-mapbox.min.js`
- `plotly-strict.js` / `plotly-strict.min.js` (already included)

Check the `npm-dist` config or the workflow file to see if there's a file filter excluding the extras.

## Impact

Once fixed, consumer projects can use:
```ts
import("plotly.js/dist/plotly-basic.min.js")  // 1.1MB instead of 4.8MB
```

The `exports` map already allows `"./dist/*"` so no package.json changes needed.

## Files to check

| File | What to look for |
|------|-----------------|
| `.github/workflows/build-dist.yml` | Does it filter which dist files to include? |
| `npm-dist` config (if any) | File patterns for the dist branch |
