# Inconsistent unified hover tooltip ordering

## Problem

Unified hover entries arrive in inconsistent order depending on whether the plot has `showlegend: true` or `false`:

- **Plot with `showlegend: false`** (custom legend): hover entries arrive in `groupedHoverData` already reversed (top-of-stack first). `getLegendData.reverse()` then double-reverses → wrong order.
- **Plot with `showlegend: true`**: hover entries arrive in original trace array order (bottom-of-stack first). `getLegendData.reverse()` correctly reverses → right order.
- But for CrashPlot (`showlegend: true`): the order is scrambled (Fatal, Prop. Damage, Injury instead of Prop. Damage, Injury, Fatal).

## Debug evidence (Plot1, showlegend: false)

```
BEFORE_REVERSE: Total,Passengers,Pedestrians,Drivers,Cyclists  ← already reversed
AFTER_REVERSE:  Cyclists,Drivers,Pedestrians,Passengers,Total  ← double-reversed, WRONG
```

## Root cause

The `groupedHoverData` order depends on the plot's full layout processing. When `showlegend: false`, the trace iteration order during hover data collection may differ from when `showlegend: true`. The hover code in `hover.ts` builds entries in whatever order `hoverData` arrives, which depends on `_hoverPoints` in `plot_api.ts`.

## Fix needed

Normalize the hover entry order BEFORE passing to `getLegendData`. The entries should always arrive in trace array order (bottom-of-stack first), and `getLegendData.reverse()` should be the sole reversal. Find where `groupedHoverData` gets pre-reversed and prevent that.
