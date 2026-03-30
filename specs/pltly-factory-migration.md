# Migrate pltly to use `createPlotly()` factory

## Context

The plotly.js fork now has a tree-shakeable `createPlotly()` factory at `lib/factory.js`. Consumer apps that use it get a 35% bundle size reduction vs upstream plotly.js-basic-dist (707 KB vs 1,089 KB minified).

pltly (the React wrapper) currently imports from `plotly.js/lib/index-lite.js`, which registers a fixed set of components. Switching to the factory lets pltly and its consumers choose exactly which traces and components they need.

## Current pltly architecture

```js
// pltly imports the full lite bundle
import Plotly from 'plotly.js/lib/index-lite.js';

// Then wraps it with React hooks
export function Plot({ data, layout, ...props }) {
    // Uses Plotly.newPlot, Plotly.react, etc.
}
```

## Target architecture

```js
// pltly imports from the factory
import { createPlotly } from 'plotly.js/lib/factory.js';
import scatter from 'plotly.js/src/traces/scatter/index.js';
import bar from 'plotly.js/src/traces/bar/index.js';
import legend from 'plotly.js/src/components/legend/index.js';
import modebar from 'plotly.js/src/components/modebar/index.js';

// Create a default Plotly instance with common traces
const Plotly = createPlotly({
    traces: [scatter, bar],
    components: [legend, modebar],
});

export { Plotly, createPlotly };
export { default as scatter } from 'plotly.js/src/traces/scatter/index.js';
export { default as bar } from 'plotly.js/src/traces/bar/index.js';
// ... etc for consumers who want to build custom instances
```

Consumer apps can either:
1. Use pltly's default Plotly (scatter+bar+legend+modebar) — same as today
2. Import `createPlotly` and build a custom instance with only what they need

## Bundle size impact

| Configuration | Size (min) | vs upstream basic |
|---|---|---|
| upstream basic (pre-built) | 1,089 KB | — |
| fork lite (current pltly) | 828 KB | -24% |
| factory (scatter+bar+legend) | 707 KB | -35% |
| factory (scatter+bar+legend+modebar) | ~740 KB | -32% |

## Migration steps

1. Add `plotly.js/lib/factory.js` to pltly's imports
2. Create default Plotly instance with `createPlotly()`
3. Re-export factory + trace/component modules for consumer flexibility
4. Update pltly's Plot component to accept optional custom Plotly instance
5. Update consumer apps (HT, crashes, awair, etc.) to import from pltly

## Notes

- The factory always registers `colorscale` and `fx` (essential for any plot)
- `modebar` is optional — apps using `displayModeBar: false` can skip it
- `shapes`, `errorbars`, `annotations` are optional — register only if needed
- Consumer apps using `pds l` (local ESM) get the factory automatically via pltly
