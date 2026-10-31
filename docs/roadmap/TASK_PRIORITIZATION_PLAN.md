# Task Prioritization & Execution Order Plan

> **Status:** Active plan, written 2026-10-31 from a review of
> `TODO.kanban.md` against the post-Phase-4 state of the tree (engine,
> assembler, program loader and the CodeMirror foundation are implemented and
> verified). **Phase 1 completed 2026-10-31** (see §3). **Phase 2 completed
> 2026-10-31** (see §3). **Resynced 2026-10-31**: two newly added board
> tasks — editor add/link in architecture settings (`-4179`) and the stage
> instruction visualizer bar (`-4978`), both high — are folded into §2/§3,
> and the Phase 1/2 completions were moved to the kanban's Done column (and
> dropped from the open tables below). Related documents:
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
| **High** | Correctness bugs that silently produce wrong results, data-loss risk, bugs that block the primary workflow, or foundational refactors that gate other work | 6 |
| **Medium** | Core QoL / power features that improve trust or workflow but have workarounds | 13 |
| **Low** | Polish, layout cosmetics, and distribution | 9 |

Completed tasks (viewer panning, MIPS template, and the Phase 1/2 batches —
`-12`, `-3`, `-6`, `-461`, `-10`, `-9`, `-22`, `-290`) are excluded from the
plan; they live in the Done column of `TODO.kanban.md` and in the phase notes
in §3.

## 2. Priority assignments

Task ids refer to the `<!-- id: ... -->` markers in `TODO.kanban.md`.

### High

| Task | ID | Why high |
| --- | --- | --- |
| Net deletion granularity | `-2` | Destructive UX bug: deleting one segment removes the whole net. |
| Assembly editor richness | `-0` | Remaining subtasks (linting, highlighting, current-instruction highlight, autocomplete, go-to-definition) are the main student-facing gap in the primary loop. |
| Editor add/link in architecture settings | `-4179` | **New (2026-10-31)**: blank architectures currently have no code editor and no way to add one or map it to an IMem — this blocks the primary loop (assemble → load → run) for every non-template architecture and gates the rest of the editor work. Small fix (easy). |
| Stage instruction visualizer bar | `-4978` | **New (2026-10-31)**: the top-of-diagram pipeline strip ("which instruction is in which stage") is the flagship student-facing visualization, correlating with the pipeline stage config. |
| Undo/redo | `-4` | Hard, but an editor without undo feels unsafe; also cheaper to build *before* more mutation paths exist (each new editing feature is one more command to invert). |
| Autosave | `-17` | The largest data-loss risk in the app; the explicit-save funnel (`useProjectSave`) already exists to debounce onto. |

### Medium

| Task | ID | Notes |
| --- | --- | --- |
| Splitter one-to-many mapping | `-11` | Relaxing the one-to-one constraint; pairs with the merger/splitter wiring-logic pass. |
| Ctrl multi-select | `-93` | Basic editor expectation; bumped from its original `low`. |
| Fine-grained wire routing with Alt | `-5` | Depends on the final geometry model. |
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
| Net styles | `-208` | Cosmetic; rides along with multi-select work. |
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
it changes the coordinate system that segment deletion, junction geometry,
and fine-grained dragging all sit on top of; building those first would mean
doing them twice.

### Phase 3 — Routing & interaction polish (on the final geometry)

6. **Net deletion granularity** (`-2`) — segment identity layered over
   `SerializedNet` waypoint/branch geometry.
7. **Ctrl multi-select** (`-93`), then **undo/redo** (`-4`) — build the
   command history over `notifyDocumentChange` before adding further mutation
   paths; net styles (`-208`) can ride along with multi-select.
8. **Alt fine-grained wire drag** (`-5`) and **splitter one-to-many** (`-11`).

### Phase 4 — Simulate-mode core loop (student-facing value)

9. **Editor add/link in architecture settings** (`-4179`, new) — blank
   architectures currently cannot gain a code editor or map one to an IMem.
   Do this first in the phase: it gates every other item below for
   non-template architectures. Small (easy): a settings control to add
   editors and their IMem mappings, plus warnings for editors with no IMem
   assigned.
10. **Assembly editor subtasks** (`-0`), in order of decreasing leverage:
    linting/inline error highlighting first (the diagnostics contract already
    exists), then per-ISA syntax highlighting, then current-instruction
    highlighting (`pcLineMap` already ships from the assembler), then
    autocomplete, and `Ctrl+Click` go-to-definition last.
11. **Stage instruction visualizer bar** (`-4978`, new) — the top strip
    showing each instruction moving through the pipeline stages left-to-right,
    driven by the pipeline stage config (stage order/naming, display toggle,
    and start-stage boundary as specced in
    [SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md) §2); instructions render
    as written in the editor with light normalization, scaled to fit the
    cell. Pairs naturally with the current-instruction highlight from `-0`
    (same `pcLineMap` seam).
12. **Hover highlight + educational tooltips** (`-532`) — extends the existing
    tooltip/probe infrastructure to nets and modules.

### Phase 5 — Project management & data safety

13. **Autosave** (`-17`) — debounced save through the existing
    `useProjectSave` funnel; removes the biggest data-loss risk.
14. **Resume where you left off** (`-15`), **Recent Projects table** (`-24`),
    **per-project layout persistence** (`-16`) — `-16` unblocks `-21` and
    `-26`.

### Phase 6 — Designer power features

15. **Stage register pins + reset pin** (`-7`, `-8`) — one `configEditor`
    effort reusing the control-unit table pattern.
16. **ALU/ALU-control configurable operations** (`-13`) — same table-editor
    pattern; generalizes the §4.8 encoding tables.
17. **Control unit port labels** (`-87`).
18. **Simulation-only mode / architecture switching** (`-108`) — the largest
    workflow item; done once panels and editor richness are stable.

### Phase 7 — Templates, View menu, cosmetics

19. **Architecture templates / import / export** (`-14`) — design the
    persistence service so the same adapter can later back the Electron file
    path.
20. **View menu** (`-19`, `-20`, `-21` — `-21` after `-16`), **floating
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
   (`-290`) is the single biggest rework-avoidance decision on the board:
   segment identity, junction handling, and fine-grained dragging all encode
   coordinates that the standardization changes.
3. **Undo/redo before more mutation paths.** Every new editing capability
   (segment deletion, net styles, stage-register pins) adds a command the
   history must invert — building history early means features are born
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


