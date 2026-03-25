# Remove the registration system

## Problem

Plotly.js has a runtime registration system (`Plotly.register()`, `Registry.modules`, `Registry.componentsRegistry`) that was designed for CJS, where bundlers couldn't tree-shake. The system requires separate entry points (`plotly.js/lite`, `/basic`, etc.) that register different subsets of traces and components.

With the ESM conversion complete, bundlers can tree-shake unused code. But the registration system defeats this: `register([annotations, shapes, legend, ...])` is a side-effecting call that touches a global mutable registry. The bundler can't know which registered modules are actually used at render time, so it includes all of them.

## Current architecture

```
core.js:
  register(scatter)               // adds to Registry.modules
  register([annotations, shapes, legend, fx, modebar, ...])  // adds to Registry.componentsRegistry

Registry.getModule('scatter')     // looked up at runtime during supplyDefaults
Registry.getComponentMethod('legend', 'draw')  // looked up at runtime during drawData
```

The registry is consulted everywhere: `supplyDefaults`, `doCalcdata`, `drawData`, `drawFramework`, `marginPushers`. Hundreds of call sites do `Registry.traceIs(trace, 'cartesian')`, `Registry.getModule(trace)`, `Registry.getComponentMethod('shapes', 'calcAutorange')`.

## Why it matters

1. **No module-level tree-shaking**: even with ESM, if `register(annotations)` is called, the entire annotations module is included — even if no trace uses annotations.
2. **Separate entry points are a workaround**: `core-lite.js` exists solely to register fewer components. With proper ESM, you'd just `import` fewer things and the bundler handles the rest.
3. **Global mutable state**: the registry is a singleton, making it impossible to have two Plotly instances with different capabilities in the same page.
4. **Runtime overhead**: `supplyDefaults` iterates ALL registered components to call their `supplyLayoutDefaults`, even if the plot has no annotations, no colorbar, etc.

## Target architecture

A from-scratch ESM plotly would look like:

```js
// Consumer app:
import { newPlot } from 'plotly.js';
// OR for explicit control:
import { createPlotly } from 'plotly.js/core';
import scatter from 'plotly.js/traces/scatter';
import bar from 'plotly.js/traces/bar';
import legend from 'plotly.js/components/legend';

const Plotly = createPlotly({ traces: [scatter, bar], components: [legend] });
Plotly.newPlot(el, data, layout);
```

Bundler eliminates everything not transitively imported. No registration ceremony.

## Migration path

### Phase 1: Make registration optional (backward compat)

Keep `Plotly.register()` working but add a new `createPlotly()` factory that accepts modules directly:

```js
export function createPlotly({ traces, components }) {
    // Build a local registry (not global)
    // Return a Plotly instance with newPlot, react, etc.
}
```

Existing code using `Plotly.register()` still works. New code can use `createPlotly()` for better tree-shaking.

### Phase 2: Convert internal lookups

Replace `Registry.getModule(trace)` with direct module references passed through the call chain. This is the hard part — hundreds of call sites in `supplyDefaults`, `doCalcdata`, etc. need to receive their module dependencies explicitly rather than looking them up in the global registry.

### Phase 3: Remove global registry

Once all internal code uses explicit module passing, remove `Registry.*`, `Plotly.register()`, and the separate entry points. Each consumer just imports what they need.

## Effort estimate

Phase 1 is small — a new factory function. Phase 2 is the bulk of the work — threading module references through the entire rendering pipeline. Phase 3 is cleanup.

The registration system is deeply woven in — `Registry.traceIs()` alone has 100+ call sites. This is a multi-session project.

## Interim wins

Even without removing the registry, the ESM conversion gives us:
- **Intra-module tree-shaking**: unused functions within registered modules are eliminated
- **Better bundler integration**: no CJS pre-bundling, no `resolve.alias` hacks
- **Consistent `pds l`/`pds g` behavior**: ESM works the same whether symlinked or installed
