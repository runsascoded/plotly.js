# Reversed unified hover order for stacked bars

## Problem

With `hovermode: 'x unified'` on stacked bar charts, the tooltip lists traces in data array order (bottom of stack first). Users expect top-of-stack first, matching the visual reading order.

## Current behavior

Stack (bottom→top): Cyclists → Drivers → Pedestrians → Passengers
Tooltip (top→bottom): Cyclists → Drivers → Pedestrians → Passengers

## Expected behavior

Tooltip should match visual top-to-bottom: Passengers → Pedestrians → Drivers → Cyclists

## Attempted workarounds

- `legend.traceorder: 'reversed'` — only affects legend, not unified hover
- Reversing trace array — also reverses stack order
- Custom `hovertemplate` on single trace with `customdata` — loses native color swatches

## Proposed fix

Add `hoverlabel.traceorder: 'reversed'` (or similar) that reverses the order of entries in unified hover tooltips without affecting stack/legend order.

Alternatively, honor `legend.traceorder` for unified hover as well.
