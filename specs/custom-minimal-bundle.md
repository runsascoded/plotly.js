# Custom minimal bundle entry point

## Problem

Even `plotly.js/basic` includes bar + pie + scatter and all component modules (legend, colorbar, annotations, rangeslider, modebar, etc.). Consumer apps typically use only scatter + bar, and only a subset of components (legend, maybe annotations). The rest is dead code that:

1. Increases bundle parse time
2. Increases `supplyDefaults()` iteration (every registered component runs its layout defaults)
3. Can't be tree-shaken because plotly uses CommonJS (`require()`/`module.exports`)

## Current state

`lib/index-basic.js` registers:
- Traces: scatter, bar, pie
- Components: ALL components (legend, colorbar, shapes, annotations, images, updatemenus, sliders, rangeslider, rangeselector, grid, selections)
- Calendars: ALL calendars

The component list comes from `lib/registry.js` which registers everything.

## Approach: custom entry point

Create `lib/index-minimal.js` that registers only what our consumer apps actually need:

```js
'use strict';

var Plotly = require('./core');

// Only the trace types we use
Plotly.register([
    require('./scatter'),
    require('./bar'),
]);

module.exports = Plotly;
```

### What about components?

Components are registered in `src/registry.js` via `register()`. The core components that are always needed:
- **Legend** — always used
- **Modebar** — the toolbar (can be disabled with `config.displayModeBar: false`)

Components we could skip:
- Colorbar (we don't use continuous color scales in legends)
- Shapes, annotations, images (not used in most consumer apps)
- Updatemenus, sliders (not used)
- Rangeslider, rangeselector (not used)
- Grid (not used)

### How component registration works

Looking at `src/registry.js`, components are registered via `exports.registerComponent = function(mod)`. Each component has:
- `supplyLayoutDefaults()` — runs on every `supplyDefaults()` call
- `draw()` — runs on every `drawData()` call
- Various other hooks

Skipping unused components means their `supplyLayoutDefaults()` never runs, saving time proportional to the number of skipped components.

### Feasibility

The core (`lib/core.js`) registers only the cartesian plot type. Trace modules and components are all opt-in via `Plotly.register()`. So a minimal entry point is already supported — we just need to create one that matches our needs.

## Implementation

1. Create `lib/index-minimal.js` with only scatter + bar
2. Add `"./minimal"` to the `exports` map in `package.json`
3. Update pltly to import from `plotly.js/minimal`
4. Test that legend, hover, and click interactions still work without the extra components

## Measuring impact

Compare bundle size and init time:
- `lib/index.js` (full) vs `lib/index-basic.js` vs `lib/index-minimal.js`
- `supplyDefaults()` duration with all components vs minimal components

## Future: ESM and tree-shaking

The ideal long-term solution is converting plotly.js to ES modules, making every trace type and component tree-shakeable. But that's a 4000+ file conversion that would break all downstream consumers. The custom entry point gets ~90% of the benefit with minimal effort.

If ESM conversion ever happens:
- Each trace type becomes a side-effect-free ESM export
- Components become opt-in imports
- Bundlers automatically drop unused code
- No need for separate entry points
