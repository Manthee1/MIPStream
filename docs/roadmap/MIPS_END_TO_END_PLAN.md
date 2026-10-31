# End-to-End MIPS Simulation — Phased Plan

> **Status:** Active plan, written 2026-10-23 from a code audit of the current
> tree. Related documents: [MVP_ROADMAP.md](./MVP_ROADMAP.md) (superseded
> phases), [SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md) (execution
> control semantics), [DESIGN_SPECIFICATION.md](../DESIGN_SPECIFICATION.md)
> §8–§9 (assembler & simulator state at time of writing).

## Goal — definition of "fully functional MIPS simulation"

A user can create a project from the **MIPS Single Cycle** template, write MIPS
assembly in the Simulate perspective, press Load/Run, and observe **correct**
results — register and memory values changing cycle-by-cycle on a real
datapath, with the expected final state after the program finishes.

Everything else (CodeMirror feature richness, pipelined CPUs, layout
persistence, Electron) is post-MVP and tracked in `todo.md`.

## Why this plan exists

The engine and all 22 hardware manifests are **implemented and verified**
(19/19 self-checks pass). What is missing is the *software → hardware* bridge
and the CPU itself. Audit summary:

| Subsystem | Status | Evidence |
| --- | --- | --- |
| Cycle-accurate engine (compile, topo sort, stepping, reset) | Implemented | `src/core/engine/**`, `npm run engine:check` |
| Hardware manifests (PC, imem, dmem, regfile, ALU, ALU-control, control, muxes, adder, extender, splitter, merger) | Implemented | `src/shared/manifests/index.ts` |
| Run/pause/step/stop control loop | Implemented | `src/composables/useSimulation.ts` |
| ISA/PDL data model + MIPS preset + settings UI | Implemented | `src/shared/types/isa.ts`, `src/config/isa-presets.ts` |
| Assembler that consumes the PDL | Implemented | `src/core/assembler/**`, `npm run assembler:check` |
| Load Program (assemble → write imem → reset) | Implemented | `src/core/simulation/**`, `npm run simulation:check` |
| MIPS single-cycle datapath | **Missing** | `BASIC_MIPS_ARCHITECTURE` has `modules: []`, `nets: []` |
| Real assembly editor panel | **Missing** | `CodeEditor.vue` is a static placeholder |
| Live regfile/imem/dmem panels in the Simulate layout | **Missing** | panels exist per-manifest but layout uses placeholders |

## Phase ordering & dependencies

```
Phase 1 (Assembler) ──▶ Phase 2 (Load Program) ──▶ Phase 5 (Validation)
Phase 3 (Datapath)  ─────────────────────────▶ Phase 5
Phase 4 (Simulate UI) ──▶ Phase 5   (Phases 1, 3 and 4 can run in parallel)
```

## The no-throwaway rule

Every step in this plan must be a **permanent foundation**, not scaffolding that
gets replaced. Concretely:

| Plan step | Foundation status |
| --- | --- |
| `src/core/assembler/` driven by `AssemblerConfig` (PDL) | Permanent — this *is* the long-term design (spec §8). The legacy assembler is the reference, not a base. |
| Diagnostics shape (line + column range) | Permanent — designed up front as the CodeMirror lint/diagnostics contract so no later reformatting pass is needed. |
| `loadProgram()` + typed engine write-back seam | Permanent — the documented Load/Start/Restart/Stop/Pause/Next-Step table is the final control spec; the *current* collapsed run/pause/stop in `useSimulation.ts` is the throwaway code this phase deletes. |
| Halt detection | Permanent if implemented at the **run-loop/controller layer** (not baked into the engine), so breakpoints/halt-instructions later extend rather than replace it. |
| Single-cycle datapath template | Permanent — a serialized netlist is data; the wiring-tool fixes in `todo.md` (segment deletion, ghost fidelity, Alt-drag) are editor concerns that cannot invalidate the netlist. Keep mapping-referenced designators (e.g. `imem`) stable. |
| CodeMirror editor skeleton (Phase 4) | Permanent — CodeMirror 6 is extension-based; a bare setup (line numbers, history, theme) is never discarded, later features are added as extensions. **No interim plain-text editor.** |
| Manifest panels mounted in `SimulateLayout` | Permanent — this is the intended panel architecture (spec §9.5). |

