# Task Prioritization & Execution Order Plan

> **Status:** Active plan, written 2026-10-31 from a review of
> `TODO.kanban.md` against the post-Phase-4 state of the tree (engine,
> assembler, program loader and the CodeMirror foundation are implemented and
> verified). **Phase 1 completed 2026-10-31** (see §3). **Phase 2 completed
> 2026-10-31** (see §3). **Phase 3 completed 2026-10-31** (see §3).
> **Resynced 2026-10-31**: two newly added board
> tasks — editor add/link in architecture settings (`-4179`) and the stage
> instruction visualizer bar (`-4978`), both high — are folded into §2/§3,
> and the Phase 1/2 completions were moved to the kanban's Done column (and
> dropped from the open tables below). **Resync follow-up (2026-10-31):**
> `-11` (splitter one-to-many) closed out — the feature was already
> implemented and is now covered by the engine smoke rig — and `-2` was
> rewritten from a segment-deletion bug into a deferred KiCad-style
> net-model rewrite (floating nets + connectivity warnings), demoted to
> low/hard. Related documents:
> [MIPS_END_TO_END_PLAN.md](./MIPS_END_TO_END_PLAN.md) (the completed
> Phases 1–4), [DESIGN_SPECIFICATION.md](../DESIGN_SPECIFICATION.md) §12
> (planned-feature design intent), [SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md)
> (execution control semantics).
>
> The priorities recorded here are also annotated inline on every open task in
> `TODO.kanban.md` via `<!-- priority: high|medium|low -->` (and
> `<!-- workload: easy|hard -->` where notable), using the MD Kanban comment
> convention so the board sorts by the same scheme.

---

## 1. Scope and starting point

The core loop — **design a CPU → assemble a program → load it → run it
cycle-accurately** — is implemented end-to-end and verified
(`npm run engine:check`, `assembler:check`, `simulation:check`; Rig C/D
validates the shipped single-cycle datapath). The remaining board is therefore
not about making the product *work*; it is about making it *correct, trusted,
comfortable, and distributable*.

That framing drives the priority vocabulary used throughout:

| Priority | Definition | Count |
| --- | --- | --- |
| **High** | Correctness bugs that silently produce wrong results, data-loss risk, bugs that block the primary workflow, or foundational refactors that gate other work | 4 |
| **Medium** | Core QoL / power features that improve trust or workflow but have workarounds | 10 |
| **Low** | Polish, layout cosmetics, and distribution | 9 |

Completed tasks (viewer panning, MIPS template, the Phase 1/2 batches —
`-12`, `-3`, `-6`, `-461`, `-10`, `-9`, `-22`, `-290` — the already-implemented
splitter fan-in `-11`, closed during this resync, and the Phase 3 batch —
`-93`, `-208`, `-4`, `-5` — completed 2026-10-31) are
excluded from the plan; they live in the Done column of `TODO.kanban.md` and
in the phase notes in §3.

## 2. Priority assignments

Task ids refer to the `<!-- id: ... -->` markers in `TODO.kanban.md`.

### High

| Task | ID | Why high |
| --- | --- | --- |
| Assembly editor richness | `-0` | Remaining subtasks (linting, highlighting, current-instruction highlight, autocomplete, go-to-definition) are the main student-facing gap in the primary loop. |
| Editor add/link in architecture settings | `-4179` | **New (2026-10-31)**: blank architectures currently have no code editor and no way to add one or map it to an IMem — this blocks the primary loop (assemble → load → run) for every non-template architecture and gates the rest of the editor work. Small fix (easy). |
| Stage instruction visualizer bar | `-4978` | **New (2026-10-31)**: the top-of-diagram pipeline strip ("which instruction is in which stage") is the flagship student-facing visualization, correlating with the pipeline stage config. |
| Autosave | `-17` | The largest data-loss risk in the app; the explicit-save funnel (`useProjectSave`) already exists to debounce onto. |

### Medium

