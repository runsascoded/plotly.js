# Tree-shaking architectural intent (note for future sessions)

## Owner's goal

End state: downstream consumers write
```ts
import { Plot /*, or newPlot, react, … */ } from 'plotly.js'
```
and the bundler tree-shakes unused traces, components, and axis methods automatically. No subpath picking (`./basic`, `./lite`, `./cartesian`), no `createPlotly({ traces, components })` explicit registration, no `import 'plotly.js/lib/index-basic.js'` deep paths.

**Why not route through `pltly`?** Because `pltly` should be just the React bindings for plotly.js. Conflating "which plotly bundle" with "how do I use plotly from React" is architectural creep. In a cleaner world `pltly` would live in this repo as a separate npm package that pulls in `react` as a peer. A consumer picks `pltly` vs raw `plotly.js` to opt into the React layer; neither package decides what traces you use.

That rules out the tempting middle-ground of "pltly exposes a configured factory so downstream apps don't have to". We want plotly.js' default export to be the right answer on its own.

## Current state (as of 2026-04-22)

Three phases were planned in `specs/remove-registration-system.md`:

- **Phase 1 ✅** `createPlotly({ traces, components })` factory at `src/core-factory.ts`, exposed as `plotly.js/factory`. Saves ~37% vs `/basic`. One known consumer: `awair`.
- **Phase 2 ⚠️ partially reverted.** An early pass replaced `Registry.getComponentMethod(...)` calls with direct named imports for `calendars`, `errorbars`, `fx`, `colorscale`. That regressed lite by ~78 KB (commit `cbc0d241a`, 2026-04-02) because static imports chained `scatter → errorbars` and forced inclusion even when `errorbars` wasn't registered. Those four were reverted to runtime `getComponentMethod`. 226 of the original 275 lookups are now direct imports; ~20 conditional-component lookups remain runtime.
- **Phase 3 ❌ not started.** `specs/split-core-files.md` lays out the plan but the four monolithic files still have their original shape:
  - `src/plots/cartesian/axes.ts` — 4,663 lines, **1** default export (worst case)
  - `src/plots/plots.ts` — 3,425 lines, 55 named exports (already named, but heavy default object)
  - `src/components/drawing/index.ts` — 1,767 lines, 55 exports
  - `src/plot_api/index.ts` — 41 lines, 28 re-exports (already fine)

Factory bundle stalled at 681 KB. `specs/modernization-roadmap.md` step 6 ("split monolithic files") marked "not started."

## Why Phase 2 got turned around

Key insight from the revert: **Phase 2 ≠ Phase 3, they're sequenced.** Replacing runtime lookups with static imports only helps tree-shaking when the importee *is itself splittable*. `scatter.ts` statically importing `errorbars.ts` pulls in all of errorbars because errorbars/index is a kitchen-sink. Phase 3 (split the kitchen sinks) has to precede any further Phase 2 progress or you get the same 78-KB regressions.

So the work isn't "stashed" in a pejorative sense — it's correctly blocked on a prerequisite nobody has started yet.

## The unblock

Smallest well-scoped next move: **convert `src/plots/cartesian/axes.ts` from one default object export to named exports**, then update callers. That file alone is the biggest offender: 4,663 lines behind a single export boundary, so every consumer of `axes.doTicks(...)` drags in all ~50 axis methods.

Concrete task sketch (belongs in its own spec if someone picks it up):

1. Map which axis methods are actually used by (a) the `factory` path, (b) scatter/bar trace plotting, (c) cartesian components. `grep -rE "axes\.(\w+)\(" src --include="*.ts"` to build the reference table.
2. Change `axes.ts`'s `export default { doTicks, draw, … }` to parallel `export function doTicks(...)`, etc. Keep a `default { … }` alias re-exporting the named set for backward compat while callers migrate.
3. Update direct callers (`src/plots/plots.ts`, `src/plots/cartesian/axis_defaults.ts`, `src/components/updatemenus/draw.ts`, …) to named-import only what they use.
4. Measure lite + factory bundle before/after. If axis splitting alone drops ≥50 KB, apply the pattern to `plots.ts` and `drawing/index.ts`.
5. Only *after* axes+drawing+plots are split, revisit the Phase 2 revert: try static-importing `errorbars`/`calendars`/`fx`/`colorscale` again and confirm the 78 KB regression is gone.

**Do not** skip to "just make `plotly.js` the default entry that does tree-shaking" before the core splits — that was the shape of the reverted attempt and it won't hold.

## Downstream convergence (for context)

Five repos the owner maintains import plotly today as follows:

| Project | Current import | Min bundle |
| ------- | -------------- | ---------- |
| awair | `import('plotly.js/factory')` | ~681 KB |
| path | `import('plotly.js/basic')` | ~1.1 MB |
| ctbk | `import('plotly.js/basic')` | ~1.1 MB |
| crashes | `import('plotly.js/lib/index-basic.js')` | ~1.1 MB |
| hbt | `import('plotly.js/lib/index-basic.js')` | ~1.1 MB |

`/lib/index-basic.js` is build output being used as a public entry — brittle. If Phase 3 lands successfully, all five should converge to `import { … } from 'plotly.js'` and each shave ~400 KB. In the meantime the shipping cost is acceptable (single cached load per user).

## Action for the next plotly.js session

1. Read `specs/remove-registration-system.md` + `specs/split-core-files.md` + `specs/modernization-roadmap.md` for the existing plans.
2. Decide whether to pick up the `axes.ts` split as the next concrete move — it's the highest-leverage Phase 3 task.
3. Don't try to finish Phase 2 registry removal before Phase 3 core splitting; commit `cbc0d241a` shows why.
4. Don't architect around routing through `pltly`. Keep `pltly` as thin React bindings; `plotly.js` should be self-sufficient.