Conversely, these are **slated for deletion, never to be built upon**:
`src/legacy/**` (incl. the legacy assembler), `src/config/monaco/**`
(legacy-only consumers, no Monaco dependency exists), the placeholder
`CodeEditor.vue` / `RegistersPanel.vue` stubs, and `src/shared/utils/instructions.ts`
(stale imports; superseded by the Phase 1 assembler).

---

## Phase 1: Config-driven assembler (pure TypeScript)

> **Status: Complete (2026-10-24).** Implemented in `src/core/assembler/`
> (tokenize / sections / data-section / labels / operands / encoder / index)
> with a typed diagnostic contract in `src/shared/utils/errors.ts`
> (`AssemblerDiagnostic`: code + 1-based line + 0-based column range — the
> CodeMirror lint shape). Self-check: `npm run assembler:check` (golden
> bit-exact R/I encodings against real MIPS32, forward/backward branches,
> `.data` layout, register alias forms, multi-range scatter fields, type
> default layering, and every diagnostic class); `npm run check` runs engine +
> assembler checks. The MIPS preset was corrected to real MIPS32 semantics as
> part of this phase: field `ranges` rewritten LSB-indexed (they were authored
> MSB-indexed, inverting every field position under the LSB contract),
> `beq` opcode `0x23` → `0x04` (it collided with `lw`), `add`/`addi` operand
> order → `rd, rs, rt` / `rt, rs, imm`, and `nop` → zero operands.
> `assemble()` never throws — it returns diagnostics; failed lines keep their
> word slot so `pcLineMap` stays aligned. Documented handoff notes in
> `index.ts`: `label_absolute` uses instruction-index (word) addressing, and
> data labels map to byte offsets that Phase 2 must reconcile with the
> word-addressed dmem. `src/shared/utils/instructions.ts` deleted (superseded).

Re-implement the assembler outside `src/legacy/`, consuming the architecture's
`AssemblerConfig` (PDL) — no MIPS constants in code. The legacy
`Assembler.ts` is the behavioural reference for pass structure; its imports
are broken by design (pave-over), so port the logic, not the code.

- [x] **New module** `src/core/assembler/` (framework-free, same dependency
      rules as `src/core/engine/`): parser, label resolution, encoder,
      diagnostics, entry point `assemble(source, config)`.
- [x] **Parsing pass** — comments, `.data`/`.text` sections, label
      definitions, data directives (`.word`/`.byte`/`.half`), instruction lines
      split into mnemonic + operands.
- [x] **Label pass** — build `label → instruction index` and
      `label → data address` maps (full pre-pass so forward branches resolve).
- [x] **Encoding pass** — per instruction: map operands to fields using the
      operand type vocabulary (`register`, `raw_value`, `label_absolute`,
      `label_relative`, `memory_address`), then fold values into the field
      `ranges` (LSB-indexed, inclusive, multi-range legal).
- [x] **Register resolution** — `$t0`/`$s0` and raw `R1`/`R2` forms, driven by
      the shared register tables (`src/shared/utils/registers.ts`), not
      hardcoded lists.
- [x] **Diagnostics** — typed errors carrying **line and column range**
      (extend the `lineNumber`-only shape in `src/shared/utils/errors.ts`),
      designed up front as the CodeMirror lint/gutter contract so the later
      editor integration consumes them without a reformatting pass. Classes:
      unknown mnemonic, operand count/type mismatch, undefined label,
      out-of-range immediate or branch offset, invalid register.
- [x] **Output contract** — `{ instructions, pcLineMap, labels, memory,
      dataMemoryReferences }` mirroring the legacy output shape; `pcLineMap`
      is the future current-instruction highlighter's data source.
- [x] **Self-check** — extend the engine-check harness (or add an
      `assembler:check` script) with golden encode cases for R/I/J-format
      instructions, labels, `.data` layout, and every error class.

**Exit criteria:** assembling preset MIPS programs from pure config produces
bit-exact words; every diagnostic class has a test.

## Phase 2: Load Program & the full control state machine

