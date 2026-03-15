# Flush legend toggle rects

## Problem

Legend items have transparent `<rect>` overlays for click/hover detection (`traceToggle`). In horizontal legends, each rect extends by `itemGap / 2` on one side (line ~954 of `draw.js`), leaving a gap of `itemGap / 2` between adjacent items. Hovering through this gap triggers "no item hovered" → flash.

## Root cause

`src/components/legend/draw.js`, around line 953-956:

```js
var w = isEditable ? textGap : (toggleRectWidth || traceWidth);
if(!isVertical && !isFraction) {
    w += itemGap / 2;
}
Drawing.setRect(traceToggle, 0, -h / 2, w, h);
```

The rect starts at x=0 and extends width `w`. Adjacent items are positioned `traceWidth + itemGap` apart. The toggle rect only covers `traceWidth + itemGap/2`, leaving `itemGap/2` uncovered.

## Fix

Extend the toggle rect to cover the full gap. Two approaches:

### A: Extend width (simpler)
```js
if(!isVertical && !isFraction) {
    w += itemGap;  // was itemGap / 2
}
```
This makes each rect overlap slightly with its neighbor, but since they're transparent, overlapping is fine — the topmost one gets the event.

### B: Extend with negative x offset (no overlap)
```js
if(!isVertical && !isFraction) {
    Drawing.setRect(traceToggle, -itemGap / 4, -h / 2, w + itemGap / 2, h);
}
```
Center the gap coverage between adjacent items.

### Vertical legends
For vertical legends, the same issue exists with height gaps. Apply the same fix to the y dimension:
```js
if(isVertical) {
    Drawing.setRect(traceToggle, 0, -h / 2 - vGap / 2, w, h + vGap);
}
```
where `vGap` is the vertical spacing between items.

## Recommendation

Option A is simplest and has no visual impact (transparent rects overlapping is invisible). The hover event will always fire on the topmost rect, which is the correct item.
