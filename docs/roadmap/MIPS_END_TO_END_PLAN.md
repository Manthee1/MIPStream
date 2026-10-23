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
| Assembler that consumes the PDL | **Missing** | only `src/legacy/core/Assembler.ts` (not in the build) |
| Load Program (assemble → write imem → reset) | **Missing** | no write-back path in active code |
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

Re-implement the assembler outside `src/legacy/`, consuming the architecture's
`AssemblerConfig` (PDL) — no MIPS constants in code. The legacy
`Assembler.ts` is the behavioural reference for pass structure; its imports
are broken by design (pave-over), so port the logic, not the code.

- [ ] **New module** `src/core/assembler/` (framework-free, same dependency
      rules as `src/core/engine/`): parser, label resolution, encoder,
      diagnostics, entry point `assemble(source, config)`.
- [ ] **Parsing pass** — comments, `.data`/`.text` sections, label
      definitions, data directives (`.word`/`.byte`/`.half`), instruction lines
      split into mnemonic + operands.
- [ ] **Label pass** — build `label → instruction index` and
      `label → data address` maps (full pre-pass so forward branches resolve).
- [ ] **Encoding pass** — per instruction: map operands to fields using the
      operand type vocabulary (`register`, `raw_value`, `label_absolute`,
      `label_relative`, `memory_address`), then fold values into the field
      `ranges` (LSB-indexed, inclusive, multi-range legal).
- [ ] **Register resolution** — `$t0`/`$s0` and raw `R1`/`R2` forms, driven by
      the shared register tables (`src/shared/utils/registers.ts`), not
      hardcoded lists.
- [ ] **Diagnostics** — typed errors carrying **line and column range**
      (extend the `lineNumber`-only shape in `src/shared/utils/errors.ts`),
      designed up front as the CodeMirror lint/gutter contract so the later
      editor integration consumes them without a reformatting pass. Classes:
      unknown mnemonic, operand count/type mismatch, undefined label,
      out-of-range immediate or branch offset, invalid register.
- [ ] **Output contract** — `{ instructions, pcLineMap, labels, memory,
      dataMemoryReferences }` mirroring the legacy output shape; `pcLineMap`
      is the future current-instruction highlighter's data source.
- [ ] **Self-check** — extend the engine-check harness (or add an
      `assembler:check` script) with golden encode cases for R/I/J-format
      instructions, labels, `.data` layout, and every error class.

**Exit criteria:** assembling preset MIPS programs from pure config produces
bit-exact words; every diagnostic class has a test.

## Phase 2: Load Program & the full control state machine

Implement the missing first row of the control table in
[SIMULATOR_OVERVIEW.md](../SIMULATOR_OVERVIEW.md) §4, plus program
termination — currently nothing exists between "assemble" and "engine".

- [ ] **`loadProgram()`** in `useSimulation.ts`: assemble every editor whose
      `assembler.mappings` row targets instruction memories → write the
      `instructions` image into each mapped `std.imem`'s engine-owned
      `WordMemoryState` → write the `.data` image into data memory →
      `reset()` → status **paused at instruction 0**.
- [ ] **Engine write-back seam** — a typed API on `SimulationEngine`
      (e.g. `writeModuleState(designator, state)`) instead of ad-hoc buffer
      poking; keep the hot path allocation-free.
- [ ] **Control state machine** — move from the collapsed run/pause/stop/step
      to the documented table: Load / Start / Restart / Stop / Pause /
      Next Step, with correct prerequisites and resulting states.
- [ ] **Halt semantics** — decide and implement "program finished" detection
      (candidates: PC running past the last assembled instruction, a dedicated
      `halt` mnemonic, or a `$finish` convention). The run loop must stop and
      report completion instead of spinning forever.
- [ ] **Restart** — reset PC/registers/memory flags to the *loaded* state;
      re-assemble only when the source changed since the last load.

**Exit criteria:** from a headless harness, a project with the preset MIPS
config can load a program, run it to completion, and report the correct final
register state — before any UI is involved.

## Phase 3: Build the single-cycle MIPS datapath template

`BASIC_MIPS_ARCHITECTURE` (`src/config/templates.ts`) is currently an empty
shell. Build the real CPU once, by hand, in the Design perspective — this
doubles as the end-to-end exercise of every manifest and the engine.