> **Status: Complete (2026-10-24).** Implemented as a framework-free control
> core in `src/core/simulation/` (`types.ts` / `program-loader.ts` /
> `simulation-session.ts`) with `useSimulation.ts` rewritten as the thin
> Vue/Pinia adapter. Statuses: `unloaded | paused | running | stopped |
> finished` (see SIMULATOR_OVERVIEW §4, updated with the Finished state).
> Halt = PC running past the last assembled instruction, checked at the
> controller layer per cycle (a `halt` mnemonic joins in Phase 3 at the same
> seam; pipeline in-flight draining deferred). Self-check:
> `npm run simulation:check` (101 checks — image write-through incl.
> one-to-many mappings and `.data` LE word packing, capacity/mapping
> validation, the full transition table, empty- and mapping-less-program
> semantics, and Rig B: a minimal executable datapath over the real pure
> logic modules that runs preset-ISA `add` programs with per-cycle memory
> transitions, exact halt timing, restart and batched `advance()`).
> `npm run check` now chains engine + assembler + simulation checks.
> Conventions recorded: `.data` images are written to **every** `std.dmem`
> in mapping order (explicit data-memory mapping deferred); Stop preserves
> state for post-mortem inspection (the old reset-on-Stop moved to Restart);
> Next Step auto-loads when unloaded so mapping-less netlists stay
> steppable. **Phase 3 handoff (found early):** the classic single-cycle
> writeback wiring (regfile → ALU → regfile.wd) is a module-granularity
> combinational cycle under the engine's topological sort and will NOT
> compile — the datapath design must resolve this (e.g. an edge-triggered
> register-file write path). Also note: level-sensitive modules commit
> writes during the post-load settle, so instruction 0's side-effects are
> visible immediately after Load (final states and cycle counts stay exact).

Implement the missing first row of the control table in
[SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md) §4, plus program
termination — currently nothing exists between "assemble" and "engine".

- [x] **`loadProgram()`** in `useSimulation.ts`: assemble every editor whose
      `assembler.mappings` row targets instruction memories → write the
      `instructions` image into each mapped `std.imem`'s engine-owned
      `WordMemoryState` → write the `.data` image into data memory →
      `reset()` → status **paused at instruction 0**.
- [x] **Engine write-back seam** — a typed API on `SimulationEngine`
      (e.g. `writeModuleState(designator, state)`) instead of ad-hoc buffer
      poking; keep the hot path allocation-free. *(Implemented as
      `mutateModuleState` — in-place mutation, never replaces the
      closure-captured state object — plus a public `settle()`.)*
- [x] **Control state machine** — move from the collapsed run/pause/stop/step
      to the documented table: Load / Start / Restart / Stop / Pause /
      Next Step, with correct prerequisites and resulting states.
- [x] **Halt semantics** — decide and implement "program finished" detection
      (candidates: PC running past the last assembled instruction, a dedicated
      `halt` mnemonic, or a `$finish` convention). The run loop must stop and
      report completion instead of spinning forever. *(Chosen: PC-past-end at
      the controller layer; `halt` mnemonic to extend it in Phase 3.)*
- [x] **Restart** — reset PC/registers/memory flags to the *loaded* state;
      re-assemble only when the source changed since the last load.

**Exit criteria:** from a headless harness, a project with the preset MIPS
config can load a program, run it to completion, and report the correct final
register state — before any UI is involved.

## Phase 3: Build the single-cycle MIPS datapath template

`BASIC_MIPS_ARCHITECTURE` (`src/config/templates.ts`) was an empty
shell. Build the real CPU once — this doubles as the end-to-end exercise
of every manifest and the engine.