| Task | ID | Notes |
| --- | --- | --- |
| Stage register configurable pins | `-7` | Reuses the control-unit table-editor pattern. |
| Stage register reset pin | `-8` | Do together with `-7` (same manifest, same editor). |
| ALU / ALU-control configurable ops | `-13` | Generalizes the §4.8 encoding tables to config; same table-editor pattern again. |
| Control unit output port labels | `-87` | Small; slot in anytime. |
| Architecture templates / import / export | `-14` | Design the persistence adapter so it can later back the Electron FS path. |
| Hover highlight + educational tooltips | `-532` | Net/module hover highlighting and info tooltips; the tooltip infrastructure (`formatWord`, manifest descriptions) already exists. |
| Resume where you left off | `-15` | URL route/params persistence. |
| Per-project layout persistence | `-16` | **Dependency** for multiple base layouts (`-21`) and project export (`-26`). |
| Recent Projects table | `-24` | Home-page table with search/sort/actions. |
| Simulation-only mode / architecture switching | `-108` | Large (hard) workflow feature; do late in the designer cycle so the dynamic panel mount/unmount is not built against a moving target. |

### Low

| Task | ID | Notes |
| --- | --- | --- |
| Floating nets & connectivity warnings (rewrite) | `-2` | **Rewritten 2026-10-31** from the old segment-deletion bug: KiCad-style net model — driverless/unconnected segments allowed, Problems-panel warnings instead of hard errors. Hard; deferred — whole-net deletion stays until it lands. |
| View menu panel toggles | `-19` | After layout persistence. |
| Reset layout button | `-20` | With the View menu. |
| Multiple base layouts | `-21` | After layout persistence (`-16`). |
| Floating simulation controls | `-23` | Cosmetic. |
| Coordinates readout improvement | `-190` | Easy QoL; slot in anytime. |
| Electron build | `-25` | Distribution; deliberately last. |
| Project export/import | `-26` | Depends on layout persistence; pairs with the Electron adapter. |
| Project "Save as" | `-27` | With the Electron pass. |

## 3. Recommended execution order

### Phase 1 — Quick correctness wins (all small, do immediately)

> **Status:** ✅ **Completed 2026-10-31** — all five planned items plus both
> opportunistic ones, in three batches (wiring-logic pass, routing preview
> fidelity, rendering/layout pass + trivial fixes). Validated with
> `npm run check` (all rigs green) and `vue-tsc` (no new type errors).

1. ✅ **Merger multi-drive rejection** (`-12`) and ✅ **splitter over-wide
   warning** (`-10`) — one pass through `wiring-logic.ts` + the two config
   editors. Multi-drive is now *rejected* at every entry point (jumper board
   interaction, config commit gate via `mergerErrors`, engine lint backstop);
   over-wide presets clamp with a yellow notice instead of silently mapping
   nothing.
2. ✅ **Wire ghost fidelity** (`-3`) — the preview anchors to real port/tap
   positions and mirrors the committed net's driver → driven orientation
   (input→output routes and input→net taps reverse), so the committed wire
   never bends opposite the ghost.
3. ✅ **Theme switch redraw** (`-6`) — `theme-change` event →
   `SchematicDesigner.refreshTheme()` rebuilds nodes in place and re-renders
   the grid; the viewer relifts its port-value labels.
4. ✅ **Diagram bottom-bar spill** (`-461`) — status bar into flow
   (`shrink-0`), canvas container `min-h-0`, and a `ResizeObserver` keeps the
   Konva stage sized during Golden Layout panel resizes.
5. ✅ **Stage-register deletion guard** (`-9`) and ✅ **mode-switch hotkey**
   (`-22`, bound to `F4`, workspace-gated) — both done; global bare-key
   shortcuts no longer fire while typing.

### Phase 2 — Grid & geometry standardization (`-290`, high/hard)