- [ ] **Place the datapath modules** — PC, instruction memory, register file,
      control unit, ALU control, ALU, writeback mux, ALU-src mux, branch
      adder, PC+4 adder, sign extender, data memory, and the
      splitter/merger needed to dissect the instruction word into fields.
- [ ] **Wire the complete netlist** — fetch path, decode/control fan-out,
      execute path, memory path, writeback path, and the
      next-PC mux selection (PC+4 / branch target). Use the Problems panel
      (shared engine lint) until zero errors/warnings.
- [ ] **Configure components** — control-unit decode table for the preset
      instruction set (`add`, `addi`, `lw`, `sw`, `beq`, `nop`), imem word
      count, dmem word count, regfile width.
- [ ] **Freeze the template** — serialize the finished diagram
      (`serializeArchitecture`) into `BASIC_MIPS_ARCHITECTURE`'s
      `modules`/`nets`, keeping the already-correct `configuration`
      (pipeline off, `main → imem` mapping, MIPS ISA preset).
- [ ] **Starter program** — replace the template's placeholder source with a
      meaningful default (`.data` + `.text` skeleton, or the classic
      multiply example from the legacy store).

**Exit criteria:** opening a new project from the template shows a complete,
lint-clean single-cycle datapath whose designators match the assembler mapping
targets.

## Phase 4: Finish the Simulate perspective (minimal, not fancy)

The minimum UI needed to exercise Phases 1–3 — built on permanent foundations
(no-throwaway rule above), never as interim scaffolding.

- [ ] **CodeMirror 6 editor skeleton** — install `codemirror` (plus
      `@codemirror/view`, `@codemirror/state`) and replace the `CodeEditor.vue`
      placeholder with a bare CodeMirror instance: line numbers, edit history,
      theme synced to the app's light/dark tokens. **No interim plain-text
      editor** — the skeleton is the foundation every later feature is
      attached to as an extension, so nothing here is discarded later.
- [ ] **Editor wiring** — bind the instance to the project editor's
      `sourceCode` (`ProjectEditor` already exists in the model), add an
      **Assemble/Load button**, and surface Phase 1 diagnostics (line + column)
      as an error list rendered beside the editor. Rich features
      (highlighting, lint decorations, completion, go-to-def) are later
      extensions on this same instance.
- [ ] **Mount the live data panels** — replace the placeholder Registers and
      Memory panels in `SimulateLayout.vue` with the existing manifest panels
      (`register-file/Panel.vue`, `instruction-memory/Panel.vue`,
      `data-memory/Panel.vue`), driven by the engine's `moduleStates` and the
      revision counter.
- [ ] **Viewer panning** — enable panning in viewer mode (the `EventManager`
      machinery already exists; this is the todo "schematic viewer panning"
      item and a predicate change, not new machinery).
- [ ] **Control buttons** — surface Load/Run/Restart/Pause/Step/Stop in the
      TopBar, mapped onto the Phase 2 state machine.

**Exit criteria:** a user can write code, load it, run/step it, and watch the
register and memory panels update — entirely in the active UI.

## Phase 5: End-to-end validation

Prove correctness against known MIPS semantics. Bugs found here loop back
into Phases 1–3.

- [ ] **Golden program suite** — R-type arithmetic, `addi`, `lw`/`sw` with
      `.data` labels, `beq` taken and not-taken, forward and backward branch
      offsets, `slt`, `$zero` write attempts, and running past the last
      instruction (halt path).
- [ ] **Cycle-level expectations** — for single-cycle MIPS, one instruction
      per cycle; verify per-cycle register/memory transitions, not just the
      final state.
- [ ] **Fix loop** — triage every mismatch to the assembler, the datapath
      wiring, or the engine, and re-run until green.
- [ ] **Record the results** — update this document and the status tables in
      [DESIGN_SPECIFICATION.md](../DESIGN_SPECIFICATION.md) §1.6/§8.10/§9.8
      (Partial → Implemented), and tick the corresponding `todo.md` items.

**Exit criteria:** the Goal section at the top of this document is true.

---

## Deferred until after the MVP (tracked in `todo.md`, not here)

CodeMirror editor features (highlighting, autocomplete, lint, go-to-def,
current-instruction highlighting), pipelined MIPS variants and stage-register
features, ALU/control remapping UI, architecture import/export and templates,
project autosave/layout persistence, Electron, and all designer ergonomics
fixes. Those are refinements at existing seams; none of them block a working
single-cycle MIPS simulation.
