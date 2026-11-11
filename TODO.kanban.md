<!-- This is a Kanban Board file created with MD Kanban extension -->
<!-- GitHub: https://github.com/jebakumarj/md-kanban -->
<!-- VS Code Extension: Search "MD Kanban" in the extension store (ID: jeddak.md-kanban) -->

# MipStream Board

## Simulator

#### Feat: Assembly code editor panel
<!-- id: task-1792838400000-0 -->
Add a CodeMirror-based editor as a dedicated panel in Simulator mode (follows the general architecture configurator, which is already done). Must work generically with any ISA definition provided to it.
<!-- done-note: Done (Phase 4, 2026-10-31, remaining: "other conveniences"): `src/simulator/language/` ships the ISA-driven support bundle (`buildAssemblySupport`) attached through `useCodeMirror`'s support compartment — StreamParser mirroring the assembler tokenizer (tokenTable→HighlightStyle on app theme vars), debounced live lint over the real `assemble()` contract, ISA autocomplete (mnemonics with operand templates at statement positions, registers + doc labels at operand positions), Ctrl/⌘+Click go-to-definition, and the current-instruction line highlight (live PC `>>> 2` → load-time `pcLineMap` threaded through `LoadPlanEntry` → `simulationStore.pcLineMaps`; cycles via the store's cycle-count ticks, no extra rAF loop). `npm run language:check` rig covers parser/lint-mapping/labels/highlight-field headlessly. -->
- [x] CodeMirror 6 foundation (Phase 4): line numbers, history, token-synced theme, two-way `sourceCode` binding
- [x] Diagnostics strip (line + column, click-to-reveal) consuming the Phase 1 assembler contract
- [x] Syntax highlighting and autocomplete
- [x] Linting and inline error highlighting
- [x] `Ctrl+Click` go-to-definition
- [x] Highlighting of the currently simulated instruction
- [ ] Other common code-editor conveniences
- [x] Include a compile button in the panel
Tags: `feat` `simulator`
<!-- priority: high -->

## Architecture Designer

### Control Unit

#### Feat: Show output port labels
<!-- id: task-1792877672095-87 -->
Make the name/label of each control unit signal visible so a user doesn't need to hover over a port to see its name.
Tags: `control-unit` `designer` `fix`

### Editing & Interaction

#### Rewrite: KiCad-style floating nets & connectivity warnings
<!-- id: task-1792838400000-2 -->
Rework how nets are modeled and validated, KiCad-style: wires become free-standing geometry that does not have to terminate at a module port — a net may exist with no driver and/or no targets, and connectivity problems (unterminated segments, missing drivers, width mismatches) surface as Problems-panel warnings instead of model-level rejections. This supersedes the original "delete only the selected segment" request: whole-net deletion stays until this lands, and segment-level delete/split is reintroduced on top of the new model afterwards. Deliberately deferred — it changes fundamental wiring logic (`addRoute`/`addNet` validation, `pruneNetForRemovedModule`, `reconcileNetsForModule`, engine compile/lint).
Tags: `feat` `designer` `wiring`
<!-- priority: low -->
<!-- workload: hard -->

### ALU & ALU Control Unit

#### Feat: Configurable operations and signal mapping
<!-- id: task-1792838400000-13 -->
Make ALU operations and their control-signal mappings editable, with a "reset to default" button.
- [ ] Default to the standard 4-bit ALU control signal mapping: `0000: AND`, `0001: OR`, `0010: ADD`, `0011: SUB`, `0100: SLT`, `0101: NOR`, `0110: XOR`, `0111: SLL`, `1000: SRL`, `1001: SRA`, `1010: LUI`, `1011: MULT`, `1100: DIV`, `1101: REM`, `1110: NOP` (extend with any missing standard operations)
Tags: `feat` `designer` `alu`

### Architecture Import / Export

#### Feat: Architecture configuration import, export, and "save as template"
<!-- id: task-1792838400000-14 -->
- [ ] Add a new IndexedDB table for user-made architecture templates
- [ ] "Save as template" stores the current architecture configuration in that table
- [ ] Export produces a single file containing the architecture configuration plus all templates from that table; import restores both to the state they were in when exported
- [ ] On Electron, expose this as "Save architecture as" / "Load architecture" backed by the local file system
Tags: `feat` `designer` `import-export`

