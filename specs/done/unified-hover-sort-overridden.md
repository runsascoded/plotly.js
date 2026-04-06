# Unified hover sort overridden by getLegendData

## Problem

The `traceorder: 'reversed'` sort in `hover.ts:1232-1234` is overridden by `getLegendData.ts:126` when `legendDraw` is called at `hover.ts:1242`.

Flow:
1. `hover.ts:1232` — sorts `mockLegend.entries` by reversed trace index ✓
2. `hover.ts:1242` — calls `legendDraw(gd, mockLegend)` 
3. `legendDraw` calls `getLegendData` which re-sorts entries using `orderFn1`/`orderFn2`
4. The re-sort restores original trace index order, undoing the reversal

## Fix

Either:
1. Skip `getLegendData`'s sort when `_inHover` is true (the entries are already sorted)
2. Move the reversal sort inside `getLegendData` so it happens after `orderFn1`/`orderFn2`
3. Apply the reversal after `legendDraw` by reversing the rendered SVG elements

Option 2 is cleanest — `getLegendData` already reads `traceorder`, so it should apply the reversal there instead of in `hover.ts`.