> **Status: Complete (2026-10-24).** The template ships a complete,
> lint-clean, machine-validated single-cycle datapath. **Deviation from the
> original approach (deliberate):** the netlist was authored as typed
> framework-free data in `src/config/mips-single-cycle-datapath.ts`
> (18 modules / 33 nets, classic P&H left-to-right layout) rather than
> drawn first in the Design perspective — so the *shipped* template object
> itself is executable by a headless golden rig (**Rig C** in
> `npm run simulation:check`: the mips-basic template's own architecture +
> configuration + starter program, run through mirror manifests over the
> real pure logic). The Design perspective remains the visual-verification
> / polish step (positions are authored; routing waypoints are optional).
>
> **Writeback-cycle resolution (the Phase 2 handoff):** the engine gained a
> **hybrid module capability** — `ModuleEvaluators.clocked` (an
> edge-sampled `commit` alongside the combinational read evaluator; a port
> may feed both). The compiler emits the commit as a zero-output entry in
> the clocked edge lists and exempts clocked-only input nets from the
> topological sort, and the designer lint applies the same exemption via
> the resolver's `clockedOnlyInputs` (one source, two consumers). The
> register file and data memory are now hybrid (async read /
> rising-clocked write — real hardware semantics): the writeback path
> (`reg → alu → wbMux → reg.wd`) is a clock boundary, not a combinational
> loop, and instruction k's writeback commits on the edge entering cycle
> k+1 — adjacent read-after-write and exact cycle counts hold (Rig B
> updated; engine-smoke §6c/§6d added). Rejected alternatives, for the
> record: an external latch module loses instruction 0's writeback
> (falling-edge) or makes every instruction miss the previous
> instruction's write (rising-edge).
>
> **Also in this phase:** the `halt` instruction joined at the promised
> controller-layer seam (preset entry, opcode `0x3f`; `buildLoadPlan`
> encodes it onto `LoadPlan.haltWord`; the session finishes *before*
> executing it — the natural terminator for loops; PC-past-end remains the
> fallback). `slt` was added to the preset (the datapath already decoded
> it); the control table gained its missing `addi` row, and **Rig C caught
> and fixed a real default-table bug: `lw` had `memToReg: 0`** (the
> writeback mux selected the ALU's address instead of the loaded word).
> Rig C golden coverage: arithmetic with adjacent read-after-write, `slt`,
> `$zero` write attempts, `lw`/`sw` with `.data` labels, `beq`
> taken/not-taken/backward (exact 13-cycle loop count), the halt word
> (exact timing), PC-past-end with past-end no-op proof, full reload
> semantics, and the shipped starter program (square-by-repeated-addition,
> 38 cycles, exact final register/memory state). `npm run check` — engine
> (incl. hybrid) + assembler (incl. `slt`/`halt` goldens) + simulation all
> green; `vue-tsc --noEmit` zero new errors (stash-baseline diff 317 = 317).

- [x] **Place the datapath modules** — PC, PC+4 adder (+ constant 4),
      instruction memory, splitter (opcode/rs/rt/rd/funct/imm — the rd and
      imm fields deliberately overlap), register file, control unit, ALU
      control, ALU, ALU-src mux, writeback mux, register-destination mux
      (5-bit), branch adder, branch AND gate, shift-left-2, sign extender,
      data memory, and the next-PC mux.
- [x] **Wire the complete netlist** — fetch path, decode/control fan-out,
      execute path, memory path, writeback path, and the next-PC mux
      selection (PC+4 / branch target `(PC+4) + signext(imm)<<2`). Zero
      errors *and* zero warnings, asserted by Rig C; the shared engine lint
      accepts the hybrid writeback loop (engine-smoke §6c/§6d).
- [x] **Configure components** — control-unit decode table for the preset
      instruction set (`add`, `addi`, `lw`, `sw`, `beq`, `nop`, plus `slt`
      and the row-less `halt`), imem 256 words, dmem 256 words, regfile
      32×32.
- [x] **Freeze the template** — the datapath data module is imported
      directly into `BASIC_MIPS_ARCHITECTURE`'s `modules`/`nets` (the same
      object, reference-asserted by Rig C), keeping the already-correct
      `configuration` (pipeline off, `main → imem` mapping, MIPS ISA
      preset). Designators `imem` (mapping target) and `pc` (halt
      detection) are documented as load-bearing.
- [x] **Starter program** — square-by-repeated-addition (`.data` value/
      result, `lw`/`addi`/`add`/`slt`/`beq` loop/`sw`/`halt`), executed by
      Rig C to its exact final state (49, 38 cycles).

**Exit criteria:** opening a new project from the template shows a complete,
lint-clean single-cycle datapath whose designators match the assembler mapping
targets. *(Machine-checked headlessly; the visual pass in the Design
perspective is the remaining human step.)*

## Phase 4: Finish the Simulate perspective (minimal, not fancy)

The minimum UI needed to exercise Phases 1–3 — built on permanent foundations
(no-throwaway rule above), never as interim scaffolding.

