# Custom legend symbols (icons)

## Problem

Consumer apps build entirely separate "custom" React legend UIs just to show SVG icons (pedestrian, cyclist, driver, etc.) instead of plotly's default colored squares. This duplicates 95% of the legend interaction logic (hover, pin, fade, click-to-solo) and creates a parallel code path that's harder to maintain and misses plotly-level fixes (like flush toggle rects).

## Current state

Plotly's legend draws a colored symbol per trace: a line for scatter, a rectangle for bar, etc. The symbol type is derived from the trace type and can't be customized.

Consumer apps that want icons:
1. Hide plotly's native legend (`showlegend: false`)
2. Build a React component with icon SVGs
3. Re-implement hover/click/pin behavior in React
4. Manually sync trace visibility/opacity with legend state

This is ~200 lines of duplicated interaction code per app.

## Proposal

Add a `legend.symbol` trace attribute that accepts a custom SVG path or reference:

```js
{
    type: 'bar',
    name: 'Pedestrians',
    legendsymbol: {
        // Option A: SVG path string (like marker.symbol but for legend)
        path: 'M63.3,68.2l-7,11.2l5.4,14.7...',
        // Option B: URL to SVG
        src: '/icons/pedestrian.svg',
    },
}
```

### Rendering

In `src/components/legend/style.js`, when `legendsymbol` is present:
- Replace the default colored rectangle/line with the custom SVG path
- Apply the trace color as `fill`
- Scale to fit the legend item height

### Interaction

No changes needed — the existing toggle rect, hover detection, and click handling all work on the `<g class="traces">` container, not on the symbol specifically. Custom symbols are purely a rendering change.

### Sizing

The symbol should respect `legend.itemwidth` for width, and auto-scale height to match the text. Default viewBox should be configurable per symbol.

## Why plotly.js (not pltly)

The symbol is a rendering concern — it belongs where SVG elements are created. pltly handles React-level interaction (hooks, state), not SVG rendering.

## Impact

With this feature:
- Consumer apps can delete their custom React legends (~200 lines each)
- pltly's `usePinnedLegend` works for ALL legends (icons or default)
- Legend fixes (flush hit areas, z-order) apply universally
- One code path for hover/pin/fade across all trace types

## Files to change

| File | Change |
|------|--------|
| `src/components/legend/attributes.js` | Add `legendsymbol` attribute |
| `src/components/legend/style.js` | Render custom SVG path when present |
| `src/components/legend/draw.js` | Pass symbol config to style |