> **Status:** ✅ **Completed 2026-10-31.** Snap unit fixed at `GRID_UNIT = 1`
> (zoom-independent — snapping no longer follows the zoom-promoted visual
> grid), grid-size config removed (`GridSettings` = show/style only, legacy
> stored `size` stripped on load), origin cross always marks the canvas
> center, control unit on the common 20-unit pitch, ALU fractional sloped-edge
> ports and notch snapped to whole units. Validated via `npm run check`
> (Rigs C/D re-render the shipped datapath) and `vue-tsc` (no new errors).

Standardize on a fixed 1-unit grid, align all ports and symbol outlines to
whole units across the manifests, add the canvas center indicator, and make
translation zoom-independent. **Do this before any further routing work** —
it changes the coordinate system that the connectivity rewrite (`-2`),
junction geometry, and fine-grained dragging all sit on top of; building
those first would mean doing them twice.

### Phase 3 — Routing & interaction polish (on the final geometry)

> **Status:** ✅ **Completed 2026-10-31** — all four remaining items in four
> batches (multi-select, net styles, undo/redo, Alt free-form wire drag).
> Validated with `npm run check` (all rigs green) and `vue-tsc` (no new type
> errors against the 317-error legacy baseline). Two of the originally planned
> items had already been closed out during the 2026-10-31 resync: splitter
> one-to-many (`-11`) was already implemented and is now covered by the engine
> smoke rig, and net deletion granularity (`-2`) was rewritten into a deferred
> KiCad-style net-model rewrite — see the Low table and §4.

1. ✅ **Ctrl multi-select** (`-93`) — Ctrl/⌘ click toggles modules and nets
   exactly like Shift, and Ctrl/⌘ marquee drags are additive
   (`designer.ts` click handlers, `selection.ts` marquee). The existing
   group drag, multi-delete, multi-copy and Inspector multi-selection view
   already supported N selected items, so this was a two-file change.
2. ✅ **Net styles** (`-208`, riding along with multi-select) — optional
   `style` on `SerializedNet` (`'solid' | 'dashed' | 'dotted'`, default
   solid, fully back-compat for saved projects and the engine rigs); dash
   patterns in `render/wire.ts` that survive the selection/hover/lint/signal
   stylers and theme rebuilds; `setNetStyle` commits a whole multi-select
   restyle as ONE document change (single history entry by design); an
   Inspector "Wire style" radio section for net selections (mixed styles
   shown as indeterminate); styles survive save/load, copy/paste and
   paste-offset moves.
3. ✅ **Undo/redo** (`-4`) — memento history, not a command stack
   (`src/editor/core/history.ts`, pure TS, 100 entries per direction): every
   committed user gesture maps 1:1 onto a whole-document snapshot entry
   through the existing `notifyDocumentChange` seam, so all future features
   are born undoable. Multi-delete, paste and the architecture-settings
   cascade coalesce into single entries (`runBatched` /
   `withSettingsBatch`); undoing a settings entry restores the prior
   `ArchitectureConfiguration` through the new `onConfigurationRestore`
   callback, so canvas and configuration never drift. Structural equality
   skips no-op mutations (a drop in place); a project load resets the
   baseline (`loadArchitecture` `resetHistory`). Ctrl+Z / Ctrl+Shift+Z /
   Ctrl+Y — `ShortcutManager` gained explicit `shift` matching so the
   Ctrl+Z pair disambiguates — plus toolbar buttons fed by the new
   `history-bridge`. Known limitation: history is per-designer, so the F4
   perspective switch clears it (unlike the module-level clipboard).
4. ✅ **Alt fine-grained wire drag** (`-5`) — resolved with the maintainer as
   *free-form segment drag*: Alt+drag (or dragging an already free-form
   polyline) translates the grabbed segment in both axes with no
   auto-inserted orthogonal bends, so diagonal legs are allowed. Fixed
   anchors (ports/junctions) stay glued via spliced-in movable vertices;
   junction dots ride diagonal segments (distance test replaces the
   axis-aligned containment test). Committed drafts persist per-polyline
   `freeform` flags and render verbatim via the new
   `composeNetPathVerbatim` (`orthogonal-path.ts`), so hand-drawn geometry
   survives reloads, theme rebuilds and later module drags.