> **Status: Complete (2026-10-29).** Pure UI — zero changes under `src/core/**`
> (the 276 harness checks and the vue-tsc baseline 317 are untouched). What
> shipped:
>
> - **CodeMirror 6 editor** — `codemirror` + `@codemirror/view/state/commands`
>   installed; `CodeEditor.vue` (placeholder deleted) hosts a `basicSetup`
>   instance via the new `useCodeMirror` composable: line numbers, history,
>   active-line, a token-driven jagged theme in a `Compartment` (retheming
>   never rebuilds the document), and the diagnostics-reveal primitive
>   (1-based line / 0-based column range — consuming the Phase 1 contract
>   verbatim). Theme flips ride the app-wide `theme-change` window event
>   (the `App.vue` pattern — `useTheme()` refs are per-instance and would
>   never fire). The instance binds the mapped `ProjectEditor.sourceCode`
>   two-way; edits mark the project unsaved.
> - **Load + diagnostics** — an Assemble/Load button in the editor panel
>   header (plus TopBar) and a diagnostics strip under the editor rendering
>   `assemblerDiagnostics` + `loadErrors`, click-to-reveal in the editor.
> - **Manifest panels mounted** — new generic `ModulePanelHost.vue` resolves
>   module → manifest → `manifest.panel`, supplies the resolved config
>   (defaults + instance config, engine-injected `state` stripped) plus the
>   engine-owned live state via `getModuleState`, and a sampling revision
>   counter (`useEngineRevision` — bumps only when status/cycle-count
>   changed, honoring the `ModulePanelProps` contract without idle 60fps
>   table re-renders). `SimulateLayout.vue` discovers panel tabs
>   **data-driven** (any architecture's panel-capable modules get tabs; one
>   editor tab per assembler-mapping editor id) — Golden Layout components
>   receive no props, so per-module wrappers bind `designator`/`editorId`.
>   The throwaway `RegistersPanel.vue` was deleted.
> - **Viewer panning** — `EventManager` gained `canPanWithPrimary`; in viewer
>   mode (where module nodes are non-draggable and the left button was dead)
>   left-drag now pans 1:1, mirroring the right-button pan. Wheel zoom and
>   right-drag were already active in viewer mode.
> - **Control set** — TopBar gained Load (F7) and Restart (F9) beside
>   Run/Pause/Stop/Step with table-correct disabled predicates, plus the
>   finished-at-cycle annotation. Help docs' stale legacy shortcut tables
>   (F6/F8/F9/Shift-F5) were rewritten to the real bindings.
> - **Tailwind theme bridge** — a `@theme inline` block in `index.css` maps
>   the app tokens onto utility names (`bg-surface`, `bg-app`,
>   `border-border-color`, …); these classes were previously inert (no
>   `@theme` existed — backgrounds came from `golden-layout-theme.css`).
> - **Packaging** — CodeMirror is chunked as `vendor_codemirror` in
>   `vite.config.ts` manualChunks: adding it to `vendor_misc` pushed that
>   chunk from 4.88 MB past the configured 5 MB PWA precache cap
>   (`workbox.maximumFileSizeToCacheInBytes`), which vite-plugin-pwa treats
>   as a hard build error. Isolated chunk: 380 kB; `vendor_misc` back to
>   4.89 MB; build exit 0.
>
> Validation: `npm run check` all green (engine + assembler + simulation);
> `vue-tsc --noEmit` 317 = baseline (zero new errors, rigorous grep diff);
> `npx vite build` exit 0 (verified against the stash-baseline tree, which
> also builds — the only build regression was the precache cap, fixed by the
> chunk split). README stack line updated (Monaco → CodeMirror). **Remaining
> human step:** the live visual pass — new project from "MIPS Single Cycle",
> Load/Run/Step, watch the panels, flip the theme, pan the viewer. Phase 5's
> golden suite already overlaps Rig C; the plan's Goal is now one manual pass
> away.

- [x] **CodeMirror 6 editor skeleton** — install `codemirror` (plus
      `@codemirror/view`, `@codemirror/state`) and replace the `CodeEditor.vue`
      placeholder with a bare CodeMirror instance: line numbers, edit history,
      theme synced to the app's light/dark tokens. **No interim plain-text
      editor** — the skeleton is the foundation every later feature is
      attached to as an extension, so nothing here is discarded later.