#### Improve Cordinates functionality
<!-- id: task-1793271154991-190 -->
<!-- group:  -->
The designers cordinates are not very usable and specify the cordinates of the screen and not the mouse.
Tags: `QoL` `designer`
<!-- priority: low -->
<!-- workload: easy -->

#### Reorderable ports
<!-- id: task-1794387089367-246 -->
<!-- group:  -->
Make ports reorderable any many modules like the stage registers, control unit, bit spliter...
<!-- done-note: Done (2026-11-11): every list-driven manifest gained up/down reorder in its Inspector editor via the new pure `moveItem` helper (`src/shared/utils/move-array-item.ts`, the `moveStage` pattern generalized) — control-unit signals (ports + opcode-table columns follow), splitter outputs and merger inputs (canvas pins and the jumper-board stacks follow; `out_<id>`/`in_<id>` ids stable, so no net is ever rewired). The stage register was rewritten main-pin-free (`register/logic.ts`): port ids are now id-based — the pin id'd `main` derives the classic `d`/`q` wherever it sits, everything else `d_<id>`/`q_<id>` — so pins reorder AND delete freely (`pins: []` is a valid pin-less register; `addRectBody` gained a zero-port body guard, the stage visualizer early-nulls empty registers). Legacy configs (no `pins` key) still resolve to the single main@bitWidth shape byte-identically; the pipelined template's boundary pins were renamed `instr`→`main` (labels kept) so the halt drain / visualizer `q` reads are untouched (Rig E regression green). Covered headlessly by `npm run engine:check`: pin-less compile/step, reorder invariance per port id, non-main custom-id pins. -->
Tags: `QoL` `designer` `stage-registers` `splitter-merger` `control-unit`

#### reorderable multiplexer ports
<!-- id: task-1794387317629-373 -->
<!-- group:  -->
Make multiplexer ports reorderable or more specifically configurable so that we can specify which input gets forwarded on what control signal. Make sure to also draw the signal bits next to all input ports. for 2to1 its just '1' or '0'. Make it also possible to move the control port from bottom to top and vice versa.
<!-- done-note: Done (2026-11-11): `MuxConfig` (moved to pure `mux/logic.ts`) gained optional `selMap` (input index → selector value, validated permutation, identity fallback) and `selPosition` (top/bottom Sel edge). The evaluator compiles the map into a flattened LUT (`buildMuxLut`/`selectMappedMuxInput`; `selectMuxInput` kept for the simulation-smoke mirror). New `MuxConfigEditor.vue` replaces the schema form (owns bit width): per-input sel-code select with swap semantics (permutation always valid) + Sel-position radio. `drawMuxBody` annotates every input pin with its binary selector code ("0"/"1" on a 2:1) and input tooltips state the forwarding code. Covered by `npm run engine:check` (swapped/identity/invalid-map/sel-position rigs through the real logic). Follow-up: an input-stacking (`stack`) option was added then deliberately removed again — reordering is redundant when each input can already be assigned any selector code. -->
Tags: `mux/index.ts` `designer` `feat`

#### Ensure manifests respect GRID_UNIT size
<!-- id: task-1794388477850-503 -->
<!-- group:  -->
GO through all manifest port and draw functions and ensure they are aligned to the GRID_UNIT size which is 5
Tags: `fix` `designer`

## Project Management

