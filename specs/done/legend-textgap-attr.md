# Add `legend.textgap` to decouple swatch-to-text gap from inter-item gap

## Problem

`legend.itemgap` (added in `9d9682927`) controls both:
1. The gap between legend items (inter-item spacing)
2. The padding around the symbol (swatch-to-text gap via `textGap = indentation + itemwidth + itemgap * 2`)

This makes it impossible to have tight swatch-to-text spacing while keeping enough inter-item space to accommodate bold text without crowding.

Example: `itemgap: 3` gives tight swatch-to-text (good) but items are jammed together (bad). `itemgap: 10` gives good inter-item spacing but excessive swatch-to-text gap.

## Proposed change

### New attribute: `legend.textgap`

Controls the padding between the symbol and the text label, independently of `itemgap`.

```ts
// attributes.ts
textgap: {
    valType: 'number',
    min: 0,
    editType: 'legend',
    description: 'Sets the gap (in px) between the legend symbol and the item text. ' +
        'Defaults to itemgap * 2 if not set.'
},
```

### Implementation in `draw.ts`

Every place that computes `textGap` (lines ~546, ~764):

```ts
// Before:
const gap = legendObj.itemgap ?? constants.itemGap;
const textGap = legendObj.indentation + legendObj.itemwidth + gap * 2;

// After:
const gap = legendObj.itemgap ?? constants.itemGap;
const symTextGap = legendObj.textgap ?? gap * 2;
const textGap = legendObj.indentation + legendObj.itemwidth + symTextGap;
```

Also in `computeTextDimensions` (~line 698):
```ts
const gap2 = legendObj.itemgap ?? constants.itemGap;
let x = gap2 * 2 + legendObj.indentation + legendObj.itemwidth;
// becomes:
const symTextGap2 = legendObj.textgap ?? gap2 * 2;
let x = symTextGap2 + legendObj.indentation + legendObj.itemwidth;
```

## Files to change

| File | Change |
|------|--------|
| `src/components/legend/attributes.ts` | Add `textgap` attr |
| `src/components/legend/defaults.ts` | `coerce('textgap')` |
| `src/components/legend/draw.ts` | Use `legendObj.textgap ?? itemgap * 2` for symbol-to-text padding |

## Usage example

```js
layout: {
    legend: {
        itemwidth: 15,    // tight symbol area
        textgap: 4,       // small swatch-to-text padding
        itemgap: 10,      // generous inter-item gap (room for bold)
    }
}
```

## Backwards compatibility

Default is `itemgap * 2` (same as current behavior). Only affects layout when explicitly set.
