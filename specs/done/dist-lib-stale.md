# Dist branch: stale/broken `lib/` entry files

## Problem

`lib/index-basic.js` on the dist branch has:
1. Wrong content — contains 48 trace registrations (full bundle) instead of 3 (bar + pie + calendars)
2. Broken variable names — uses `_req0`, `_req1`, etc. instead of the actual import names (`bar_trace`, `pie_trace`, etc.)

This causes `ReferenceError: _req0 is not defined` at runtime.

The local source (via `pds l`) is correct:
```js
import Plotly from './core.js';
import bar from './bar.js';
import pie from './pie.js';
import calendars from './calendars.js';
Plotly.register([bar, pie, calendars]);
export default Plotly;
```

## Fix

The `npm-dist` workflow is copying stale or incorrectly-generated `lib/` files. Ensure the ESM-converted `lib/*.js` files on the dist branch match the local source exactly. The conversion script may be running on the wrong source or an older commit.