#### Feat: Architecture Simulation Project Integration & Workflow Refinement
<!-- id: task-1793439728114-108 -->
Introduce a Simulation-Only project Mode and a dynamic architecture switching workflow to streamline the user experience when testing code against different hardware models. By decoupling code execution from circuit editing, the interface will simplify into an IDE-focused visualizer when full schematic access is not required. Swapping architectures directly from the topbar will trigger compatibility checks that dynamically adjust the active UI panels—protecting editor buffers and alerting users whenever hardware shifts remove or add components like Instruction Memory, Data Memory, or Register Files.
- [ ] Extend project configuration schema with a project_mode ("full" vs. "simulation_only") property and persist it.
- [ ] Conditionally hide the Designer View toggle and skip designer initialization when "project_mode" is set to "simulation_only".
- [ ] Add an architecture info badge displaying current metadata directly into the topbar.
- [ ] Implement a topbar quick-select dropdown for swapping the active architecture (can be a more styleized popup panel with search functionality).
- [ ] Create a pre-switch validation utility that compares current and target architecture manifests to detect incoming panel additions or removals.
- [ ] Implement a warning confirmation modal alerting users when an architecture switch will drop un-supported panels or un-link code editors due to missing Instruction Memory. The editor warning should be red since the code should get removed, while the panel warning can be yellow since they don't have saveable state anyway.
- [ ] Refactor the simulation UI layout engine to dynamically mount or unmount panels based on the target architecture's active capabilities.
- [ ] Handle safe state preservation, un-linking, or cleanup of active code buffers and breakpoints during dynamic layout transitions.
Tags: `QoL` `uiux` `simulator` `feat`
<!-- workload: hard -->

#### Feat/FIx: Add option to add editor in the architecture settings
<!-- id: task-1793456337313-4179 -->
Right now empty design has no editor and its not possible to add one and connect it to an IMem.
this has to be fixed. Add warnings if editors have no imem assigned.
- [x] Done (Phase 4, 2026-10-31): Architecture Settings gained an "Editors" tab (add/rename/remove, popconfirm on remove, per-row "No instruction memory" warning tag; removal strips the drafted assembler mappings). `useArchitectureSettings` drafts `software.editors` beside the configuration and commits them together; when a designer is active the editor set rides the same `withSettingsBatch` undo entry (`HistoryEntry.editors` + `onEditorsRestore`), so undo restores document, configuration AND editors as one step. `projectStore.updateSoftware` is the new software-layer mutation funnel. Amended same day: the Editors and Assembler tabs were merged into one "Program" tab in `ArchitectureSettingsModal` (the editor list feeds the mapping rows — one topic).
Tags: `feat-fix` `settings`
<!-- priority: high -->
<!-- workload: easy -->

## UI/UX

### View Menu (Alt menu → "View")

#### Feat: Panel toggles
<!-- id: task-1792838400000-19 -->
A simple toggleable list of existing project panels, grouped by mode (Simulator/Designer), with "Show all" and "Hide all" buttons at the top.
Tags: `feat` `uiux` `view-menu`
<!-- priority: low -->

#### Feat: Reset layout button
<!-- id: task-1792838400000-20 -->
Restores the current layout to its default.
Tags: `feat` `uiux` `view-menu`
<!-- priority: low -->

#### Feat: Multiple base layouts
<!-- id: task-1792838400000-21 -->
Let the user pick a base layout from a list, with a "Save current layout as new" button at the bottom.
Tags: `feat` `uiux` `view-menu` `layout`
<!-- priority: low -->

### Other

