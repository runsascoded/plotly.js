# Fast initial render

## Problem

Plotly.js has significant latency between `Plotly.newPlot()` and first pixels on screen. For consumer apps (crashes, awair, hub-bound), this means a visible delay on page load where the plot container is empty.

## Root causes

### 1. Synchronous reflow from container measurement
`plotAutoSize()` calls `window.getComputedStyle(gd)` during `supplyDefaults` to get container dimensions. This triggers a synchronous browser reflow before any rendering begins.

### 2. Expensive `supplyDefaults()`
Recursively coerces every attribute on every trace through the schema system. For a plot with 10 traces, this processes hundreds of attributes per trace. Estimated 30-50% of init time.

### 3. Expensive `doCalcdata()`
Trace-specific computation (sorting, binning, position calculation). Scales with data point count. 20-40% of init time.

### 4. Margin iteration with DOM measurement
`marginPushers()` calls `drawing.bBox()` which calls `getBoundingClientRect()` to measure legend/title/annotation text. Multiple iterations possible if margins change. 15-25% of init time.

## Fixes

### Fix 1: Explicit dimensions from pltly (no plotly.js change needed)

**Where:** pltly's React wrapper
**What:** Measure container with `useLayoutEffect`, pass `width`/`height` in layout
**Impact:** Eliminates the `getComputedStyle()` reflow in `plotAutoSize()`

```js
// In pltly's usePlot hook:
const ref = useRef();
const [dims, setDims] = useState(null);

useLayoutEffect(() => {
    if (ref.current) {
        setDims({ width: ref.current.clientWidth, height: ref.current.clientHeight });
    }
}, []);

// Pass to Plotly:
Plotly.react(ref.current, data, { ...layout, ...dims });
```

### Fix 2: Two-phase render

**Where:** `src/plot_api/plot_api.js` (`_doPlot` function)
**What:** Split rendering into "fast first paint" and "precise layout":

Phase 1 (synchronous, before first rAF):
- `supplyDefaults()` (required — determines what to draw)
- `doCalcdata()` (required — computes positions)
- `drawData()` with estimated margins (skip `marginPushers()`)

Phase 2 (in `requestAnimationFrame`):
- `marginPushers()` — precise text measurement
- Re-adjust layout if margins changed
- `drawAxes()` with final positions

**Impact:** First pixels appear ~50% faster. Possible sub-frame layout shift for legend/title positioning, but traces render immediately.

**Risk:** Layout shift is visible if margins are significantly wrong. Mitigate by using reasonable default margins (plotly already has defaults: `{l: 80, r: 80, t: 100, b: 80}`).

### Fix 3: Batch `bBox()` measurements

**Where:** `src/components/drawing/index.js` (`bBox` function)
**What:** Instead of calling `getBoundingClientRect()` per element, batch all text measurement:

1. Append all text elements to the off-screen tester SVG at once
2. Force one reflow
3. Read all measurements at once
4. Remove all test elements

**Impact:** Reduces reflows from O(N) to O(1) during margin calculation.

## Implementation order

1. Fix 1 (pltly change, spec out separately)
2. Fix 3 (isolated change, low risk)
3. Fix 2 (most impactful but highest risk)

## Measuring improvement

Use `performance.mark()` / `performance.measure()` around key phases:
- `plotly-supplyDefaults`
- `plotly-calcdata`
- `plotly-marginPushers`
- `plotly-drawData`
- `plotly-total` (newPlot entry → promise resolution)

Add these in the fork so consumer apps can profile with DevTools.