- [x] **Editor wiring** — bind the instance to the project editor's
      `sourceCode` (`ProjectEditor` already exists in the model), add an
      **Assemble/Load button**, and surface Phase 1 diagnostics (line + column)
      as an error list rendered beside the editor. Rich features
      (highlighting, lint decorations, completion, go-to-def) are later
      extensions on this same instance.
- [x] **Mount the live data panels** — replace the placeholder Registers and
      Memory panels in `SimulateLayout.vue` with the existing manifest panels
      (`register-file/Panel.vue`, `instruction-memory/Panel.vue`,
      `data-memory/Panel.vue`), driven by the engine's `moduleStates` and the
      revision counter.
- [x] **Viewer panning** — enable panning in viewer mode (the `EventManager`
      machinery already exists; this is the todo "schematic viewer panning"
      item and a predicate change, not new machinery).
- [x] **Control buttons** — surface Load/Run/Restart/Pause/Step/Stop in the
      TopBar, mapped onto the Phase 2 state machine.

**Exit criteria:** a user can write code, load it, run/step it, and watch the
register and memory panels update — entirely in the active UI.

## Phase 5: End-to-end validation

Prove correctness against known MIPS semantics. Bugs found here loop back
into Phases 1–3.

> **Status: Complete (2026-10-29).** Audit outcome: the golden program suite
> was already machine-checked by Rig C in `npm run simulation:check` (the
> shipped mips-basic template's own architecture + configuration run through
> the real pure logic) — R-type arithmetic with adjacent read-after-write,
> `addi`, `lw`/`sw` through `.data` labels, `beq` taken/not-taken and
> forward/backward (with bit-exact offset goldens in `assembler:check`),
> `slt`, `$zero` write absorption, the `halt` word, PC-past-end with a
> past-end no-op proof, full reload semantics, and the shipped starter
> program to its exact 38-cycle final state. The one genuine gap was
> **cycle-level expectations**: cycle *counts* were exact but per-cycle
> register/memory transitions were only proven on Rig B's minimal netlist.
> **Rig D** was added to `simulation-smoke.ts` for exactly that: a mixed
> program (arithmetic, `lw`/`sw`, not-taken + taken-forward branches, a
> deliberately skipped instruction) stepped ONE cycle at a time through the
> golden datapath, asserting the exact register, memory and PC state after
> every cycle — one instruction per cycle (7 instructions / 7 cycles), each
> writeback committing on the edge entering the next cycle (the `sw` store
> visible exactly one cycle after the `add` result it stores; instruction 0
> computed-but-not-executed after Load), a not-taken branch falling through,
> a taken forward branch landing on its target, the skipped instruction
> provably never executed, and the halt word finishing without consuming a
> cycle. **Fix loop: zero mismatches — every check green on the first run.**
> Validation: `npm run check` (engine + assembler + simulation, now incl.
> Rig D), `vue-tsc --noEmit` at the 317 pre-existing baseline, `npx vite
> build` exit 0. The user completed the live UI pass on the MIPS Single
> Cycle template (Load/Run/Step, panels, program edits reflecting correctly)
> on 2026-10-29 — the Goal section is true.

- [x] **Golden program suite** — R-type arithmetic, `addi`, `lw`/`sw` with
      `.data` labels, `beq` taken and not-taken, forward and backward branch
      offsets, `slt`, `$zero` write attempts, and running past the last
      instruction (halt path).
- [x] **Cycle-level expectations** — for single-cycle MIPS, one instruction
      per cycle; verify per-cycle register/memory transitions, not just the
      final state.
- [x] **Fix loop** — triage every mismatch to the assembler, the datapath
      wiring, or the engine, and re-run until green.
- [x] **Record the results** — update this document and the status tables in
      [DESIGN_SPECIFICATION.md](../DESIGN_SPECIFICATION.md) §1.6/§8.10/§9.8
      (Partial → Implemented), and tick the corresponding `todo.md` items.

**Exit criteria:** the Goal section at the top of this document is true.

---

## Deferred until after the MVP (tracked in `TODO.kanban.md`, not here)

CodeMirror editor features (highlighting, autocomplete, lint, go-to-def,
current-instruction highlighting), pipelined MIPS variants and stage-register
features, ALU/control remapping UI, architecture import/export and templates,
project autosave/layout persistence, Electron, and all designer ergonomics
fixes. Those are refinements at existing seams; none of them block a working
single-cycle MIPS simulation.