#### Feat: Floating simulation controls
<!-- id: task-1792838400000-23 -->
Let the simulation control buttons pop out of the topbar into a movable floating toolbar (like VS Code's draggable debug controls). Not a separate panel; it should be draggable around the screen and dockable back into the topbar.
Tags: `feat` `uiux` `simulation`
<!-- priority: low -->

#### Feat: Diagarm educational element info
<!-- id: task-1793275237015-532 -->
- Higlight the netlist or module currently being hoverd over to better see where it connects or ends.
- Show a tooltip of information about the netlist or module. Module will show its normal manifest and or architecture specific info while the netlist will show its value in different formats and list what modules it connects
- [x] Done (Phase 4, 2026-10-31): `SchematicViewer` hover layer restructured — port probes keep priority; otherwise the cursor resolves to a wire group (walking up to the `netId` attr) or a module group (`designator`+`typeId` attrs). Nets highlight across every segment (`setWireHover`, existing styler) and show a tooltip with the live value in hex/bin/dec (bit width from the driving source port) plus the full connection list (`source → targets`, capped at 6). Modules highlight via the new `setNodeHover` (accent stroke on `.module-body`, mirroring `setNodeDangerHover`) and show the manifest label/description first line + config summary (`managed` excluded). Both dirty-checked, cleared on leave and re-applied after theme flips.
Tags: `feat` `mips` `uiux`

## Electron App

#### Feat: Electron build
<!-- id: task-1792838400000-25 -->
An offline-capable desktop version with local file system access for saving/loading projects.
Tags: `feat` `electron`
<!-- priority: low -->

#### Feat: Project export/import
<!-- id: task-1792838400000-26 -->
Export a single file containing all project data (including the Golden Layout state); import restores the project to the state it was in when exported. In Electron, expose this as "Save as" / "Open" against the file system.
Tags: `feat` `electron` `import-export`
<!-- priority: low -->

#### Feat: Project "Save as"
<!-- id: task-1792838400000-27 -->
Creates a copy of the current project under a new name, leaving the original intact. In Electron, saves the copy to the file system.
Tags: `feat` `electron`
<!-- priority: low -->

## Done

#### Feat: General architecture settings
<!-- id: task-1792838400000-28 -->
Configure pipeline stages, assembler, ISA definition, and related options in one place.
Tags: `feat` `settings`

#### Fix: Schematic viewer panning
<!-- id: task-1792838400000-1 -->
Allow panning/scrolling around the schematic in the simulator's viewer mode.
- [x] Done (Phase 4): left-drag pans in viewer mode (`EventManager.canPanWithPrimary`), wheel zoom and right-drag pan were already active
Tags: `fix` `simulator`

#### Fix: MIPS single-cycle template
<!-- id: task-1792838400000-18 -->
Update the architecture template to match the updated architecture configuration and modules.
- [x] Done (Phase 3, 2026-10-24): `mips-basic` ships the golden single-cycle datapath (`src/config/mips-single-cycle-datapath.ts`), validated headlessly by Rig C/D in `npm run simulation:check`
Tags: `fix` `project-management` `mips`

### Stage Registers

#### Feat: Configurable pin count
<!-- id: task-1792838400000-7 -->
Stage registers should support a configurable number of input/output pins (input and output counts must stay in sync). Reuse the control unit's UI pattern.
- [x] Done (Phase 5, 2026-11-01): pins are configurable from the Inspector via a new control-unit-style editor (`RegisterConfigEditor.vue` — uncontrolled rows, whole-config commits). Each pin is a D/Q pair with its own label + width (1–32, count capped at 16). The first pin is the main pair and keeps the legacy `d`/`q` port ids, so saved projects, existing nets and the stage visualizer load byte-identical until edited; extra pins derive `d_<id>`/`q_<id>` from a stable generated id, so deleting one only drops its own nets (reconciled by `setModuleConfig`, one undo entry). The main pin cannot be deleted while siblings exist (it would silently rewire whatever inherits `d`/`q`). Ports ride the common 20-unit pitch; the body and per-pin labels grow with the count. All port/evaluator construction lives in pure `register/logic.ts` (shared by the manifest, the editor and the visualizer) and is covered headlessly by `npm run engine:check` (multi-pin latch, per-pin width masking, legacy-shape regression).
Tags: `feat` `designer` `stage-registers`

#### Feat: Toggleable reset pin
<!-- id: task-1792838400000-8 -->
Add an optional reset pin on top of the stage register, togglable from configuration.
- [x] Done (Phase 5, 2026-11-01): optional 1-bit `rst` input rendered on the top edge (mux-`sel` precedent), toggled from the same Inspector editor. Synchronous + active-high: an asserted `rst` clears every pin to 0 at the rising edge instead of latching D; left unconnected it binds to the engine's constant-zero rail and stays inert — pure manifest evaluator, zero engine changes. `useStageVisualizer` boundary sampling now falls back through every pin's output (extra pins trusted only on exact instruction-word matches, so narrow control pins can't mislabel cells). The engine rig proves latch-then-clear via a register-driven reset (reads the pre-edge value, then clears both pins while the data inputs stay driven).
Tags: `feat` `designer` `stage-registers`

#### Feat: Classic pipelined MIPS template
<!-- id: task-1792838400000-9 -->
A classic five-stage pipelined MIPS template — real pipeline boundary registers between the stages, not the single-cycle datapath.
- [x] Done (Phase 5, 2026-11-01): `mips-pipelined` template (`src/config/mips-pipelined-datapath.ts`, 24 modules / 67 nets) — each stage boundary is ONE multi-pin managed `std.register` (the reconciler keeps exactly one per boundary index) whose main pin is the 32-bit instruction word (port `q`), so the instruction bar samples every stage and the halt drain reads the same slot; the ID/EX wall carries the operands, PC+4, sign-extended immediate and all eight control signals as individual pins. Control decodes once in ID and pipelines down; branches resolve in EX (pipelined `branch` ∧ ALU zero) and flush IF/ID + ID/EX through their new synchronous `rst` pins while the PC takes the target (2-cycle penalty). Deliberately classic: no forwarding, no stalls — the regfile's hybrid commit gives a 4-instruction hazard window, documented in the netlist header and padded with nops in the hazard-free starter program (square-by-addition, result 49, taken backward branch every iteration). The session gained pipeline-drain halt semantics (finish only once every managed boundary `q` reads 0; trivially true without them, so single-cycle behavior is byte-identical — Rig D regression intact). Covered by Rig E in `npm run simulation:check`: per-cycle boundary-word positions, flush zeroes + PC redirect, exact cycle counts (18/9/144), starter-program final state, restart via `advance()`.
Tags: `feat` `designer` `stage-registers` `templates`

### Architecture Designer

#### Feat: Edit history
<!-- id: task-1792838400000-4 -->
Implement undo/redo for the schematic editor.
- [x] Done (Phase 3, 2026-10-31): memento history over the `notifyDocumentChange` commit seam (`src/editor/core/history.ts`, pure TS) — whole-document snapshots, one entry per committed gesture; multi-delete, paste and the architecture-settings cascade coalesce into single entries (`runBatched`), and undoing a settings entry also restores the prior architecture configuration via `onConfigurationRestore`. Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (ShortcutManager gained `shift` matching) plus toolbar buttons via the new `history-bridge`. Session-scoped: cleared by a perspective switch (F4) or project load.
Tags: `feat` `designer`
<!-- priority: high -->
<!-- workload: hard -->

#### Feat/Fix: Fine-grained wire routing on drag
<!-- id: task-1792838400000-5 -->
Currently only works when dragging modules; should also work when holding `Alt` and dragging a wire.
- [x] Done (Phase 3, 2026-10-31): free-form mode (resolved with the maintainer) — Alt+drag, or dragging an already free-form polyline, moves the grabbed segment in both axes without auto-inserted orthogonal bends (diagonal legs allowed). Fixed anchors stay glued via spliced-in movable vertices; junction dots ride diagonal segments (distance test); free-form polylines render verbatim (`composeNetPathVerbatim`) and persist per-polyline `freeform` flags.
Tags: `feat-fix` `designer`

#### Enable multi select when holding CTRL
<!-- id: task-1793270909936-93 -->
<!-- group:  -->
While holding CTRL, clicking on multiple modules/netlist segments, it should select them.
- [x] Done (Phase 3, 2026-10-31): Ctrl/⌘+click now toggles modules and nets exactly like Shift+click, and Ctrl/⌘ marquee drags are additive. Group drag, multi-delete, multi-copy and the Inspector's multi-selection view already handled N selected items.
Tags: `designer` `QoL`

#### Feat: Add the ability to configure net styles
<!-- id: task-1792877912661-208 -->
Add the ability to change the style of a net to dotted, dashed, solid or other options. Should also work when selecting multiple nets at once.
- [x] Done (Phase 3, 2026-10-31): optional `style` ('solid' | 'dashed' | 'dotted', default solid — fully back-compat) on `SerializedNet`; dash rendering in `render/wire.ts` survives the selection/hover/lint/signal stylers and theme rebuilds; `setNetStyle` restyles a whole multi-selection as ONE document change; the Inspector gained a "Wire style" section for net selections (shows "mixed" until one is picked); styles survive save/load, copy/paste and paste-offset moves.
Tags: `feat` `designer` `control-unit`
<!-- priority: low -->

#### Feat: Add stage instruction info to viewer
<!-- id: task-1793457051806-4978 -->
Just like MIPSIM or any other educational simulator. The diagram visualization should have a bar on top showing each instruction moving through the pipeline from left to right. This should corelate with the actual pipeline config in the architecture. full instructions should be shown just as they apear in the editor with light parsing to standardize them. The text should scale to fit its cell.
- [x] Done (Phase 4, 2026-10-31): `StageInstructionBar.vue` mounted above the viewer canvas (viewer became a flex column). Driven by `useStageVisualizer` — stage 0 samples the `std.pc` q output, stage i samples the managed boundary register with `stageIndex = i-1`; values resolve to the source line by exact match against the program's assembled instruction words (registers that latch the fetched word itself), then the byte-addressed PC (`>>> 2`), then a bare index — unresolvable values show an empty cell, never raw hex (amended same day after review). `startStageBoundary` blanks pre-identity stages. Instruction text comes from the load-time program snapshot (`simulationStore.loadedPrograms`: per-editor `pcLineMap` + source lines + flattened `instructionWords`, the halt-detection first-entry convention) normalized with `normalizeInstructionText` (comments stripped, whitespace collapsed). Text auto-fits via `FitText.vue` (transform-scale, ResizeObserver). New `showInstructionBar` pipeline config toggle in Pipeline Settings (default shown, legacy-safe). 60fps sampling loop dirty-checks before touching reactive state.
Tags: `uiux` `simulation` `simulator` `feat`
<!-- priority: high -->

#### Fix: Wire ghost fidelity
<!-- id: task-1792838400000-3 -->
Final wires should follow the dashed routing ghost exactly; they sometimes route the opposite way instead using a reversed 90 degree bend.
- [x] Done (Phase 1, 2026-10-31): the preview now mirrors the committed geometry — it anchors to real port/tap positions instead of the snapped cursor and reverses anchor order for input→output routes and input→net taps (the committed net always runs driver → driven), so the ghost never lies about the bend.
Tags: `fix` `designer`

#### Fix: Theme switching
<!-- id: task-1792838400000-6 -->
Changing the theme should update diagram colors immediately; currently a page reload is required.
- [x] Done (Phase 1, 2026-10-31): `SchematicEditor` listens for the app-wide `theme-change` event and calls `SchematicDesigner.refreshTheme()`, which rebuilds module/wire nodes in place (preserving order, selection, handles, lint/route styling) and re-renders the grid — no reload needed in either perspective.
Tags: `fix` `designer` `theming`

#### Fix: Guard deletion of architecture-defined stage registers
<!-- id: task-1792838400000-9 -->
Attempting to delete a stage register defined by the architecture should surface an error instead of allowing it.
- [x] Done (Phase 1, 2026-10-31): deleting a managed stage register (Delete key or delete tool) now surfaces an error toast naming the stage and pointing to Architecture Settings, via the new `onUserError` designer callback.
Tags: `fix` `designer` `stage-registers`

#### Fix: Show warning on over-wide auto-mapping
<!-- id: task-1792838400000-10 -->
When auto-mapping a range `x:y` wider than the configured output, show a yellow warning. Currently it silently fails and maps nothing.
- [x] Done (Phase 1, 2026-10-31): over-wide `x:y` presets now clamp to the bus width and surface a yellow notice on the field in both the splitter and merger editors — no more silent no-ops.
Tags: `fix` `designer` `splitter-merger`

#### Fix: Merger multi-drive rejection
<!-- id: task-1792838400000-12 -->
Disallow wiring multiple inputs to the same output pin. Currently this is accepted, warned about, and treated as a wired OR — not the expected behavior.
- [x] Done (Phase 1, 2026-10-31): every output bit now accepts exactly one driver — the jumper board rejects occupied output bits, `mergerErrors` blocks committing overlapping configs (red error, no emit), and engine lint flags multi-driven merger bits in the Problems panel.
Tags: `fix` `designer` `splitter-merger`

#### Fix: Splitter one-to-many mapping
<!-- id: task-1792838400000-11 -->
Allow wiring a single input pin to multiple output pins; currently only one-to-one mapping is supported.
- [x] Done (Phase 3, 2026-10-31): already implemented — the splitter editor passes `bus-fan-in-allowed` to the jumper board, which permits one input bit to drive several output fields; `wiring-logic` treats splitter overlaps as legal (unlike the merger, where they are a hard error) and the splitter evaluator resolves overlapping mappings per field. Now covered by the engine smoke rig (`npm run engine:check`): an overlapping/mirrored splitter config compiles clean, evaluates correctly, and the merger multi-driver lint does not fire for splitter configs.
Tags: `fix` `designer` `splitter-merger`

#### Improve grid funcionality
<!-- id: task-1793273338293-290 -->
The grid is usable but needs some QOF fixes and improvements.
- [x] Add a Canvas Center indicator
- [x] Remove the grid size config fields and set a fixed size of 1 unit
- [x] Standardize all port locations and schematic symbols to use whole units
- [x] Done (Phase 2, 2026-10-31): fixed `GRID_UNIT = 1` snap (zoom-independent — `getGridSize` no longer returns the zoom-promoted visual step), size field removed from `GridSettings`/toolbar with legacy stored values stripped, origin cross always marks scene (0,0), control unit moved to the common 20-unit pitch, and the ALU's fractional sloped-edge ports (`op`, `zero`) and notch geometry now land on whole units. Paste offsets use a dedicated 40-unit step.
Tags: `feat-fix` `QoL` `designer`

### Other

#### Feat: Mode-switch keyboard shortcut
<!-- id: task-1792838400000-22 -->
A hotkey to toggle between Simulator/Designer modes.
- [x] Done (Phase 1, 2026-10-31): `F4` toggles the Design/Simulate perspective (active only in the workspace with an open project); global bare-key shortcuts also no longer fire while typing in text fields or the code editor.
Tags: `feat` `uiux`
<!-- workload: easy -->

#### Fix: Diagram visualization bottom bar spils over
<!-- id: task-1793274872122-461 -->
The Visualization diagram in simulation mode has a bottom bar that spills over to the components bellow and subsequently makes it unresizable from the bottom.
- [x] Done (Phase 1, 2026-10-31): the status bar moved into the layout flow (`shrink-0`) instead of absolutely overlaying the canvas, the canvas container sizes with `min-h-0`, and a `ResizeObserver` keeps the Konva stage correctly sized while Golden Layout resizes panels (splitter drags, tab collapses) — restoring bottom-edge resizability.
Tags: `fix` `uiux`
<!-- priority: high -->
<!-- workload: easy -->

#### Feat: Recent Projects table (Home page)
<!-- id: task-1792838400000-24 -->
Replace the Recent Projects section with a searchable, sortable table.
- [x] Columns: Project Name, Last Modified, Mode, Actions
- [x] Actions: "Open", "Delete", "Rename"
- [x] Sortable by every column
- [x] Search bar (by project name) at the top
- [x] Done (Phase 5, 2026-11-01): `RecentProjectsTable.vue` replaces the Home button list — Naive UI `NDataTable` with Project Name (clickable, description beneath), Last Modified (default sort desc), Mode (`settings.lastPerspective` tag, `—` for legacy rows) and right-aligned Open/Rename/Delete actions; every column sortable, name search bar on top, 10-row pagination and contextual empty states. Open re-fetches the row (a stale snapshot can't clobber newer autosaved state) and routes through the guarded `openProject` funnel; Rename is a Naive dialog with inline validation (the legacy `uiStore.prompt` modal is never mounted in the active app) and stamps `updatedAt`; Delete is popconfirm-guarded, clears a stale `lastSession` pointer and drops a deleted active project from the session (in-flight autosaves cannot resurrect the row — update-by-id is a no-op once gone). New service fns `getAllProjects`/`renameProject`; the store's 10-item `recentProjects` still feeds the TopBar dropdown.
Tags: `feat` `uiux` `project-management`

### Project Management

#### Feat: Autosave
<!-- id: task-1792838400000-17 -->
Automatically persist project state.
- [x] Done (Phase 5, 2026-11-01): `useAutosave` (hosted once from `App.vue`, above the providers) watches the single dirty flag `projectSaved` and debounces 2s into the new silent `persistCurrentProject()` core extracted from `useProjectSave` — explicit saves wrap that core with toasts (now gated by the `projectSaveNotification` setting) and a recents refresh. The store gained a `mutationCount` epoch so edits landing while a write is in flight keep the project dirty (`saveProject` can no longer self-clear a flag it outran); failed writes re-arm with backoff and surface a TopBar hint (which also shows "Saved HH:MM"). Flushes on `visibilitychange→hidden` and `pagehide`; `beforeunload` prompts while anything is unsaved (data-safety net active even with autosave off). The previously dead `autoSave` general setting now gates it, default on.
Tags: `feat` `project-management`
<!-- priority: high -->

#### Feat: Unsaved-changes guard on project switch
<!-- id: task-1792838400000-17-guard -->
Riding along with autosave: replacing the active project (open another, reopen the same row, create new) discards unsaved in-memory state, so it is guarded.
- [x] Done (Phase 5, 2026-11-01): `useProjectSwitch.openProject`/`ensureSafeToSwitch` is the single funnel for every `setCurrentProject` call site (Home, OpenProjectModal, TopBar File ▸ Recent, CreateProjectModal pre-insert). When dirty, a three-way Naive dialog offers Save & continue (persists via the silent core, aborts the switch on failure), Discard changes (drops the pending autosave; the DB keeps the last saved row) and Cancel. Switches also flush pending targeted layout writes first, and `openProject` navigates to the id'd session URL.
Tags: `feat` `project-management`

#### Feat: Resume where you left off
<!-- id: task-1792838400000-15 -->
Remember the last project and mode, encoded in the URL route/params, and restore them on launch.
- [x] Done (Phase 5, 2026-11-01): route is `/workspace/:projectId?` with a `?perspective=` query — F5 and shared deep links restore the exact session (router guard loads the row by id, applies the perspective, unknown ids land on Home; `Workspace.vue`'s onMounted redirect moved into the guard). `useSessionPersistence` (App.vue) mirrors `{projectId, perspective}` to localStorage and stamps `settings.lastPerspective` in-memory (rides autosave — feeds the table's Mode column). On launch, the first navigation redirects Home → last workspace once per launch (one-time flag, so logo/File ▸ Exit still reach Home), gated by the new `autoReopenLastProject` general setting (default on); Home also gained a `ResumeBanner` card for the exit-to-Home path and the setting-off mode. TopBar/keyboard `path === '/workspace'` checks fixed to accept id'd URLs.
Tags: `feat` `project-management`

#### Feat: Per-project layout persistence
<!-- id: task-1792838400000-16 -->
Remember each project's Golden Layout panel state (position, size, collapsed state, etc.) and restore it when the project is opened.
- [x] Done (Phase 5, 2026-11-01): DB v5 adds a nullable `layouts` object column (`Project.layouts` holds an opaque JSON config — golden-layout's recursive interfaces are kept out of Pinia's UnwrapRef to avoid TS2589). `GoldenLayout.vue` gains a `layoutId` prop: it registers the instance in the new `layout-bridge`, emits debounced + deduped `layout-change` events (`saveLayout()` → `LayoutConfig.fromResolved`), and emits a final state synchronously on unmount. Both perspectives reconcile the saved config against their live component registry via the pure `layout-reconcile.ts` (stale componentTypes dropped, emptied branches pruned with `activeItemIndex` clamping, missing types appended from the default config; 8 headless checks). `useLayoutPersistence` mirrors arrangements into `project.layouts` WITHOUT dirtying the project and, while clean, writes the column via the targeted `updateProjectLayouts` (no `updatedAt` stamp — panel drags don't reshuffle recents); while dirty, `persistCurrentProject`'s new `syncLiveLayouts()` carries the live arrangement with the row save. Flushes on pagehide and project switch.
Tags: `feat` `project-management` `layout`
