# Configurable legend item spacing

## Problem

Two hardcoded values in legend layout prevent consumers from controlling spacing:

1. **`itemGap`** (5px, `constants.ts:11`) controls both the gap between legend items AND the internal padding around the symbol. It's used everywhere: horizontal inter-item spacing, vertical spacing, symbol-to-text offset (`textGap = indentation + itemwidth + itemGap * 2`). Not configurable.

2. **`itemwidth`** (symbol area width) has `min: 30` (`attributes.ts:136`). For simple color swatches (bars, scatter), 30px is excessive — the swatch itself is ~15px wide, the rest is dead space between swatch and text.

## Proposed changes

### 1. New attribute: `legend.itemgap`

Expose the existing `itemGap` constant as a configurable attribute.

```ts
// attributes.ts
itemgap: {
    valType: 'number',
    min: 0,
    dflt: 5,
    editType: 'legend',
    description: 'Sets the gap (in px) between legend items in both x and y directions.'
},
```

**Implementation** (`draw.ts`): Replace all `constants.itemGap` / local `itemGap` references with `legendObj.itemgap`. The constant stays as fallback default.

Affected lines in `draw.ts`:
- Line 546: `textGap = legendObj.indentation + legendObj.itemwidth + legendObj.itemgap * 2`
- Line 764: same
- Line 881: one-row check uses `legendObj.itemgap`
- Line 893: `next += legendObj.itemgap`
- Line 896: wrap check
- Line 906: y-position
- Line 909: `rowWidth = offsetX + w + legendObj.itemgap`

### 2. Lower `itemwidth` minimum to 10

Change `min: 30` to `min: 10` in `attributes.ts:136`. The default stays 30 for backwards compatibility, but consumers with simple swatches can set e.g. `itemwidth: 15` to tighten the swatch-to-text gap.

The 30px minimum was likely chosen for line+marker symbols that need horizontal space to draw a line segment. For bar/scatter-only plots, 15-20px is plenty.

### 3. (Optional) New attribute: `legend.textgap`

For finer control, expose the symbol-to-text gap separately from inter-item gap:

```ts
textgap: {
    valType: 'number',
    min: 0,
    editType: 'legend',
    description: 'Sets the gap (in px) between the legend symbol and the item text. ' +
        'Defaults to itemgap * 2 if not set.'
},
```

Then `draw.ts` line 546 becomes:
```ts
const textGap = legendObj.indentation + legendObj.itemwidth + (legendObj.textgap ?? legendObj.itemgap * 2);
```

This is optional — `itemgap` + `itemwidth` together give enough control for most cases.

## Files to change

| File | Change |
|------|--------|
| `src/components/legend/attributes.ts` | Add `itemgap` attr, lower `itemwidth` min to 10 |
| `src/components/legend/defaults.ts` | `coerce('itemgap')` |
| `src/components/legend/draw.ts` | Replace `constants.itemGap` with `legendObj.itemgap` everywhere |
| `src/components/legend/constants.ts` | Keep `itemGap: 5` as internal default (used before legend is initialized) |

## Backwards compatibility

All changes are additive with the same defaults. `itemgap: 5` and `itemwidth: 30` match current behavior exactly.
