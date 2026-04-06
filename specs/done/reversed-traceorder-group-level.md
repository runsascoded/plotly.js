# `traceorder: 'reversed'` only reverses within groups, not group order

## Problem

In `get_legend_data.ts`, `reversed` is applied at line 146:
```ts
if(reversed) legendData[i].reverse();
```

This reverses items WITHIN each legend group. But for stacked bars with no explicit `legendgroup`, each trace is its own group (via `shouldCollapse`). So each "group" has one item, and `.reverse()` is a no-op.

The GROUP-LEVEL ordering is handled by `orderFn1` sort at line 126, which uses `_groupMinRank` and `_preGroupSort`. Neither accounts for `reversed`.

## Effect

Unified hover tooltip for stacked bars shows bottom-of-stack first despite `traceorder: 'reversed'`.

The sort in `hover.ts:1232-1234` correctly reverses entries, but `getLegendData`'s sort at line 126 overrides it.

## Fix

After sorting groups at line 126, reverse the legendData array if `reversed`:

```ts
legendData.sort(orderFn1);
if(reversed) legendData.reverse();
```

This reverses the group-level order, which is what users expect for stacked bar tooltip ordering.

## Note

The `hover.ts:1232-1234` sort can be removed once this is fixed — `getLegendData` would handle it all.
