# Automated performance testing harness

## Problem

No way to automatically measure and assert on plotly.js rendering performance and bundle transfer size. Manual profiling in DevTools doesn't catch regressions and isn't repeatable.

## Goals

1. **Automated**: runs via `npm run perf`, no manual browser interaction
2. **Measures real E2E wall time**: from page request to interactive plot
3. **Measures transfer size**: total bytes transferred (JS, CSS, etc.)
4. **Measures rendering phases**: using the `performance.measure()` instrumentation in `_doPlot`
5. **Asserts on thresholds**: fails if transfer size or render time exceeds limits
6. **Reports results**: structured JSON output + human-readable summary

## Architecture

```
perf/
├── server.mjs          # Serves demo page + plotly bundle (esbuild on-the-fly)
├── demo.html           # Page with representative plots, reports timing via window.__PLOTLY_PERF__
├── plots.js            # Plot definitions (data + layout for each test case)
├── bench.mjs           # Playwright script: loads demo, collects metrics, asserts
├── thresholds.json     # Assertion thresholds (max transfer size, max render time)
└── results/            # Git-ignored output directory for JSON reports
```

### Flow

1. `bench.mjs` starts `server.mjs` as a child process (serves on a random port)
2. `bench.mjs` launches Playwright (chromium, headless)
3. For each plot config in `plots.js`:
   a. Navigate to `demo.html?plot=<name>`
   b. Collect network transfer sizes via `page.on('response')`
   c. Wait for `window.__PLOTLY_PERF__` to be populated (set by demo page after plot resolves)
   d. Read `performance.getEntriesByType('measure')` from the page
   e. Record wall time from navigation start to plot completion
4. Compare results against `thresholds.json`
5. Output JSON report + console summary
6. Exit non-zero if any threshold exceeded

### Demo page (`demo.html`)

Minimal HTML that:
- Loads plotly.js from the local server (the bundle we're testing)
- Reads `?plot=<name>` from URL to select which plot to render
- Calls `Plotly.newPlot()` with the selected config
- On completion, writes timing results to `window.__PLOTLY_PERF__`:

```js
window.__PLOTLY_PERF__ = {
    plot: name,
    measures: performance.getEntriesByType('measure')
        .filter(e => e.name.startsWith('plotly-'))
        .map(e => ({ name: e.name, duration: e.duration })),
    timestamp: Date.now(),
};
```

### Thresholds (`thresholds.json`)

```json
{
    "transferSize": {
        "minimal": { "max_kb": 1200 },
        "basic": { "max_kb": 1500 }
    },
    "renderTime": {
        "bar-1k": { "max_ms": 500 },
        "scatter-10k": { "max_ms": 800 }
    }
}
```

Thresholds are generous initially — the point is catching regressions, not achieving targets.

### Plot definitions (`plots.js`)

Representative of consumer app usage:
- `bar-1k`: 5 bar traces, 200 points each
- `scatter-10k`: 3 scatter traces, 3000+ points each
- `dual-axis`: scatter on y1 + bar on y2 (common in crashes/awair)
- `many-traces`: 20 traces with legend (tests legend rendering overhead)

### Bundle variants

Test with both `minimal` and `basic` bundles to compare:
- Transfer size difference
- `supplyDefaults` time difference (fewer registered components)

## Implementation notes

- Use `@playwright/test` for the browser automation (it has built-in assertions)
- Use esbuild to bundle on-the-fly from `lib/index-minimal.js` or `lib/index-basic.js`
- The server should set proper `Content-Length` headers for accurate transfer size measurement
- Run esbuild once at server start, not per request
- `results/` is gitignored; CI can upload as artifacts if desired

## Future

- Run in CI on push to `main`, store results as GHA artifacts
- Compare against previous run's results (perf regression detection)
- Add visual report (HTML page with charts of timing breakdown)
