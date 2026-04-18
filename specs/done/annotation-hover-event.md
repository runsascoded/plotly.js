# `plotly_hoverannotation` / `plotly_unhoverannotation` events

## Problem

Annotations with `captureevents: true` fire `plotly_clickannotation` on
click, but there is no hover equivalent. Consumers who want to show a
tooltip, expand a details panel, or highlight related data when the user
hovers an in-plot annotation icon (e.g. a ⚠ data-quality warning) have
no Plotly-native mechanism to detect it.

The only workaround is CSS-level hover detection on the SVG `.annotation`
group, which is fragile (no event data, no annotation index, breaks
across Plotly re-renders that recreate SVG elements).

## Proposal

Add two new events, mirroring the existing click event:

### `plotly_hoverannotation`

Fired when the pointer enters an annotation with `captureevents: true`.

```js
plotDiv.on('plotly_hoverannotation', function(event) {
    // event.index — annotation index in layout.annotations
    // event.annotation — the annotation object from layout
    // event.fullAnnotation — the full (computed) annotation object
})
```

### `plotly_unhoverannotation`

Fired when the pointer leaves an annotation with `captureevents: true`.

```js
plotDiv.on('plotly_unhoverannotation', function(event) {
    // same shape as hoverannotation
})
```

### Implementation

In `src/components/annotations/draw.ts` (where click handling is set up
for `captureevents` annotations):

1. The click handler is attached to `annTextGroupInner`, a `<g>` that
   wraps the annotation's background `<rect>` and text (its pointer
   events are gated on `textEvents = captureevents || editable`). Add
   `mouseenter` / `mouseleave` handlers to the same element.

2. Fire `plotly_hoverannotation` on mouseenter, `plotly_unhoverannotation`
   on mouseleave, gated on `options.captureevents` (same payload shape
   as `plotly_clickannotation`).

3. For touch devices: no hover equivalent needed (touch users tap →
   `plotly_clickannotation` is sufficient).

4. Update `captureevents` attribute description to mention the new events.

### Cursor

When `captureevents: true`, the capture rect already sets
`cursor: pointer`. On hover, optionally add a subtle visual cue (e.g.
slight opacity change on the annotation text). This is opt-in via a new
annotation attribute `hoverlabel` or similar — out of scope for this
initial spec, but the event mechanism enables consumers to implement
their own visual feedback.

## Use case

The `nj-crashes` project places ⚠ icons on plots to flag data-quality
issues (e.g. incomplete UCR reporting in a specific year). Hovering the
icon should expand an annotation details panel below the plot — same
behavior as hovering the affected bar. Currently only click works (and
even that is broken by pltly's `removeAllListeners` — separate fix).

## Test plan

- Add test in `test/jasmine/tests/annotation_test.js`:
  1. Create plot with annotation `captureevents: true`
  2. Simulate mouseenter on the capture rect
  3. Assert `plotly_hoverannotation` fires with correct `index`
  4. Simulate mouseleave
  5. Assert `plotly_unhoverannotation` fires
  6. Annotation without `captureevents` → no events

## Backward compatibility

New events only — no existing behavior changes. Annotations without
`captureevents: true` are unaffected.
