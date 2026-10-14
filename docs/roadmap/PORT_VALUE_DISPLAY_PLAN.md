# Per-Port Value Display (Simulate View) — Implementation Plan (Draft)

> **Status:** Draft — deferred by user request (2026-10). To be expanded into a
> full implementation plan before work begins. Related overview section:
> *Simulator View → Dual-Mode Component Rendering* in
> [SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md).

## Goal

Show live runtime values as small labels beside module ports in the Simulate
perspective's schematic viewer, so students can read what each port carries
without hovering. Complements (does not replace) the existing hover tooltip
probes in `SchematicViewer`.

## Non-Goals (for now)

- Editing values from the canvas (read-only labels; editing stays in the
  Inspector / memory & register panels).
- Net-body value badges — labels attach to **ports** only in this phase.
- Historical/traceback values (forward-only simulation, no back-step).

## Existing Integration Points

| Piece | Where |
| --- | --- |
| 60 fps net-value sampler (per-net dirty checking) | `src/editor/components/SchematicViewer.vue` |
| Net → slot index + port read API (`getPortValue`) | `src/core/engine/engine.ts`, `compile/wire-index.ts` |
| Port label rendering + theming | `src/editor/core/render/module-node.ts`, `render/theme.ts` |
| Value formatting (`formatWord`, hex/bin/decimal) | `src/shared/utils/format.ts` |
| Hierarchical config precedent (config schema + defaults) | `src/shared/types/manifest.ts`, `manifestRegistry.ts` |

## Design Sketch

### Hierarchical Format Overrides (most-specific wins)

1. **Architecture default** — a `portValueDisplay` block on the architecture
   document (applies to all ports of all modules).
2. **Module port default** — optional per-port entry in the module instance's
   config (set in the Design perspective Inspector).
3. **Simulation-view override** — session-local (volatile, never persisted
   into the architecture), applied from the Simulate perspective UI.

Each level only overrides the fields it sets: `format`
(`unsigned | signed | float | binary | hex`) and `visible`
(show/hide labels per port).

### Rendering

- Konva `Text` labels beside each port on a dedicated non-listening label
  layer in `SchematicViewer`; refreshed only for ports whose net value
  changed since the last sampled frame (reuse the existing dirty-check
  machinery to avoid 60 fps full redraws).
- Labels sized against `bits` (truncation + tooltip fallback for long
  binaries), styled from theme tokens (new `label*` tokens in `render/theme.ts`).
- Viewer-only: the Design perspective never renders value labels.

## Implementation Phases

1. **Types & defaults** — override types in `manifest.ts` /
   `architecture.ts`; architecture-level default block; resolution helper
   (`resolvePortDisplay(arch, module, port) -> DisplaySpec`).
2. **Engine read path** — ✅ done: `getPortValue` covers every port shape
   (undriven inputs on the zero rail, unconnected outputs on private slots).
3. **Label rendering** — ✅ done: `port-value` `Konva.Text` per port (created
   hidden in `module-node.ts`, lifted by `SchematicViewer` into the designer's
   topmost non-listening value layer via `liftPortValueLabel`, so the numbers
   render **above** the wires; written via `setPortValueLabel`); default
   format via `formatPortValue` — 1-bit control lines as `0`/`1`, wider buses
   as compact hex; per-port dirty checking; theme-flip refresh. Editor mode
   never lifts or writes labels, so the Design perspective stays value-free
   by construction.
4. **Inspector editing (Design)** — per-port format/visibility fields in
   `InspectorPanel.vue`, persisted with the architecture.
5. **Session overrides (Simulate)** — volatile override UI (e.g. viewer
   toolbar: global format selector + per-port toggle via port context UI).

## Validation

- `npm run engine:check` (extend `engine-smoke.ts` only if engine behavior
  changes — currently not expected).
- `vue-tsc --noEmit` on touched files.
- Manual: run a program on a template architecture; verify labels update
  live, survive pause/step, honor all three override levels, and stay out of
  the Design perspective and saved projects (unless set at levels 1–2).

## Open Questions (to resolve when expanding)

- Float format semantics (IEEE-754 for 32-bit only? what for other widths?).
- Should labels show on internal **module state** (e.g. register current
  value) or strictly on ports?
- Toggle placement in the Simulate perspective toolbar vs. Golden Layout panel.
- Performance budget with dense diagrams (hundreds of ports) — consider
  label culling outside the viewport.
