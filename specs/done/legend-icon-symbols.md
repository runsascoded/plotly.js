# Custom legend symbols (icons)

## Problem

Consumer apps build entirely separate "custom" React legend UIs just to show SVG icons (pedestrian, cyclist, driver, etc.) instead of plotly's default colored squares. This duplicates 95% of the legend interaction logic (hover, pin, fade, click-to-solo) and creates a parallel code path that's harder to maintain and misses plotly-level fixes (like flush toggle rects).

## Solution

Added `legendsymbol.path` trace attribute — a custom SVG path string that replaces the default legend symbol.

### Usage

```js
{
    type: 'bar',
    name: 'Pedestrians',
    legendsymbol: {
        path: 'M63.3,68.2l-7,11.2l5.4,14.7...',
    },
}
```

The path is rendered centered in the legend item area (using the same `centerTransform` as built-in symbols like bars), filled with the trace color (`marker.color` or `line.color`), with no stroke.

### Architecture notes

**Legend symbol rendering pipeline** (`src/components/legend/style.js`):

The main `style()` function creates three sibling `<g>` layers inside each trace's legend item:
- `g.legendfill` — fill areas (beneath)
- `g.legendlines` — line strokes
- `g.legendsymbols > g.legendpoints` — marker symbols (on top)

Then 11 type-specific style functions run in sequence (`.each(styleBars)`, `.each(styleLines)`, etc.), each conditionally adding SVG elements to these layers based on trace type.

**Custom symbol strategy**: `styleCustomSymbol` runs *last* in the chain. When `legendsymbol.path` is set, it:
1. Removes all elements created by the default style functions (from all three layers)
2. Renders the custom SVG `<path>` in `legendpoints` with `centerTransform`
3. Fills with the trace color

Running last is simpler than modifying every existing style function to check for custom symbols.

**Key coordinate details**:
- `centerPos = (itemWidth + itemGap * 2) / 2` ≈ 20px (default `itemWidth=30`, `itemGap=5`)
- `centerTransform = translate(centerPos, 0)` — centers the symbol in the legend item area
- Built-in symbols use coordinates in a ~12×12 box centered at origin (e.g. bars: `M6,6H-6V-6H6Z`)
- Custom paths should use a similar scale, or consumer apps can adjust via `legend.itemwidth`

### Files changed

| File | Change |
|------|--------|
| `src/plots/attributes.js` | Added `legendsymbol.path` trace attribute |
| `src/components/legend/defaults.js` | Coerce `legendsymbol.path` |
| `src/components/legend/style.js` | `styleCustomSymbol` — renders custom path, removes defaults |

### Interaction

No changes needed — the existing toggle rect, hover detection, and click handling all work on the `<g class="traces">` container, not on the symbol specifically. Custom symbols are purely a rendering change.

### Future work

- `legendsymbol.src` — URL to an SVG file (not implemented yet)
- Auto-scaling via `viewBox` for paths in arbitrary coordinate systems
- `legendsymbol.color` override (currently always uses trace color)
