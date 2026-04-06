# Unified hover mock legend loses `traceorder` during defaults

## Problem

`hover.ts:1188` passes `traceorder: fullLayout.legend.traceorder` (e.g. `"grouped+reversed"`) into the mock layout input for unified hover. But after `legendSupplyDefaults` processes it, `mockLayoutOut.legend.traceorder` is `"normal"`.

## Root cause

`legendSupplyDefaults` iterates `gd._fullData` to detect stacked bars and compute `defaultOrder`. But traces with `showlegend: false` are skipped at line 100 (`if(trace.showlegend)`). Since our bar traces have `showlegend: false` (custom icon legend), the stacked bar detection fails, and `defaultOrder` stays `'normal'`.

The `coerce` at line 211 should use the INPUT value from `mockLayoutIn`, but the mock legend defaults path at line 126-134 may set `showLegend = false` (because no traces have `showlegend: true`), triggering the early return at line 136. The early return at line 138 coerces `traceorder` with `defaultOrder` (which is `'normal'`), overriding the explicit `"grouped+reversed"` from the input.

Wait — actually line 138 calls `coerce('traceorder', defaultOrder)` which reads from `layoutIn.legend.traceorder` first. If that value is valid, it should be used regardless of `defaultOrder`. So the coerce should return `"grouped+reversed"`.

But the LOG shows `traceorder: "normal"` — meaning the coerce is NOT reading from `layoutIn`. This suggests `mockLayoutIn.legend` might not be structured correctly for the coerce function, or the early return prevents it.

## Debug evidence

From e2e test console capture:
```
GETLEGENDDATA: {"reversed":false,"traceorder":"normal","groupCount":1,"names":["Cyclists"]}
```

`fullLayout.legend.traceorder` is `"grouped+reversed"` (confirmed separately), but the mock gets `"normal"`.

## Fix

Option 1: In the hover code, bypass `legendSupplyDefaults` for traceorder — set it directly on `mockLayoutOut.legend`:
```ts
legendSupplyDefaults(mockLayoutIn, mockLayoutOut, gd._fullData);
const mockLegend = mockLayoutOut.legend;
// Force traceorder from fullLayout (defaults may override it)
if (fullLayout.legend?.traceorder) mockLegend.traceorder = fullLayout.legend.traceorder;
```

Option 2: Fix `legendSupplyDefaults` to not skip the input traceorder value when traces have `showlegend: false`.

Option 3: In the stacked bar detection (line 114-117), also check traces in the `_inHover` path (where all traces should be considered regardless of `showlegend`).
