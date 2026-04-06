# `legend.traceorder` ignored when `showlegend: false`

## Problem

When `showlegend: false`, Plotly skips legend defaults entirely — `_fullLayout.legend` is not populated. This means `legend.traceorder: 'reversed'` has no effect on unified hover tooltip ordering.

The recently-added feature to honor `traceorder` for unified hover only works when `showlegend: true`.

## Expected

`legend.traceorder` should be processed and applied to unified hover ordering even when `showlegend: false`. Consumers using custom legends (with `showlegend: false`) still want reversed hover order.

## Fix

In the legend defaults function, process `traceorder` even when `showlegend` is false. Or: check `layout.legend.traceorder` directly in the unified hover code path without requiring `_fullLayout.legend`.