### Phase 4 — Simulate-mode core loop (student-facing value)

6. **Editor add/link in architecture settings** (`-4179`, new) — blank
   architectures currently cannot gain a code editor or map one to an IMem.
   Do this first in the phase: it gates every other item below for
   non-template architectures. Small (easy): a settings control to add
   editors and their IMem mappings, plus warnings for editors with no IMem
   assigned.
7. **Assembly editor subtasks** (`-0`), in order of decreasing leverage:
   linting/inline error highlighting first (the diagnostics contract already
   exists), then per-ISA syntax highlighting, then current-instruction
   highlighting (`pcLineMap` already ships from the assembler), then
   autocomplete, and `Ctrl+Click` go-to-definition last.
8. **Stage instruction visualizer bar** (`-4978`, new) — the top strip
    showing each instruction moving through the pipeline stages left-to-right,
    driven by the pipeline stage config (stage order/naming, display toggle,
    and start-stage boundary as specced in
    [SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md) §2); instructions render
    as written in the editor with light normalization, scaled to fit the
    cell. Pairs naturally with the current-instruction highlight from `-0`
    (same `pcLineMap` seam).
9. **Hover highlight + educational tooltips** (`-532`) — extends the existing
    tooltip/probe infrastructure to nets and modules.

### Phase 5 — Project management & data safety

10. **Autosave** (`-17`) — debounced save through the existing
    `useProjectSave` funnel; removes the biggest data-loss risk.
11. **Resume where you left off** (`-15`), **Recent Projects table** (`-24`),
    **per-project layout persistence** (`-16`) — `-16` unblocks `-21` and
    `-26`.

### Phase 6 — Designer power features

12. **Stage register pins + reset pin** (`-7`, `-8`) — one `configEditor`
    effort reusing the control-unit table pattern.
13. **ALU/ALU-control configurable operations** (`-13`) — same table-editor
    pattern; generalizes the §4.8 encoding tables.
14. **Control unit port labels** (`-87`).
15. **Simulation-only mode / architecture switching** (`-108`) — the largest
    workflow item; done once panels and editor richness are stable.

### Phase 7 — Templates, View menu, cosmetics

16. **Architecture templates / import / export** (`-14`) — design the
    persistence service so the same adapter can later back the Electron file
    path.
17. **View menu** (`-19`, `-20`, `-21` — `-21` after `-16`), **floating
    simulation controls** (`-23`), **coordinates readout** (`-190`).

### Phase 8 — Electron distribution (`-25`, `-26`, `-27`)

Last, deliberately: the engine and designer are framework-free, so the shell
is cheap to build *once* — but building it before autosave, export formats,
and layout persistence stabilize would mean maintaining two save paths
through churn.

## 4. Sequencing rationale (the four load-bearing decisions)

1. **Correctness before QoL.** Wrong simulation output (the merger wired-OR)
   destroys trust in an educational simulator more than any missing feature
   can; the Phase 1 batch exists to clear every known "silently wrong" bug
   first.
2. **Geometry before routing features.** The grid/port-alignment overhaul
   (`-290`) is the single biggest rework-avoidance decision on the board: the
   deferred connectivity rewrite (`-2`), junction handling, and fine-grained
   dragging all encode coordinates that the standardization changes.
3. **Undo/redo before more mutation paths.** Every new editing capability
   (the connectivity rewrite, net styles, stage-register pins) adds a command
   the history must invert — building history early means features are born
   undoable instead of retrofitted.
4. **Layout persistence before layouts and export.** Multiple base layouts
   (`-21`) and project export including Golden Layout state (`-26`) both
   consume the infrastructure of `-16`.

## 5. Maintenance

When a task on the board is completed, tick its checkboxes / mark it done in
`TODO.kanban.md` (as Phases 3 and 4 did) and, if the sequencing above was
affected (e.g. a dependency finished early), update the phase lists here in
the same commit. Priorities in the kanban and this document must stay in
sync — the kanban is the source of truth for *what*, this document is the
source of truth for *when and why*.


