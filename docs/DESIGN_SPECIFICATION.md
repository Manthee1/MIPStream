# MIPStream — Design Specification

> Technical design chapter for a browser-based digital-logic schematic editor and
> computer-architecture simulator.

**Document scope.** This document describes the architecture of the MIPStream
application as it exists in the repository at the time of writing, together with
the design intent for features that are specified but not yet implemented. Every
statement about current behaviour is traceable to a file under `src/`; every
statement about future behaviour is explicitly labelled **Planned** and sourced
from `todo.md`.

**Status vocabulary.** Three labels are used throughout:

| Label | Meaning |
| --- | --- |
| **Implemented** | Present in the running application and exercised by the build or the engine self-check. |
| **Partial** | The mechanism exists but is not wired into the active application, or covers only part of the intended behaviour. |
| **Planned** | Specified design intent only; no implementation exists yet. |

---

## Table of Contents

1. [Introduction and Design Goals](#1-introduction-and-design-goals)
2. [Technology Stack and Code Organisation](#2-technology-stack-and-code-organisation)
3. [Unified Project Model and the Three Data Layers](#3-unified-project-model-and-the-three-data-layers)
4. [The Component Manifest System](#4-the-component-manifest-system)
5. [The Simulation Engine](#5-the-simulation-engine)
6. [The Schematic Designer](#6-the-schematic-designer)
7. [Architecture Configuration](#7-architecture-configuration)
8. [Processor Description Language and Assembler](#8-processor-description-language-and-assembler)
9. [The Simulator View](#9-the-simulator-view)
10. [User Interface, Layout and Theming](#10-user-interface-layout-and-theming)
11. [Project Management and Persistence](#11-project-management-and-persistence)
12. [Planned Features and Design Intent](#12-planned-features-and-design-intent)
13. [Design Rationale and Trade-offs](#13-design-rationale-and-trade-offs)
- [Appendix A — File-Level Responsibility Map](#appendix-a--file-level-responsibility-map)
- [Appendix B — Glossary](#appendix-b--glossary)
- [Appendix C — Validation Procedure and Results](#appendix-c--validation-procedure-and-results)

---

## 1. Introduction and Design Goals

### 1.1 What MIPStream is

MIPStream is a single-page web application in which a user designs the
microarchitecture of a processor as a schematic, defines the instruction-set
encoding that the processor is supposed to execute, writes assembly programs
against that encoding, and then runs those programs cycle-by-cycle on the
schematic they built.

The application is organised around two *perspectives* over the same project:

- the **Design perspective**, an unlocked schematic canvas with a component
  palette, a property inspector, wiring tools and a live lint report;
- the **Simulate perspective**, the same canvas locked into a read-only viewer
  that is overlaid with live signal values, alongside execution controls, an
  assembly editor and data panels.

Both perspectives read and write a single entity, the `Project`, which is the
unit of persistence.

### 1.2 The problem the design addresses

Tools in the computer-architecture teaching space typically fall into one of two
camps, and neither closes the loop between hardware and software:

1. **Digital-logic editors** (for example Logisim or Digital) let a student build
   and simulate arbitrary synchronous circuits, but they have no notion of an
   instruction set, an assembler, or a program counter. Building a CPU is
   possible; running a program on it is not, except by hand-driving input pins.
2. **CPU simulators** (for example MARS, QtSPIM or Ripes) let a student write and
   run assembly, and some visualise a datapath, but the datapath is fixed in the
   simulator's source code. The student inspects someone else's CPU.

MIPStream's premise is that the artefact a student should produce is the
*combination*: a datapath, an encoding, and a program, each of which can be
changed independently and each of which constrains the others. Consequently the
architecture must not hard-code MIPS, and the core must not hard-code the
instruction set that the user has defined.

### 1.3 Design goals

The following goals are the criteria against which the design decisions in this
chapter are justified.

| ID | Goal | Consequence in the design |
| --- | --- | --- |
| **G1** | One project artefact contains hardware, software and configuration. | `Project` owns `architecture` (netlist + configuration) and `software` (editors). §3.1. |
| **G2** | The core is instruction-set agnostic. | No MIPS constant appears in `src/core/`; ISA data is user configuration consumed by the assembler. §8. |
| **G3** | Simulation is cycle-accurate, deterministic and independent of the UI framework. | `SimulationEngine` is plain TypeScript over flat `Uint32Array` storage; Vue never drives cycles. §5. |
| **G4** | The designer and the engine validate against one source of truth. | `resolveArchitecture` is shared by compiler and lint. §5.2, §6.13. |
| **G5** | New hardware component types require no changes to the engine or the designer. | The manifest registry is the extension point. §4. |
| **G6** | The editor's interaction logic is testable and framework-free. | `SchematicDesigner` plus eight manager classes are pure TypeScript; Vue only hosts them. §6. |
| **G7** | One rendering pipeline serves editing and runtime observation. | Viewer mode is an `EditorMode` flag, not a second diagram. §6.4, §9.2. |
| **G8** | All persisted state is JSON-safe and forward-migratable. | Three-layer model with explicit serialisation and normalisation. §3, §7.8. |

### 1.4 Non-goals

The current design deliberately excludes the following, and the exclusion is
reflected in the data model rather than merely deferred:

- **Timing, area and power analysis.** Wires carry values only; there is no
  propagation delay, no clock tree, and no physical dimension.
- **Analogue or multi-valued logic.** Every net carries one unsigned 32-bit
  word. There is no high-impedance state and no unknown (`X`) value; an undriven
  input reads a constant zero (§5.3).
- **Multiple clock domains.** There is exactly one master clock with rising,
  falling and both-edge sensitivity.
- **Execution backtracking.** The engine is forward-only; `reset()` rewinds to
  the initial state but there is no step-back history (§9.6, §12.2).
- **HDL import/export and netlist interchange formats.** The serialised
  architecture is a private JSON schema (§3.4).
- **Collaborative editing.** Persistence is a local IndexedDB database.

### 1.5 Terminology

| Term | Definition |
| --- | --- |
| **Module** | An instance of a component type on the canvas, identified by a *designator* (`u1`, `u2`, …). |
| **Manifest** | The static definition of a component type: ports, evaluator, configuration schema, rendering. |
| **Port** | A named, directed, fixed-width connection point on a module. |
| **Net** | A single-driver, multi-target connection from one output port to one or more input ports. |
| **Wire** | The rendered geometry of a net, including waypoints and fan-out branches. |
| **Slot** | One index in the engine's global `Uint32Array` signal buffer. |
| **Cycle** | One invocation of `SimulationEngine.step()`: a rising edge, a combinational settle, and — when required — a falling edge and a second settle. |
| **PDL** | Processor Description Language: the configurable description of instruction fields, formats and the instruction set. |
| **Perspective** | The top-level workspace mode: Design or Simulate. |

### 1.6 Requirement status at the time of writing

A design document that conflates implemented and intended behaviour is not
useful as an engineering record. The table below therefore summarises the state
of each major subsystem; the detailed sections repeat the label where it
matters.

| Subsystem | Status | Evidence |
| --- | --- | --- |
| Three-layer data model and serialisation | Implemented | `src/shared/types`, `src/shared/serialization.ts` |
| Component manifest registry (22 manifests) | Implemented | `src/shared/manifests/index.ts` |
| Compile → topological sort → cycle-accurate stepping | Implemented | `src/core/engine`; 19/19 self-checks pass |
| Designer lint shared with engine resolver | Implemented | `src/core/engine/lint.ts` |
| Schematic editing, routing, wire dragging, clipboard | Implemented | `src/editor/core` |
| Editor undo/redo history | Implemented | `src/editor/core/history.ts`, toolbar via `history-bridge.ts` (§6.17) |
| Architecture settings (pipeline, assembler mapping, ISA) | Implemented | `src/editor/components/settings` |
| Managed pipeline stage registers | Implemented | `src/shared/utils/stage-registers.ts` |
| Simulate perspective with live signal overlay | Implemented | `src/simulator`, `SchematicViewer.vue` |
| Assembly editor in the Simulate perspective | Implemented | `CodeEditor.vue` — CodeMirror 6 instance with token-synced theme, Load action and diagnostics strip (`useCodeMirror.ts`) |
| Assembler execution path | Implemented | `src/core/assembler/**` (config-driven, Phase 1), wired to the UI through `buildLoadPlan` and the editor diagnostics list |
| Monaco language services | Superseded | `src/config/monaco*` is legacy-only and slated for deletion; CodeMirror 6 is the editor stack |
| Undo/redo, autosave, layout persistence, export/import | Partially planned | undo/redo implemented (§6.17); autosave, layout persistence and export/import remain in `todo.md` |

---

## 2. Technology Stack and Code Organisation

### 2.1 Runtime stack

Versions are taken from `package.json`.

| Concern | Technology | Version | Role |
| --- | --- | --- | --- |
| UI framework | Vue | 3 | Composition API, Single-File Components |
| State | Pinia | ^3.0.1 | Project, simulation, UI and settings stores |
| Routing | Vue Router | ^4.3.2 | Two routes: `/` and `/workspace` |
| Component library | Naive UI | ^2.45.3 | Dialogs, tables, tabs, inputs, notifications |
| Styling | Tailwind CSS | ^4.3.3 | Utility-first layout and the design-token bridge |
| Class composition | `clsx`, `tailwind-merge` | ^2.1.1 / ^3.7.0 | Conditional and de-duplicated class lists |
| Docking layout | Golden Layout | ^2.6.0 | Resizable, tabbable panel trees in both perspectives |
| Canvas | Konva / vue-konva | ^10.7.0 / ^4.0.1 | Imperative schematic rendering |
| Persistence | JsStore | ^4.9.0 | IndexedDB object store with a worker injector |
| Icons | `@tabler/icons-vue` | ^3.48.0 | All iconography |
| Build | Vite | ^6.2.2 | Dev server, production build, SSR bundle for the engine check |
| Type checking | `vue-tsc` | ^2.2.8 | Part of `npm run build` |
| PWA | `vite-plugin-pwa` | ^1.2.0 | Offline shell and installable manifest |
| Markdown | `unplugin-vue-markdown` | ^28.3.1 | Manifest descriptions are imported as raw strings |

Two artefacts of the stack deserve explicit comment because they are frequently
misreported:

- **Monaco is not an active dependency.** `src/config/monaco.ts` and its
  providers exist, and `README.md` still lists Monaco as the editor, but
  `monaco-editor` is absent from `package.json`, and the only consumers of
  `src/config/monaco*` are files under `src/legacy/`. The active Simulate
  perspective renders a placeholder editor (§9.8). The intended replacement is a
  CodeMirror-based editor (Planned, §12.1).
- **Radix Vue is not used.** `README.md` mentions it, but no Radix or Reka package
  is declared or imported. All overlay and form primitives come from Naive UI.

### 2.2 Layered code organisation

The source tree is partitioned by responsibility, and dependencies point
inwards towards `shared/` and `core/`:

```
src/
├── core/engine/          Headless simulation: resolver, compiler, wire index,
│                         topological sort, engine, lint, self-check
├── editor/               Design perspective
│   ├── core/             Pure-TS designer: SchematicDesigner + managers + render
│   ├── components/       Vue hosts: canvas, palette, inspector, problems, toolbar
│   └── layout/           Golden Layout configuration for Design
├── simulator/            Simulate perspective panels and layout
├── shared/               Framework-free domain layer
│   ├── types/            Serialized / Hydrated / Runtime contracts
│   ├── manifests/        22 component manifests + shared logic helpers
│   ├── utils/            Pure algorithms (bit-ops, geometry, netlist, stage
│   │                     registers, pipeline stages, ISA validation, formatting)
│   ├── manifestRegistry.ts
│   └── serialization.ts
├── config/               Defaults, presets, templates, keyboard map, Monaco
├── composables/          Vue-facing orchestration (simulation, saving,
│                         architecture settings, keyboard, theme)
├── stores/               Pinia: project, simulation, UI, settings
├── db/                   JsStore connection, table schema, generic repository
├── services/             Project repository façade and default settings
├── legacy/               Quarantined MIPS-specific implementation
├── assets/               Global CSS, design tokens, help documents, Monaco theme
├── components/           Application shell: TopBar, GoldenLayout wrapper, modals
└── pages/                Home and Workspace
```

The dependency rule is visible in the imports: `core/` and `shared/` import only
from each other and from nothing Vue-related; `editor/core/` imports `shared/`
and `core/`; Vue components import all of the above but are never imported by
them. This is what allows the engine to be verified by a Node process (§5.12)
and the designer to be reasoned about without a component harness.

### 2.3 Build, validation and the "Pave Over" migration

The project defines three scripts:

| Script | Command | Purpose |
| --- | --- | --- |
| `dev` | `vite` | Development server on port 1420 (strict). |
| `build` | `vue-tsc --noEmit && vite build` | Type-check the whole tree, then produce the production bundle. |
| `engine:check` | `vite build --config vite.engine-check.config.ts && node .engine-check/engine-smoke.js` | Build the engine as an SSR bundle and execute its self-check suite. |

`src/legacy/` holds the original MIPS-specific implementation — the old
assembler, Monaco configuration, dockview-based workspace, class-component
diagram and SASS theme. The migration strategy is explicitly a *pave-over*: the
new architecture is layered on top and the old code is moved aside rather than
deleted, so behaviour can be consulted while the replacement is written.

The honest consequence, recorded here because it affects any claim of build
health, is that `npm run build` does not currently pass type checking. Running
`npx vue-tsc --noEmit` reports errors that fall into two groups:

1. the overwhelming majority, confined to `src/legacy/**`, where imports point
   at modules that were not carried over (for example
   `src/legacy/utils/errors`, `src/legacy/assets/js/utils`, `dockview-vue`,
   `@kyvg/vue3-notification`);
2. a small residue in active code: `src/shared/utils/instructions.ts` (stale
   imports of the removed `src/core/config/*`), `src/stores/UIStore.ts:80`
   (a `string` assigned to Naive UI's `Theme` type) and
   `src/utils/projectActions.ts` (an unexported `Project` re-export).

This is migration debt rather than an architectural defect, and it is
measurable: `tsconfig.json` includes `src/**/*`, so excluding `src/legacy/**`
and repairing the three active-module issues would restore a green type check.
The engine, which is the part with correctness obligations, is independently
verified and currently passes all 19 checks (Appendix C).

### 2.4 Engineering principles enforced by the codebase

Five rules recur in the source and are treated as review criteria (they are
codified in `docs/architecture/STYLE_GUIDE.md`):

1. **No reactivity in the hot path.** The engine, its buffers and the
   evaluation closures are plain objects and typed arrays. A `Uint32Array`
   stored in a Pinia store would be proxied on every access; it is therefore
   kept at module scope in `src/composables/useSimulation.ts` (§5.9).
2. **Domain logic is extracted.** Reusable state and side effects live in
   composables; standalone algorithms live in single-purpose files under
   `src/shared/utils/`.
3. **The manifest is the extension point.** Anything type-specific (ports,
   evaluation, defaults, rendering) belongs in a manifest, not in a `switch` in
   the engine or the designer.
4. **Validation is not duplicated.** The width-mismatch, duplicate-driver and
   unavailable-endpoint rules exist once, in the resolver, and are consumed by
   both compilation and linting.
5. **Visual style is token-driven.** No colour is hard-coded in a draw function;
   `RenderTheme` is resolved from CSS custom properties at draw time (§10.4).

---

## 3. Unified Project Model and the Three Data Layers

### 3.1 The `Project` entity

`src/shared/types/project.ts` defines the root container:

```ts
export interface Project {
  id: number;
  name: string;
  description: string;
  architecture: ArchitectureConfig;   // hardware blueprint
  software: { editors: ProjectEditor[] }; // programs
  settings: Record<string, any>;      // project-level overrides
  createdAt: Date;
  updatedAt: Date;
}
```

An editor is a flat pair of identity and source text:

```ts
export interface ProjectEditor {
  id: string;      // stable id referenced by assembler mappings
  name: string;    // display name, e.g. "main.s"
  sourceCode: string;
}
```

The important structural decision is that `Project` **owns** its architecture
rather than referencing a separate architecture table. Templates are ordinary
`ArchitectureConfig` values copied into the project at creation time
(`src/config/templates.ts`), so editing a project can never mutate a template,
and a project is always self-contained. The consequence is duplication when two
projects derive from the same template, which is acceptable because the unit of
export, save and load is the project.

### 3.2 The architecture document

```ts
export interface ArchitectureConfig {
  name: string;
  description: string;
  modules: SerializedModule[];
  nets: SerializedNet[];
  configuration: ArchitectureConfiguration;
}
```

`modules` and `nets` form the netlist; `configuration` carries everything that
is not topology — pipeline stages, assembler-to-memory mappings, the ISA
definition and the canvas grid (§7.2). Keeping configuration beside the netlist
means an architecture is a complete, portable description of a processor.

### 3.3 Why three layers

The application must satisfy three mutually hostile requirements: persistence
wants plain JSON with no functions or class instances; editing wants resolved
ports and a manifest reference so the inspector and renderer can work without
re-resolving on every frame; simulation wants flat numeric indirection with no
string lookups and no object graphs in the inner loop. A single representation
cannot serve all three, so the model is stratified.

| Layer | Type family | Location | Contains | Owned by |
| --- | --- | --- | --- | --- |
| **Serialized** | `SerializedModule`, `SerializedNet`, `ArchitectureConfig` | `shared/types` | designator, typeId, position, rotation, user config, net endpoints and routing points | IndexedDB / clipboard |
| **Hydrated** | `HydratedModule`, `HydratedArchitecture` | `shared/types` | the serialized fields **plus** `manifest`, resolved `config`, generated `ports`, `evaluators` | `SchematicDesigner` |
| **Runtime** | `CompiledModule`, `CompiledSimulation`, `RuntimeModule` | `core/engine/types.ts`, `shared/types/architecture.ts` | closures bound to integer slot indices, scratch buffers, ordering lists | `SimulationEngine` |

The transitions are explicit and one-directional:

```
Serialized ──hydrateModule()──▶ Hydrated ──compileArchitecture()──▶ Runtime
     ▲                              │                                  │
     └──── getSerializedModules() ──┘        (reset: recompile) ◀──────┘
```

Only `serializeArchitecture` writes back across the boundary, and it performs a
structural copy (`JSON.parse(JSON.stringify(...))`) of config, nets and
configuration so that no live object can leak into persistence.

### 3.4 The serialized layer

```ts
export interface SerializedModule {
  designator: string;              // unique instance id, e.g. "u7"
  typeId: string;                  // manifest reference, e.g. "std.alu"
  position: Pos;                   // scene coordinates
  rotation: number;                // degrees, 0 | 90 | 180 | 270
  config: Record<string, any>;     // user overrides only
}
```

`config` stores **overrides**, not the resolved configuration. A module that has
never been edited persists `{}`, and defaults are re-derived from the manifest on
load. This keeps saved files small and, more importantly, makes manifest default
changes apply retroactively to existing projects.

A net is a single-driver, fan-out structure (`shared/types/netlist.ts`):

```ts
export interface NetEndpoint { designator: string; portId: string; }

export interface NetBranch {
  target: NetEndpoint;   // the input port this branch feeds
  junction: Pos;         // tap point on the trunk (rendered as a junction dot)
  waypoints?: Pos[];     // bends from the junction to the target
}

export interface SerializedNet {
  id: string;
  source: NetEndpoint;       // must be an output port
  targets: NetEndpoint[];    // one or more input ports
  waypoints?: Pos[];         // trunk bends, source → targets[0]
  branches?: NetBranch[];    // branches[i] routes targets[i + 1]
}
```

The branch structure is deliberately **rendering-only**. Connectivity is fully
described by `source` and `targets`; `waypoints` and `branches` never affect the
engine. The engine contract therefore stays stable even if the routing
representation is later replaced, and a net loaded without routing data still
simulates correctly (it is simply re-composed geometrically).

### 3.5 The hydrated layer

Hydration is `hydrateModule()` in `src/shared/manifestRegistry.ts`. For each
serialized module it:

1. resolves the manifest (throwing when unknown);
2. merges `manifest.defaultConfig` with the instance's overrides;
3. calls `manifest.generatePorts(config)` and applies any per-instance
   `portLabels` overrides;
4. calls `manifest.createEvaluators(config)`.

The result, `HydratedModule`, is `SerializedModule` plus `manifest`, the
resolved `config`, `ports` and `evaluators`, together with editor-only
`isValid`/`errors` fields. Hydration is idempotent and cheap; the designer keeps
a `Map<designator, HydratedModule>` as its live document.

Two subtle points follow from the merge order. First, a manifest is free to make
`generatePorts` depend on configuration (the control unit derives its output
ports from the configured signal list, the mux derives input count and selector
width from `numInputs`), so *the port interface of a module is configurable*.
Second, hydration in the registry does **not** create engine state; it passes the
plain config to `createEvaluators`, which for stateful manifests lazily
self-initialises a default state. Engine-owned state is a separate injection
step (§4.5) that never runs on the editor side.

### 3.6 The runtime layer

The compiler (§5.2) turns a validated set of hydrated modules into
`CompiledSimulation` (`core/engine/types.ts`). Its essential shape is:

```ts
export interface CompiledModule {
  designator: string;
  typeId: string;
  clockEdge: ClockEdge | undefined;   // undefined = combinational
  inputIndices: Int32Array;           // wire slots per input port
  outputIndices: Int32Array;          // wire slots per output port
  inputScratch: Uint32Array;
  outputScratch: Uint32Array;
  evaluate: (inputs: Uint32Array) => Uint32Array;
}

export interface CompiledSimulation {
  wireValues: Uint32Array;            // the global signal buffer
  netIndexById: Map<string, number>;
  portIndexByKey: Map<string, number>;
  combinationalOrder: CompiledModule[];
  risingModules: CompiledModule[];
  fallingModules: CompiledModule[];
  bothModules: CompiledModule[];
  moduleStates: Map<string, unknown>;
  errors: CompileIssue[];
  warnings: CompileIssue[];
}
```

The runtime representation is the point where the design pays its single biggest
performance debt up front: every port is pre-bound to an integer slot and every
module owns reusable staging buffers, so the step loop performs no string
interning, no map lookup, and no allocation in the steady state (§5.10).

### 3.7 Transformations and invariants

The transformations between layers preserve three invariants, each of which is
asserted in the corresponding code path:

- **Designator uniqueness.** Modules and nets share separate namespaces, but
  within each namespace ids are unique. Counters (`moduleCounter`,
  `netCounter`) are restored from the highest loaded id so freshly created
  elements cannot collide with loaded ones.
- **One driver per input.** Enforced in the resolver (an input driven by two
  nets keeps the first driver and reports an error) and in the designer (a
  target that is already driven is not re-added). Fan-out is unlimited; fan-in
  is forbidden.
- **Config never leaks state.** The resolver injects `createInitialState()` into
  a *copy* of the config (`{ ...config, state }`) so the `state` reference is
  captured by closures but is absent from the serialized `config` map. A saved
  project therefore contains no typed-array state.

### 3.8 Persistence boundary

Serialization is `serializeArchitecture()` (`src/shared/serialization.ts`), the
single funnel through which a live diagram becomes durable data. It strips
runtime-only fields from hydrated modules and deep-copies nets and
configuration. `deserializeArchitecture()` is its inverse for the designer.
Together with `ensureConfiguration()` (§7.8) they guarantee that any object
reaching IndexedDB is a plain JSON value, which is exactly what JsStore's
IndexedDB-backed store requires.

---

## 4. The Component Manifest System

### 4.1 Rationale

A component type in MIPStream is not a class hierarchy and not a table row in the
engine; it is a **manifest** — a self-contained, data-driven description of how a
type appears, connects, configures and evaluates. The engine and the designer
know nothing about ALUs, registers or memories beyond the `ModuleManifest`
contract. Adding a new component is therefore an additive change: write a
manifest, register it, done. No core file changes.

The contract (`src/shared/types/manifest.ts`) is:

| Field | Type | Purpose |
| --- | --- | --- |
| `typeId` | `string` | Stable identifier, namespaced (`std.alu`, `std.regfile`). Referenced by serialized modules. |
| `label` | `string` | Human-readable palette name. |
| `description` | `string` | Markdown imported raw; shown in documentation tooltips. |
| `icon` | `string` | SVG imported raw; shown in the palette. |
| `category` | `ModuleCategory` | Palette grouping: `logic`, `wiring`, `memory`, `iO`, `custom`. |
| `panel?` | `Component` | Optional simulator data panel (§9.5). |
| `configEditor?` | `Component` | Optional custom Inspector editor replacing the schema form (§4.5). |
| `defaultConfig` | `TConfig` | Default instance configuration. |
| `configSchema?` | `ModulePropertySchema[]` | Declarative description of configurable properties for the generic form. |
| `render?` | `(group, opts) => ModuleRenderOutput` | Custom body draw in module-local coordinates. |
| `generatePorts` | `(config) => PortDefinition[]` | Port interface derived from config. |
| `createEvaluators` | `(config) => ModuleEvaluators` | Evaluation closure factory. |
| `createInitialState?` | `(config) => unknown` | Engine-owned storage factory (register banks, memories). |

### 4.2 Ports

A port is a stable, directed, fixed-width connection point:

```ts
export interface PortDefinition {
  id: string;                 // immutable wiring key, e.g. "in0", "sel"
  direction: "input" | "output";
  bits: number;               // bus width
  label: string;              // default visual label
  tooltip?: string;
  position?: Pos;             // relative to the module origin; renderer draws pins here
}
```

Port **ids are the wiring contract**; labels are cosmetic and can be overridden
per instance via `config.portLabels`. Because `generatePorts` receives the
resolved config, the number, width and identity of ports may be data-dependent
— the control unit emits one output port per configured signal, the mux emits
`numInputs` data inputs plus a `⌈log₂(numInputs)⌉`-bit selector.

### 4.3 Evaluators

```ts
export interface ModuleEvaluators {
  inputPorts: string[];     // ordered input ids → input buffer indices
  outputPorts: string[];    // ordered output ids → output buffer indices
  evaluate: (inputs: Uint32Array) => Uint32Array;
  clockEdge?: "rising" | "falling" | "both";
}
```

`clockEdge` is the single discriminator between logic classes: its absence marks
a combinational module; its presence marks a sequential module that the engine
runs only on that clock transition (§5.4). The evaluator is a **pure** closure
over a fixed-width unsigned word slice; all values are masked to their port
width by the manifest, and the engine only guarantees that the returned array is
at least as long as `outputPorts.length` (missing words read as zero).

Two manifest-level conventions complete the evaluator contract:

- **Combinational with side effects.** Memory modules are combinational
  (`clockEdge` undefined) but their evaluators read *and write* engine-owned
  storage. Correctness relies on the engine running them exactly once per
  propagation pass, and on their reading values held *before* the write, which
  gives the classic "read-old, write-new" semantics without special-casing
  (§5.6).
- **Constant module.** The constant has no inputs; its evaluator returns a single
  hardwired word. Undriven inputs of any other module read slot 0, the
  constant-zero rail (§5.3), so a missing driver is identical to wiring a zero
  constant.

### 4.4 Engine-owned state

Stateful components (register files, instruction memory, data memory) declare a
`createInitialState(config)` factory. The resolver calls it once per module
instance and passes the returned object **back through the config** when it
invokes `createEvaluators`:

```ts
const state = manifest.createInitialState?.(config);
const evaluators = manifest.createEvaluators(
  state === undefined ? config : { ...config, state }
);
```

The returned closures capture `state`, so the evaluator can read and write it
during stepping, while the engine keeps the authoritative reference in
`moduleStates` for the simulator panels to sample and edit (§5.5, §9.5). The
injection is local to the engine and is explicitly documented never to leak into
serialized config (§3.7). The storage primitives are plain typed arrays
(`RegisterFileState { values }`, `WordMemoryState { words }`) in
`src/shared/manifests/register-file/logic.ts` and `src/shared/manifests/word-memory.ts`.

### 4.5 Configuration surface

A manifest can expose configuration in three escalating degrees of specificity:

1. **No schema** — the type is fixed (gates, ALU control, program counter). No
   Inspector form is shown; the module cannot be reconfigured.
2. **Declarative schema** — `configSchema` entries with `type` in
   `number | string | boolean | select`, plus `min`/`max`/`step`/`options`/
   `tooltip`. The generic `ConfigForm.vue` renders this schema automatically.
3. **Custom editor** — a `configEditor` Vue component replaces the schema form
   entirely. It receives `{ config, onUpdate:config }` and must route every
   mutation through `setModuleConfig`, never mutating the object in place
   (`ModuleConfigEditorProps`). The control unit (signal table + opcode rows),
   the bit splitter, the bit merger and the stage register (pin list + reset
   toggle) use custom editors because their configuration is a table, not a
   flat property list.

A `panel` component follows the same philosophy for the Simulate perspective:
it receives the resolved `config`, the engine-owned `state` and a `revision`
counter, and mutates the shared buffers directly, emitting `update` afterwards
(`ModulePanelProps`, §9.5).

### 4.6 Registry and lifecycle

`src/shared/manifestRegistry.ts` holds a module-scope `Map<string, ModuleManifest>`.
`initStandardManifests()` is called once at bootstrap in `main.ts` and registers
every manifest in `src/shared/manifests/index.ts`. The registry offers
`registerManifest`, `getManifest`, `getAllManifests` and `hydrateModule`, and the
palette renders `getAllManifests()` grouped by category, so a new manifest
appears in the UI with no further wiring.

### 4.7 The standard catalog

`src/shared/manifests/index.ts` registers 22 manifests. The tables below give the
complete catalog with ports (direction and default width), clock behaviour and
configuration. Widths marked *`cfg`* are taken from a configurable property.
"Comb" = combinational; "Rise" = rising-edge sequential.

**Logic, wiring and I/O**

| typeId | Label | Inputs | Outputs | Clock | Config (defaults) |
| --- | --- | --- | --- | --- | --- |
| `std.adder` | Adder | a (*cfg*), b (*cfg*), cin (1) | sum (*cfg*), cout (1) | Comb | `bitWidth` 1–32 (32) |
| `std.alu` | ALU | a (*cfg*), b (*cfg*), op (4) | result (*cfg*), zero (1) | Comb | `bitWidth` 1–32 (32) |
| `std.alu-control` | ALU Control | aluop (2), funct (6) | operation (4) | Comb | none |
| `std.and` | AND Gate | a (1), b (1) | out (1) | Comb | none (fixed 1-bit) |
| `std.or` | OR Gate | a (1), b (1) | out (1) | Comb | none |
| `std.xor` | XOR Gate | a (1), b (1) | out (1) | Comb | none |
| `std.nor` | NOR Gate | a (1), b (1) | out (1) | Comb | none |
| `std.mux2` | Mux 2:1 | in0, in1 (*cfg*), sel (1) | out (*cfg*) | Comb | `bitWidth` 1–32 (32) |
| `std.mux4` | Mux 4:1 | in0–in3 (*cfg*), sel (2) | out (*cfg*) | Comb | `bitWidth` |
| `std.mux8` | Mux 8:1 | in0–in7 (*cfg*), sel (3) | out (*cfg*) | Comb | `bitWidth` |
| `std.mux16` | Mux 16:1 | in0–in15 (*cfg*), sel (4) | out (*cfg*) | Comb | `bitWidth` |
| `std.shifter` | Shifter | in (*cfg*) | out (*cfg*) | Comb | `bitWidth` 1–32, `mode` LSL/LSR/ASR, `shamt` 0–31 |
| `std.extender` | Bit Extender | in (*cfg*: 16) | out (*cfg*: 32) | Comb | `inputBits`, `outputBits`, `isSigned` (true) |
| `std.splitter` | Bit Splitter | in (*cfg*: 32) | `out_f1`, `out_f2`, … (field widths) | Comb | `inputBits`, `outputs` (jumper maps) |
| `std.merger` | Bit Merger | `in_f1`, `in_f2`, … (field widths) | out (*cfg*: 32) | Comb | `outputBits`, `inputs` (jumper maps) |
| `std.constant` | Constant | — | out (*cfg*: 32) | Comb | `value` (4), `bitWidth` |
| `std.control` | Control Unit | opcode (*cfg*: 6) | one per signal (8 default signals) | Comb | `opcodeBits`, `signals[]`, `rows[]` |

The default control-unit signal set is the classic single-cycle MIPS control
word: `regDst`, `aluSrc`, `memToReg`, `regWrite`, `memRead`, `memWrite`,
`branch` (each 1 bit) and `aluOp` (2 bits). The default opcode table decodes
`0x00` (R-type), `0x23` (lw), `0x2b` (sw) and `0x04` (beq). The table is
compiled at hydration time into a flat `Uint32Array` lookup indexed by
`opcode × signalCount` (§8), so evaluation is a single slice.

**Memory**

| typeId | Label | Inputs | Outputs | Clock | Config (defaults) |
| --- | --- | --- | --- | --- | --- |
| `std.regfile` | Register File | rs, rt, rd (*cfg*: 5), wd (*cfg*: 32), we (1) | readA, readB (*cfg*: 32) | Comb (side-effecting) | `registerCount` 2–64 (32), `bitWidth` |
| `std.imem` | Instruction Memory | addr (32) | instruction (*cfg*: 32) | Comb (ROM read) | `wordCount` 1–65536 (256), `bitWidth` |
| `std.dmem` | Data Memory | addr (32), wd (*cfg*), memWrite (1), memRead (1) | rdata (*cfg*) | Comb (side-effecting) | `wordCount` 1–65536 (1024), `bitWidth` |
| `std.register` | Stage Register | d + `d_<id>`… (per-pin widths), rst (1, optional) | q + `q_<id>`… | Rise | `bitWidth` (legacy main pin); `pins[]` (id/label/bits); `reset` (sync); `managed`/`stageIndex`/`stageId` |
| `std.pc` | Program Counter | d (32) | q (32) | Rise | none (width fixed at 32) |

The register-file read addresses are `⌈log₂(registerCount)⌉` bits wide (5 for the
32-register default); register 0 (`$zero`) is hardwired to read 0 and ignores
writes, enforced in `register-file/logic.ts`. Both memories are byte-addressed
with word alignment: the word index is `address >>> 2`.

### 4.8 Parameterised families and encoding notes

Four families are generated by small factories rather than hand-written one per
type, which keeps their behaviour identical by construction:

- **Gates** (`makeGateManifest`) share one draw function, port layout and
  evaluator; only the fixed `op` differs. Gates are deliberately 1-bit and
  non-configurable — wide bitwise logic belongs to the splitter/merger/ALU.
- **Muxes** (`makeMuxManifest`) share the trapezoid body and evaluator; the
  variant fixes `numInputs` (2/4/8/16) and derives the selector width, while
  `bitWidth` remains configurable.
- **Splitter/Merger** share `wiring-logic.ts`, which models every field as an
  explicit bit-to-bit map (`WiringField.map[i]` = the bus bit connected to field
  bit `i`). Overlaps and reordering are legal; `-1` means unconnected.
- **Stage register vs. program counter** share the transfer function
  (`registerTransfer`), but the PC hard-codes a 32-bit width and exposes no
  schema so the simulator can recognise program-counter semantics purely by
  `typeId`.

Two encoding tables are worth recording precisely because they are the interface
between the manifests and the assembler/control unit:

- **ALU operation** (4-bit, `alu/logic.ts`): `0000` AND, `0001` OR, `0010` ADD,
  `0110` SUB, `0111` SLT, `1100` NOR; anything else evaluates to 0.
- **ALU control decode** (`alu-control/logic.ts`): `aluOp` `00` → ADD (address
  arithmetic), `01` → SUB (branch compare), `10` → decode `funct`
  (`0x20` ADD, `0x22` SUB, `0x24` AND, `0x25` OR, `0x2a` SLT), `11` → 0.

These two tables are the only MIPS-shaped constants in `src/shared/manifests/`;
they live in the components that *represent* those functional units, not in the
engine, and are configurable in the planned design (§12.2).

### 4.9 Extending the catalog

Adding a component type is a five-step, core-free procedure:

1. create `src/shared/manifests/<name>/` with `index.ts` exporting a
   `ModuleManifest`, plus `description.md`, `icon.svg`, an optional `draw.ts`
   and `logic.ts`;
2. implement `generatePorts`, `createEvaluators` (and `createInitialState` if
   stateful);
3. export it from `src/shared/manifests/index.ts` and add it to the
   `StandardManifests` array;
4. optionally attach a `panel` or `configEditor` component;
5. (if required) add a `typeId`-scoped custom body in `render`.

Because the resolver, compiler, designer, palette and inspector all consume the
registry, no other file changes.

---

## 5. The Simulation Engine

### 5.1 Responsibilities and boundaries

`src/core/engine/` is a headless, cycle-accurate logic simulator. Its public
surface is a single class, `SimulationEngine`, constructed from an
`ArchitectureDocument` (the modules and nets of an architecture). It exposes:

- `wireValues: Uint32Array` — the global signal buffer, sampled by the UI;
- `errors` / `warnings` / `hasErrors` — compile diagnostics;
- `getNetValue(netId)`, `getPortValue(designator, portId)`, `getModuleState(designator)`
  — read-only probing for the simulator;
- `step()`, `reset()`, `cycleCount` — execution.

The engine has no Vue imports, no DOM, no reactivity. The file's header comment
states the contract precisely: *the UI only samples `wireValues` at display rate
and never drives cycles through reactivity.* This is the enforcement of design
goal **G3** and of STYLE_GUIDE rule 4 (§2.4).

### 5.2 The compilation pipeline

Construction runs `compileArchitecture(document)`, in three stages
(`src/core/engine/compile/compiler.ts`):

**Stage 0 — resolve and validate** (`resolver.ts`). Each serialized module is
resolved against the manifest registry; duplicate designators and unknown type
ids are errors. Config is `defaults + overrides`, ports are generated, and
engine state is created and injected (§4.4). Each net is then validated: its
source must be an existing **output** port; each target must be an existing
**input** port (unavailable targets are dropped with a warning); an input
already driven by another net is an error (first driver wins); a target whose
width differs from the source width produces a width-mismatch warning. The
resolver returns the validated `builds` and `resolvedNets` plus the two
diagnostic lists. *This same resolver is the lint pass the designer runs*
(§6.13), so the designer and the engine can never disagree about connectivity.

**Stage 1 — bind nets to wire slots** (`wire-index.ts`). Every net is allocated
exactly one slot in the global `Uint32Array`. An output that already drives
another net reuses its slot, so both nets read the identical driven value.
Every module port is then mapped to its slot: an input resolves to its driving
net's slot (or the zero rail when undriven); an unconnected output gets a
private slot so runtime probing still reads its value.

**Stage 2 — build compiled modules and order the combinational graph.** For each
module the compiler produces a `CompiledModule` with `Int32Array` slot indices
and reusable `Uint32Array` scratch buffers, then partitions modules by
`clockEdge` into `combinational`, `rising`, `falling` and `both`. It derives a
directed edge `from → to` for every net whose source and target are both
combinational, and runs Kahn's algorithm (`topological-sort.ts`). Sequential
modules never enter the graph — they are boundary conditions whose outputs are
held in the wire buffer between edges, so register feedback cannot be mistaken
for a combinational cycle.

### 5.3 The wire buffer and the zero rail

All signal values live in one `Uint32Array`. Slot 0 is the **constant-zero
rail** (`ZERO_SLOT = 0`). Undriven inputs are registered on slot 0, so the hot
loop never branches on connectivity — it simply copies slot 0 into the input
scratch buffer and reads 0. Every value in the buffer is an unsigned 32-bit
word; bus widths narrower than 32 are enforced by the manifests masking their
own inputs and outputs (`widthMask`, §4.7). The buffer length is
`WireIndex.slotCount`, i.e. one slot per net plus one per unconnected output
plus the zero rail.

Because a net's slot is its source output's slot, "what value is on this net?"
and "what value is this port driving?" are the same question answered by the
same integer. This is the property that lets the viewer repaint nets by a single
array read per net (§9.3).

### 5.4 The master clock cycle

`step()` implements the phase model:

```
runSequentialEdge(risingModules, bothModules);   // 1. rising edge
runCombinational(combinationalOrder);            // 2. combinational settle
if (fallingModules.length || bothModules.length) {
  runSequentialEdge(fallingModules, bothModules); // 3. falling edge
  runCombinational(combinationalOrder);           // 4. final settle
}
cycleCount++;
```

`runSequentialEdge` runs in **three strict sub-phases** — read, evaluate, write —
for the primary edge list and the `both` list together:

1. **Read** — every module snapshots its input wire slots into its input scratch
   buffer;
2. **Evaluate** — every closure computes next-state outputs into its output
   scratch buffer;
3. **Write** — outputs land on the wires only after everyone has sampled.

This read-before-write barrier reproduces the simultaneous-edge behaviour of real
flip-flops and prevents same-edge ripple-through between chained registers — a
behaviour the self-check verifies explicitly (`chain: r2 still 0 on cycle 1`).
The falling-edge branch is skipped entirely when there are no falling/both-edge
modules, because the second combinational pass would only re-commit identical
writes.

### 5.5 Combinational ordering and loop detection

The combinational modules execute in topological order (Kahn's algorithm). Any
module left with a non-zero in-degree is part of a cycle, and the compiler
reports an **error** naming the cycle members rather than hanging the loop. The
message directs the user to insert a stage register to break the cycle. This is
the same rule the designer surfaces in its Problems panel (§6.13).

### 5.6 Level-sensitive write semantics

The register file and data memory are combinational modules with side effects.
Their evaluators read all values *before* writing, and write *while* the control
line is asserted during the single combinational pass. Because the pass runs
exactly once per cycle, a write commits exactly once per cycle; because reads
precede the write within the same evaluation, a register written in the current
cycle still reads its previous value — the classic write-back read semantics.
The instruction memory is a pure read (a ROM loaded by the assembler/panel), so
it has no write path in the evaluator.

### 5.7 Diagnostics

`CompileIssue` is `{ severity: "error" | "warning", message, refs? }`. The `refs`
array is a **locator** scheme shared with the designer: `"u2"` names a module
designator, `"n3"` a net id, `"u2:out"` a module port. This is what lets the
Problems panel turn a diagnostic into a click-to-focus action (§6.13). Errors
block execution (`hasErrors`); warnings do not.

| Condition | Severity | Source |
| --- | --- | --- |
| Duplicate module designator | error | resolver |
| Unknown `typeId` | error | resolver |
| Duplicate net id | error | resolver |
| Net source is not an output | error | resolver |
| Input driven by two nets | error | resolver |
| Net target unavailable (dropped) | warning | resolver |
| Bit-width mismatch on a net | warning | resolver |
| Evaluator reads an unknown input port (reads 0) | warning | compiler |
| Output port never evaluated (stays 0) | warning | compiler |
| Unbuffered combinational loop | error | compiler / lint |
| Input not connected (reads 0) | info (lint only) | lint |
| Output not connected | info (lint only) | lint |
| Net drives no inputs | info (lint only) | lint |

### 5.8 Settling and reset

After compilation the engine runs one combinational pass (`settle()`) from the
initial sequential state, so — exactly as in real hardware, where logic settles
between clock edges — the first rising edge samples steady-state values rather
than an all-zero buffer. `reset()` recompiles the same document, re-settles and
zeroes `cycleCount`; it is semantically identical to constructing a fresh
engine, which is why it is cheap to implement and why the engine has no
incremental state to unwind.

### 5.9 Host loop: compilation invalidation and speed control

The engine lives at module scope in `src/composables/useSimulation.ts`, outside
Pinia so the `Uint32Array` is never proxied. A `documentRevision` counter (bumped
by the designer on every committed edit) invalidates the compiled program;
`ensureCompiled()` rebuilds lazily on the next control call. Continuous run is
driven by `requestAnimationFrame`, not by the Vue renderer:

- `runFrame` computes elapsed wall time, accrues fractional cycles against the
  configured speed (`store.speed`, cycles/second), and executes
  `floor(cycleDebt)` engine steps per frame;
- a per-frame budget caps the cycle count at one second's worth of cycles so a
  background stall cannot freeze the tab catching up;
- `run()`, `pause()`, `stop()` and `step()` map onto the
  `stopped | running | paused` state machine mirrored in `simulationStore`
  (§9.6).

This decoupling means the simulation advances at a rate independent of display
refresh, while the viewer samples the buffer on its own 60 fps loop (§9.3).

### 5.10 Complexity characteristics

| Operation | Cost | Notes |
| --- | --- | --- |
| Compile | O(V + E) | One pass per module and per net; Kahn sort is O(V + E). |
| `step()` combinational | O(V) | Single ordered pass, constant work per module. |
| `step()` sequential | O(S) | Three sub-phases over sequential modules only. |
| Per-module evaluation | O(w) | `w` = input/output words; manifest-dependent. |
| Net value probe | O(1) | Direct array read through a pre-built map. |
| Runtime allocation | 0 | Scratch buffers are reused; evaluators may allocate small arrays. |

The only allocation left in the loop is the `Uint32Array` returned by each
evaluator (a manifest-level concern), which is why the contract favours small,
closure-scoped computations over object graphs.

### 5.11 Determinism and current limitations

Stepping is deterministic: identical documents produce identical traces because
module iteration is insertion-ordered (`Map`) and the combinational order is a
fixed topological sort. The known modelling limitations, all deliberate and
documented in the source:

- **32-bit unsigned words only.** No multi-word buses, no sign carried in the
  buffer (signedness is a manifest interpretation, e.g. SLT and the extender).
- **Single-pass combinational semantics.** No delta-event scheduling; a
  combinational loop is illegal rather than oscillatory.
- **One master clock.** `both`-edge modules fire twice per cycle (rising then
  falling); there is no separate clock domain or gated clock.
- **No `X`/`Z`.** Undriven = 0, not unknown.

### 5.12 Verification

The project has no test framework, so `src/core/engine/engine-smoke.ts` is an
executable self-check run by `npm run engine:check` against an SSR build of the
engine. It exercises compile-clean and compile-error paths, the zero rail, the
same-edge no-ripple property, both-edge double-stepping, reset, private output
slots, engine state ownership, and the lint width/loop diagnostics. At the time
of writing **all 19 checks pass** (Appendix C).

---

## 6. The Schematic Designer

### 6.1 Role and the Vue boundary

`src/editor/core/designer.ts` is the orchestration layer of the Design
perspective. It is a plain TypeScript class, `SchematicDesigner`, that owns the
Konva stage and all editing state; Vue components only *host* it. The class
header states the boundary: raw event wiring lives in `EventManager`,
context-aware keyboard handling in `ShortcutManager`, marquee selection in
`MarqueeManager`, wire segment dragging in `WireDragManager` and interactive
routing in `RoutingManager`, while `SchematicDesigner` coordinates layers,
viewport, tools, selection, placement and the netlist.

This decomposition is what makes the designer amenable to reasoning and, later,
to unit testing without a browser (goal **G6**). The only Vue-specific
dependencies are the bridge modules (`designer-bridge`, `selection-bridge`,
`placement-bridge`, `problems-bridge`) that relay state to panels without a
direct reference.

### 6.2 The Konva layer model

The stage is divided into four layers with a strict z-order and a single
responsibility each:

| Layer | Content | Interactivity |
| --- | --- | --- |
| `gridLayer` | Adaptive grid (§6.11) | none (`listening: false`) |
| `logicLayer` | Module bodies, ports, wires, waypoint handles | interactive |
| `interactionLayer` | Ghost previews, marquee rectangle, routing overlay | interactive |
| `valueLayer` | Always-on runtime port value labels (viewer) | none (`listening: false`) |

Separating `logicLayer` (persistent geometry) from `interactionLayer` (ephemeral
overlays) means previews and the marquee never have to reconcile with the real
document; they are cleared wholesale. The `valueLayer` sits above the wires and
is non-listening so runtime labels never intercept events aimed at the canvas.

### 6.3 Manager decomposition

Eight collaborating classes, each in its own file, keep `SchematicDesigner` from
becoming a god object:

| Class | File | Responsibility |
| --- | --- | --- |
| `GridManager` | `grid.ts` | Adaptive fine/coarse grid rendering and snapping (§6.11). |
| `EventManager` | `events.ts` | Raw stage events: pan (right-drag), zoom (wheel), resize, viewport callbacks. |
| `ContextTracker` | `keyboard.ts` | Named active contexts (`schematic:editor`, `:selection`, `:placing`, `:routing`) gating shortcuts. |
| `ShortcutManager` | `keyboard.ts` | Registers key bindings with context predicates; dispatches handlers. |
| `PlacementManager` | `placement.ts` | "Select & Place": ghost preview under the cursor, rotation, grid snap, stamping. |
| `RoutingManager` | `routing.ts` | Wire tool: port/wire hit-testing, waypoint preview, junction taps, valid-target highlighting. |
| `MarqueeManager` | `selection.ts` | Rubber-band multi-selection over empty canvas. |
| `WireDragManager` | `wire-drag.ts` | KiCad-style dragging of wire segments and waypoints. |

Each manager receives its dependencies via an options object and a predicate
(`isEnabled`) that determines when it is active. This inversion — the manager
asks "am I active?" rather than the orchestrator imperatively toggling it — is
what lets a single keyboard/tool state drive several managers coherently.

### 6.4 Tools and modes

`EditorTool` is `select | wire | place | delete`; `EditorMode` is
`editor | viewer`. The tool selects the active interaction; the mode is a
hard lock:

- **Editor mode** enables placement, routing, dragging, marquee and clipboard.
- **Viewer mode** mounts the same canvas with `isEnabled` predicates returning
  false everywhere, and skips registering editor shortcuts. It is the Simulate
  perspective's read-only canvas (§9.2).

Tool selection is exposed both through the toolbar and through single-letter
shortcuts (`V` select, `W` wire, `D` delete), each registered only in the
`schematic:editor` context. The delete tool is a hover-to-highlight mode rather
than an immediate action, so destructive edits require a deliberate click.

### 6.5 Selection, clipboard and deletion

Selection is a `Set<string>` of designators (modules) and net ids (wires).
A plain select-tool click replaces the selection with the clicked item;
Shift **or** Ctrl/⌘ click toggles the clicked item in or out (Phase 3), and
dragging over empty canvas draws a marquee that selects modules intersecting
the rectangle — additive when Shift or Ctrl/⌘ is held. The selection context
(`schematic:selection`) gates the Delete/Backspace and copy shortcuts, so they
only fire while something is selected.

Clipboard (`clipboard.ts`) lives **outside** the designer so it survives
perspective switches. Copy serialises the selected modules plus every net whose
source and all targets are inside the selection — boundary-crossing nets are
dropped, standard EDA semantics. Paste re-issues fresh designators to avoid
collisions.

Deletion is junction-aware: removing a module prunes its endpoints from
attached nets. A net survives when its driver and at least one other target
remain, and the surviving wire is trimmed back to the nearest junction rather
than being deleted wholesale (the `pruneNetForRemovedModule` algorithm).
**Managed modules** — pipeline stage registers created by Architecture Settings —
are exempt from deletion and clipboard, enforced by `isManagedModule()`
(`typeId === "std.register" && config.managed`).

### 6.6 Placement

Placement is initiated from the palette through the `placement-bridge` module,
which decouples the palette panel from the designer. `beginPlacement(typeId)`
sets a `PlacementState` (`typeId`, rotation) and hands the cursor to the
`PlacementManager`, which renders a ghost preview of the module — body and ports
from the *same* hydrated data the real instance will use — snapped to the grid.
`R` rotates the ghost in 90° steps; a click stamps it via `addModule(typeId,
position, rotation)`, which assigns the next designator (`u1`, `u2`, …) and
hydrates/renders the instance. Clicking the pending palette item again cancels
placement, as does Escape.

### 6.7 The net model

The designer maintains `nets: Map<string, SerializedNet>` (§3.4). Its
connectivity rules are the editor-side mirror of the resolver:

- a net has exactly one source, which must be an **output** port;
- a target must be an **input** port and must not already be driven;
- an output may fan out to arbitrarily many inputs.

A net is committed as a whole (source → waypoints → first target), and
additional targets are attached afterwards, either by routing to a new input or
by tapping an existing wire trunk at a junction. Tapping a trunk splits the
wire and records a `NetBranch` (junction + branch waypoints) while leaving the
logical `targets` list as the single connectivity record.

### 6.8 Orthogonal routing

Routing geometry is computed by `composeNetPath` in
`src/editor/core/render/orthogonal-path.ts`. The path is source → waypoints →
target, each consecutive pair joined by an L-shaped orthogonal segment whose
corner is placed so the **longer leg runs first** (horizontal-first when
`|dx| ≥ |dy|`, vertical-first otherwise). Consecutive duplicate points are
collapsed, so collinear waypoints never produce zero-length legs. Fan-out
branches are routed from their junction point to their target by the same
function.

During interactive routing the `RoutingManager` shows a dashed ghost of the
exact polyline that will be committed, so the preview and the result are
geometrically identical — a property the project treats as a known bug surface
(todo.md records a case where the committed wire can still diverge from the
ghost, §12.2).

### 6.9 Wire dragging

With the select tool, hovering a wire segment or waypoint exposes drag handles.
`WireDragManager` converts a pointer drag into a draft `SerializedNet`
(`recomposeNet`), live-updating the rendered polyline, and commits it on release
(`commitWireDrag`). This is the KiCad-style "drag a segment, the adjacent
corners follow" interaction, and it is the mechanism by which fine-grained
routing adjustments are made after a net exists.

Holding **Alt** at grab — or grabbing a polyline that already carries diagonal
geometry — switches to *free-form* mode: the grabbed segment follows the
cursor in both axes with **no** automatic bend insertion, so adjacent legs may
go diagonal. Fixed anchors (ports, junctions) stay glued; on the first move a
movable vertex is spliced in at each fixed end so the anchor is not detached,
and junction dots riding the segment translate with it. The committed draft
persists a `freeform` flag (trunk or per-branch) and renders verbatim through
`composeNetPathVerbatim` — straight segments through the anchors, no L-corner
re-composition — so the hand-drawn geometry survives reloads, theme rebuilds
and later module drags (whose anchors simply stretch the legs).

### 6.10 Route highlighting and width validation

While a route is in progress, the designer highlights every legally connectable
target so the user can see where a wire may end:

- ports of the opposite direction highlight as valid, coloured by a
  width check — a matching width is `valid`, a mismatched width is `warning`
  (still connectable, flagged);
- free input ports and nets highlight as potential junction taps.

The width rule reuses the resolver's notion of a mismatch, so the editor warns
about exactly what the engine will warn about. After commit, lint-flagged nets
and ports keep a persistent warning ring (`warnedNets`, `warnedPorts`) until the
problem is fixed.

### 6.11 The adaptive grid

`GridManager` renders a two-level grid over the visible viewport only. The fine
level is the configured grid size, promoted (multiplied by 5) while its on-screen
spacing drops below 8 px; a coarser "major" level is drawn on top at 5× the
current fine step. Zooming far out therefore hides the fine squares and leaves
only the coarse ones, in the manner of KiCad. Placement and movement snap to the
current visual step, so snapping density matches what the user sees. Grid
settings (`show`, `style: lines|dots`, `size`) are per-architecture
configuration (§7.6).

### 6.12 Viewport and panning

The stage is never Konva-draggable: panning is a manual right-button drag
handled by `EventManager`, which leaves the left button free for module drags
and marquee selection. Wheel input zooms around the cursor; resize is
forwarded to the stage and re-renders the grid. Viewport changes are reported
through `onViewportChange` to the status bar.

### 6.13 Lint integration and click-to-focus

Every committed mutation and every architecture load triggers `runLint()`, which
calls `lintArchitecture(document)` (§5.7) and reports through
`problems-bridge`. The designer then maps the returned `refs` onto canvas
elements — a port key highlights that port, a net id highlights the wire, a
designator selects the module — and `focusProblem(issue)` centres the viewport
on the offending element. This is the concrete payoff of the shared resolver
(goal **G4**): the Problems panel, the canvas highlighting and the engine's
`hasErrors` gate all derive from one validation pass.

### 6.14 Configuration reconciliation

`setModuleConfig(designator, config)` re-hydrates a module in place — ports and
evaluators are rebuilt from the new config, the node is re-rendered — and then
**reconciles every net attached to it**. If a config change removes or narrows a
port, the connected nets are pruned or re-flagged; if a port changed width, the
affected nets are re-validated. This is how the configurable-port property of
manifests (§4.2) stays safe: editing a control unit's signal list cannot leave
dangling connections.

### 6.15 Bridges and the revision counter

Five tiny modules decouple the designer from the panels that display its state:

| Bridge | Exposes | Consumers |
| --- | --- | --- |
| `designer-bridge` | `setActiveDesigner` / `requestArchitectureSnapshot` | save flow, simulation compile source |
| `selection-bridge` | `selectedIds`, `documentRevision` | Inspector panel, simulation invalidation |
| `history-bridge` | `canUndo`, `canRedo` | Editor toolbar buttons |
| `placement-bridge` | `requestPlacement` / `pendingPlacementTypeId` | Module palette |
| `problems-bridge` | `problems` | Problems panel |

`documentRevision` is the linchpin: the designer bumps it on every committed
edit, the Inspector uses it as a computed dependency to re-read the selected
module, and `useSimulation` watches it to invalidate the compiled program
(§5.9). It is a single integer that means "the document changed", substituting
for deep watchers over the whole netlist.

### 6.16 Loading and snapshotting

`loadArchitecture(arch)` restores a serialized document: modules are rehydrated
(unknown types and duplicate designators are skipped with warnings), nets are
rebuilt with surviving endpoints only, and designator counters are restored so
new elements cannot collide. Loading suppresses per-mutation notifications and
lints once at the end. `getSerializedModules()` plus `getNets()` produce the
snapshot that `serializeArchitecture` persists (§3.8); `SchematicEditor.vue`
pulls that snapshot into the project store on unmount so a perspective switch
never loses unsaved canvas edits. Passing `resetHistory` establishes the undo
baseline (§6.17): a freshly loaded project cannot be undone past itself.

### 6.17 Undo/redo history

Undo/redo is memento-style history over whole-document snapshots, not a
command stack: with ~12 mutation paths (add/remove/move modules, routes,
segment drags, waypoint handles, config reconciliation, paste, managed
register sync) and more coming, inverting every one of them would make each
future feature retroactively undoable, while snapshots make every feature
*born undoable* — the document is small (JSON modules + nets), so snapshots
are cheap. `history.ts` is pure TypeScript (no Vue), with a 100-entry limit
per direction.

The commit point is the existing `notifyDocumentChange` seam: each committed
user gesture notifies exactly once (drags commit on release), so the designer
keeps a `lastCommitted` snapshot (the pre-mutation state) and pushes it onto
the undo stack on the mutation that follows. Structural equality detects
no-op mutations (e.g. a drop in place) and skips them. Gestures that fan out
into several committed calls — multi-delete, paste, and the
architecture-settings cascade — run inside a batch (`runBatched`) and commit
as ONE entry; settings batches additionally carry the prior
`ArchitectureConfiguration`, and undoing one restores it through the
`onConfigurationRestore` callback so the canvas and configuration never
drift. Undo/redo clear the canvas (`clearDocument`) and replay through
`loadArchitecture`, restoring designator counters, lint state and selection.
Anchors: Ctrl+Z (undo), Ctrl+Shift+Z / Ctrl+Y (redo) via the ShortcutManager
(gained explicit `shift` matching so the pair disambiguates), plus toolbar
buttons fed by `history-bridge`.

Known limitations: history lives on the designer instance, so the F4
perspective switch (which unmounts the canvas) clears it — unlike the
module-level clipboard — and config-only edits (grid, ISA changes without
canvas effects) are not part of document history.

---

## 7. Architecture Configuration

### 7.1 The configuration hierarchy

Configuration is layered in the manner of an IDE, with three scopes of
decreasing generality:

| Scope | Lives in | Overridden by |
| --- | --- | --- |
| **Global** | `localStorage` via `src/storage/settingsStorage.ts` | project, architecture |
| **Project** | `Project.settings` | architecture |
| **Architecture** | `ArchitectureConfig.configuration` | — |

Only the architecture scope is covered in depth here; it is the one that changes
how hardware behaves. Global and project settings govern appearance and editor
behaviour, and are merged by the settings UI rather than by the engine.

### 7.2 The `ArchitectureConfiguration` schema

```ts
export interface ArchitectureConfiguration {
  pipeline: {
    enabled: boolean;
    stages: PipelineStageConfig[];      // { id, name, color? }
    startStageBoundary?: string;        // stage where decoding begins (pipeline view)
  };
  assembler: {
    mappings: { editorId: string; memoryModuleIds: string[] }[];
  };
  isa: ISADefinition;                   // = AssemblerConfig (§8)
  grid?: GridSettings;                  // { show, style, size }
}
```

`ISADefinition` is a type alias for the shared `AssemblerConfig`, so the
architecture's ISA definition and the assembler consume the *same* structure —
there is no divergence between "what the user described" and "what the assembler
executes". `ensureConfiguration()` (`src/config/default-configuration.ts`)
normalises any incoming payload into this shape, migrating legacy one-to-one
assembler mappings and pre-range ISA fields, so older persisted projects load
unchanged.

### 7.3 Pipeline stages and managed stage registers

The pipeline configuration is a reorderable list of named stages. It drives two
consumers: the (planned) pipeline visualisation strip, and — already implemented —
the **automatic creation of stage-boundary registers** on the schematic.

`src/shared/utils/stage-registers.ts` implements the reconciliation:

- a boundary exists between every adjacent pair of stages, labelled
  `IF/ID`, `ID/EX`, … via `boundaryId(stages, index)`;
- a managed register is any `std.register` whose `config.managed === true`;
- matching is by **boundary index** (stable under stage renames); the derived
  `stageId` label is refreshed when a stage is renamed;
- `planStageRegisterSync(modules, stages)` returns a plan of `create`,
  `remove` and `relabel` actions, which `useArchitectureSettings.commit()`
  applies through the designer (or directly on the stored module list when no
  canvas is mounted).

Managed registers are protected from ordinary editing (`isManagedModule`), so
the pipeline list remains the single source of truth for stage boundaries; the
registers cannot be deleted or copied by hand. The default preset is the classic
five-stage `IF/ID/EX/MEM/WB` (§7.8).

### 7.4 Assembler mappings (one-to-many)

One architecture may assemble a program into **multiple** instruction memories —
the natural case for a pipeline whose stages each fetch from their own memory,
or for multi-issue datapaths. The mapping is therefore one row per editor with a
`memoryModuleIds` array:

```ts
mappings: [
  { editorId: "main", memoryModuleIds: ["imem", "imem2"] }
]
```

`normalizeMappings` also accepts the legacy shape `{ editorId, memoryModuleId }`
and merges multiple such rows for the same editor into one target list, so the
editor→memory relationship can only ever be one-to-many.

### 7.5 The ISA definition

The `isa` member is the complete `AssemblerConfig` (§8): instruction fields with
bit ranges, instruction format types, and the concrete instruction set. It is
edited in the Architecture Settings "ISA Definition" tab and consumed verbatim
by the assembler. Its presence in `ArchitectureConfiguration` — not in a
separate store — is what makes an architecture a complete, portable processor
description.

### 7.6 Grid configuration

`grid` is optional; when present it stores the canvas grid visibility, style and
size (§6.11). `SchematicEditor.vue` reads it on mount (falling back to editor
defaults `{ show: true, style: "lines", size: 20 }`) and writes it back on
change, marking the project unsaved.

### 7.7 Draft-commit flow

`useArchitectureSettings` implements a transactional edit: the modal edits a
**deep clone** of the live configuration, and `commit()` is the only path that
writes back, at which point the pipeline stage-register plan is applied and the
project is marked unsaved. Draft edits can therefore never leak into the
project, and cancelling discards everything including any stage-register
changes. The modal aggregates `pipelineWarnings` and `isaWarnings` and shows
them before commit.

### 7.8 Defaults and migration

`createDefaultConfiguration()` returns a disabled pipeline, no assembler
mappings and a clone of the MIPS preset ISA. `createDefaultPipelineStages()`
returns `IF/ID/EX/MEM/WB`. `ensureConfiguration(raw)` is the missing-only merge
used everywhere a configuration is loaded: it fills absent sections from
defaults, never overwrites present data, and migrates legacy payload shapes in
place. This, together with the resolver's default-override config merge (§3.4),
is the forward-compatibility mechanism for persisted projects.

---

## 8. Processor Description Language and Assembler

### 8.1 Motivation

For the "build the CPU, then run a program on it" loop to work, the encoding of
instructions must be user data, not a baked-in assumption. MIPStream's PDL is
the `AssemblerConfig` structure in `src/shared/types/isa.ts`. It is deliberately
shared: the ISA editor, the assembler and the instruction-memory layout all read
the same definition. Nothing in this model requires MIPS; the bundled MIPS
configuration is just a preset.

### 8.2 Fields and bit ranges

An instruction word is a fixed-width bit vector whose sub-fields are declared
individually:

```ts
export interface AssemblerFieldConfig {
  field: string;      // stable name, e.g. "opcode", "imm"
  label: string;
  def_type: field_types;   // default operand interpretation
  bits: number;            // semantic width
  ranges: [number, number][];  // inclusive LSB-indexed segments
}
```

Three properties of `ranges` are significant design choices:

1. **LSB-indexed, inclusive.** A range `[0, 5]` means bits 0–5 of the word. The
   bundled MIPS preset places `opcode` at `[0,5]`, `rs` `[6,10]`, `rt` `[11,15]`,
   `rd` `[16,20]`, `shamt` `[21,25]`, `funct` `[26,31]`.
2. **Overlap is legal.** `imm` (`[16,31]`) and `address` (`[6,31]`) overlap the
   R-type fields; different instruction *formats* are therefore just different
   interpretations of the same word, selected by instruction type.
3. **Multi-range is legal.** A field may be split across several segments; the
   encoder writes them low-to-high in list order.

`effectiveTotalBits(config)` derives the word width from the explicit
`total_bits` or the widest range end + 1.

### 8.3 Instruction format types

```ts
export interface InstructionTypeConfig {
  type: string;                 // "R", "I", "J"
  description: string;
  fields: string[];             // which fields this format uses
  default_field_values?: Record<string, number>;
  default_operands?: InstructionOperandConfig[];
}
```

A type groups the fields that appear together in a format and supplies defaults
for fields the assembler should fill automatically (for example the R-type
`opcode: 0`). The preset declares three types: `R` (`opcode rs rt rd shamt
funct`), `I` (`opcode rs rt imm`) and `J` (`opcode address`).

### 8.4 The instruction set

```ts
export interface InstructionConfig {
  mnemonic: string;             // "add", "lw", "beq"
  type?: string;                // format reference
  description?: string;
  operands: InstructionOperandConfig[];   // one entry per source operand
  field_values?: Record<string, number>;  // fixed encoding bits
}
```

`field_values` carries the bits that are constant for the mnemonic (for `add`,
`opcode: 0x00` and `funct: 0x20`). The preset ships `add`, `addi`, `beq`, `lw`,
`sw` and `nop`.

### 8.5 Operand semantics

Each operand is a tuple `[field, type?, base?]` — the destination field, an
optional type override, and (for memory operands) the base-register field. The
type vocabulary is:

| Type | Source form | Encoding behaviour |
| --- | --- | --- |
| `register` | `$t0`, `R1` | resolves to a register number |
| `raw_value` | `5`, `0x1f`, `0b101` | parsed as a signed/unsigned immediate, range-checked |
| `label_absolute` | label | resolved to the label's absolute address |
| `label_relative` | label | resolved to `address − pc − 1`, range-checked |
| `memory_address` | `offset(base)` | splits into the offset and the base-register field |

A memory operand such as `lw $t0, 4($t1)` uses the tuple
`["imm", "memory_address", "rs"]`: the immediate field receives the offset and
the `rs` field receives the base register. This is the mechanism by which a
load/store addressing mode is expressed in pure configuration.

### 8.6 The two-pass assembly pipeline

The reference implementation (`src/legacy/core/Assembler.ts`) assembles a
program in four explicit passes:

1. `sections(program)` — split `.data` and `.text`, enforcing that `.data`
   precedes `.text` and that a `.text` section exists if `.data` does;
2. `parseDataSection(...)` — lay out `.byte`/`.half`/`.word` directives into a
   data image and a `label → address` map (`dataMemoryReferences`);
3. `extractLabels(...)` — build the `label → instruction index` map for the
   text section (a full pre-pass, so forward branches resolve);
4. `encodeInstructions(...)` — encode each instruction against the now-complete
   label maps, recording a `pcLineMap` from instruction index to source line.

### 8.7 The encoding algorithm

For each instruction, `mapOperandsToFields` produces a `{ field: value }` map by
walking the operands in order, then the encoder folds each field into its
ranges:

```
for each field config:
  fieldValue = values[field] ?? 0
  bitCursor = 0
  for each [start, end] in field.ranges:
    length  = end - start + 1
    mask    = (1 << length) - 1
    bits    = (fieldValue >> bitCursor) & mask
    word   |= bits << start
    bitCursor += length
```

The word is returned as an unsigned 32-bit value. Two implementation notes are
material: the LSB-first range order means a field's least-significant bits land
in the lowest range; and the `(1 << length) - 1` mask is correct only for
`length < 32`, which is satisfied by every bundled field (the widest is 26 bits)
but is a constraint any new ISA with a full 32-bit single-range field would need
to address.

### 8.8 Assembler output

`assemble(program)` returns a single object:

```ts
{
  instructions: Uint32Array,      // encoded words, one per PC
  pcLineMap: number[],            // PC → source line
  labels: Map<string, number>,
  memory: number[],               // .data image
  dataMemoryReferences: Map<string, number>,
}
```

The `instructions` array is the image written into the mapped instruction
memories, and `pcLineMap` is what a debugger would use to highlight the
currently-executing instruction — it is the planned pipeline/instruction
highlighter's data source.

### 8.9 Diagnostics

The implemented assembler (`src/core/assembler/`) never throws: `assemble()`
returns its output alongside a typed `AssemblerDiagnostic` list
(`src/shared/utils/errors.ts`) carrying a machine-readable code, a 1-based
line and a 0-based column range — the CodeMirror lint shape, consumed
verbatim by the editor's diagnostics strip (§9.8). Failed lines keep their
word slot so `pcLineMap` stays aligned with the source. The validation
covered includes unknown mnemonics, operand-count/type mismatches, invalid
registers, undefined labels, and out-of-range immediates or branch offsets —
every class has a golden test in `npm run assembler:check`. (The legacy
reference accumulated errors in an `AssemblerErrorList` and threw on a
non-empty list; it survives in `src/legacy/` only as the behavioural
reference.)

### 8.10 Integration status

This section is the honest record of where the PDL/assembler currently stands:

- The `AssemblerConfig` model and its MIPS preset are **implemented** and used
  by the ISA settings UI and validation (`src/config/isa-presets.ts`,
  `src/shared/utils/isa-validation.ts`).
- The assembler itself is **implemented** (Phase 1): `src/core/assembler/**`
  is a framework-free, config-driven re-implementation (same four-pass
  structure as §8.6) that never throws and returns the typed diagnostics of
  §8.9, golden-tested bit-exact against real MIPS32 encodings by
  `npm run assembler:check`. `src/legacy/core/Assembler.ts` survives only as
  the behavioural reference and is slated for deletion.
- The program→memory write-back path is **implemented** (Phase 2):
  `buildLoadPlan` (`src/core/simulation/program-loader.ts`) assembles every
  mapped editor and writes the instruction/data images into the engine-owned
  memory state; `SimulationSession` implements the full control table
  (SIMULATOR_OVERVIEW §4), validated end-to-end on the shipped single-cycle
  datapath by Rigs C/D and on the shipped five-stage pipeline by Rig E in
  `npm run simulation:check`.
- The Simulate perspective's CodeMirror editor (§9.8) binds the mapped
  `ProjectEditor` and surfaces those diagnostics verbatim (error strip with
  click-to-reveal). The instruction-memory panel can still edit words
  manually (§9.5).
- The Monaco language services (`src/config/monaco*`) are superseded (§1.6) —
  legacy-only, undeclared as a dependency (§2.1), and slated for deletion.

The remaining direction is editor *richness* on the existing CodeMirror
instance — per-ISA syntax highlighting, completion, lint, go-to-definition
and live instruction highlighting (Planned, §12.1).

---

## 9. The Simulator View

### 9.1 Perspective and layout

Selecting the Simulate perspective swaps the workspace layout
(`src/pages/Workspace.vue` renders `SimulateLayout` when
`uiStore.perspective === "simulate"`). The Golden Layout configuration
(`src/simulator/layout/SimulateLayout.vue`) is:

```
┌─────────────────────────────────────────────┬──────────────────┐
│  Architecture View (viewer canvas)  70%     │  Assembly Editor │
├──────────────────────────────┬──────────────┤       30%        │
│  Registers   │  Memory       │    (stack)   │                  │
└──────────────────────────────┴──────────────┴──────────────────┘
```

The left column is the read-only schematic (viewer mode) with a Registers and a
Memory panel stacked below it; the right column is the assembly editor. All
panels are Golden Layout components, so they can be dragged, resized and stacked
by the user.

### 9.2 Viewer mode

The viewer mounts the same `SchematicEditor` component with `mode: "viewer"`,
which instantiates `SchematicDesigner` with all interaction predicates disabled
(§6.4). There is no palette, no toolbar, no routing and no dragging — the
diagram is locked, exactly as specified for the runtime perspective. The designer
still exposes `getNets()`, `getModuleNode()`, `getWireNode()` and
`getValueLayer()`, which is all the viewer needs to overlay runtime state.

### 9.3 Signal sampling at 60 fps

`SchematicViewer.vue` runs a `requestAnimationFrame` loop that is entirely
read-only with respect to the engine:

1. for every net, read `engine.getNetValue(net.id)` — an O(1) array read through
   a pre-built map;
2. **dirty-check** against the last painted value and skip the repaint when
   unchanged;
3. recolour the wire via `setWireSignalState(wire, value !== 0)` only when the
   value actually changed.

This two-tier scheme — the engine runs at the configured cycle rate, the canvas
repaints at display rate, and repaints only happen on change — is the
performance contract from the STYLE_GUIDE: the canvas never drives the
simulation, and steady-state nets cost nothing per frame.

### 9.4 Port value labels and probing

The same sampling loop writes a compact **always-on** label beside every port,
lifted into the non-listening `valueLayer` so numbers render above the wires.
The format is `formatPortValue`: 1-bit control lines render as a bare `0`/`1`,
wider buses as unpadded hex (`0x1f`). Hovering a port shows the full detail via
`formatWord` — padded hex, zero-padded binary and decimal — the three-radix probe
specified in the UI plan. Labels are rebuilt once per mount (the canvas is
locked) and dirty-checked per port per frame.

### 9.5 Data panels via manifest `panel`

The Registers and Memory panels are not hard-coded in the simulator layout; they
are components attached to the *manifests* that own the state:

| Manifest | Panel | State type |
| --- | --- | --- |
| `std.regfile` | `register-file/Panel.vue` | `RegisterFileState { values }` |
| `std.imem` | `instruction-memory/Panel.vue` | `WordMemoryState { words }` |
| `std.dmem` | `data-memory/Panel.vue` | `WordMemoryState { words }` |

A panel receives `ModulePanelProps` — the resolved `config`, the engine-owned
`state` (the *same* buffer the evaluator mutates) and a `revision` counter the
host bumps each frame. Panels mutate the shared typed array directly and emit
`update`, so an edit in the Registers panel is visible to the engine on the very
next cycle and to the canvas on the next sample. The generic `WordMemoryTable`
renders any word-addressed memory.

### 9.6 Execution control state machine

`simulationStore` holds `status: "stopped" | "running" | "paused"`, `cycleCount`
and `speed` (cycles/second). The control surface is `useSimulation`'s four
functions plus the keyboard map:

| Action | Shortcut | Precondition | Result |
| --- | --- | --- | --- |
| `run()` | F5 | not running; compiles clean | `running`, continuous stepping at `speed` |
| `pause()` | F6 | running | `paused`, loop stopped |
| `step()` | F10 | not running | one `engine.step()`, then `paused` |
| `stop()` | — | running or paused | `reset()`, `stopped`, cycle 0 |

A failed compile (engine errors) blocks `run()`/`step()` and reports the first
error through a notification. The engine is forward-only (§1.4, §5.11). The
full Load/Start/Restart/Stop/Pause/Next-Step control table in
`docs/SIMULATOR_OVERVIEW.md` §4 is implemented by the framework-free
`SimulationSession` (`src/core/simulation/`), adapted to Vue by
`useSimulation.ts`, and surfaced in the TopBar and the editor panel's Load
action.

### 9.7 Toolbar and shortcuts

While in the Simulate perspective, the `TopBar` renders the full control set —
Assemble/Load, Run, Pause, Stop, Restart and Step — over the Phase 2 control
state machine (`useSimulation.ts`), plus the cycle counter with the
finished-at annotation. The editor panel carries its own Assemble/Load button
next to the code it applies to. F5 (Start/Resume), F6 (Pause), F7 (Assemble
and Load), F9 (Restart) and F10 (Step) are registered in
`src/config/keyboard-shortcuts.ts` and are gated to fire only in the Simulate
perspective. A floating, draggable simulation control bar that can dock to the
top bar is a Planned refinement (§12.4).

### 9.8 Current limitations

- The end-to-end assemble → load → run loop is live in the UI (Phase 4): the
  CodeMirror editor binds the mapped `ProjectEditor`, the manifest panels
  (register file / instruction memory / data memory) are mounted through the
  generic `ModulePanelHost`, and the diagnostics strip renders assembler
  errors with click-to-reveal. Editor *richness* — syntax highlighting,
  completion, lint gutter decorations, go-to-definition, current-instruction
  highlighting — is deferred (each attaches to the existing CodeMirror
  instance as an extension).
- Per-module panel visibility toggles for architecture creators (§3
  "Component Panels") are not yet modeled in the configuration; every
  panel-capable module currently gets a panel tab in the Simulate layout.
- Net routing waypoints are not yet authored in the shipped template, so the
  Design perspective's orthogonal routing polish remains a visual-pass step.

---

## 10. User Interface, Layout and Theming

### 10.1 Panel layout via Golden Layout

Both perspectives are Golden Layout trees declared as plain data
(`DesignLayout.vue`, `SimulateLayout.vue`) and hosted by a thin wrapper
(`src/components/layout/GoldenLayout.vue`). The wrapper instantiates Golden
Layout, registers each named component through a factory, and mounts Vue
components into the layout's DOM containers via `Teleport` with `markRaw`/
`shallowRef` to keep the layout engine out of Vue's reactivity. The Design
layout is Palette / (Editor + Problems) / Inspector; the Simulate layout is
(Viewer + Registers/Memory stack) / Code (§9.1).

### 10.2 Design tokens and the jagged aesthetic

Colours and surfaces are CSS custom properties in `src/assets/index.css`,
exposed to Tailwind as utilities and to Konva through `readRenderTheme()`:

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-primary` | `#5a82d8` | `#0284c7` | Accent / primary action |
| `--bg-app` | `#f8fafc` | `#101014` | Application background |
| `--bg-surface` | `#ffffff` | `#1e293b` | Panels, cards |
| `--bg-element` | `#f1f5f9` | `#334155` | Raised elements |
| `--text-primary` / `--text-secondary` | `#0f172a` / `#475569` | `#f8fafc` / `#cbd5e1` | Text hierarchy |
| `--color-warning` / `--color-danger` | `#f59e0b` / `#ef4444` | — | Lint highlights |
| `--border-color` | `#e2e8f0` | `#334155` | Borders |

The project's visual identity is the **jagged aesthetic**: zero border radius
everywhere (`--radius-global: 0px`, Naive UI theme overrides set `borderRadius`
to `0px`). Naive UI is the mandatory component source for structure and forms;
Tailwind is restricted to high-level positioning, spacing and token-based colour
classes; raw `<style>` blocks are forbidden except for Konva/canvas overrides.
All icons are Tabler (`@tabler/icons-vue`).

### 10.3 Naive UI theme synchronisation

`App.vue` wraps the tree in `NConfigProvider` with per-mode theme overrides so
Naive UI's internal palette (base colour, text colours, table/card/modal
surfaces, borders) matches the CSS tokens. A `theme-change` window event swaps
the Naive theme and overrides without a reload.

### 10.4 Theme switching and Konva

The theme is a class on `document.documentElement`
(`theme-light` / `theme-dark`), toggled by `useTheme`/`UIStore.setTheme`. The
schematic resolves its colours at draw time from the CSS variables
(`RenderTheme`), so module bodies never hard-code a colour. A known defect is
recorded in `todo.md`: switching themes does not immediately re-derive the
already-drawn canvas colours — the designer re-reads the theme on next redraw,
so the change currently requires a reload (Planned fix, §12.4). The viewer
watches `isDark` and clears its value caches so its next frame recolours wires
and labels, which mitigates the issue for the runtime layer.

### 10.5 Formatting and typography

Runtime values use the shared formatters in `src/shared/utils/format.ts`:
`formatWord` (padded hex / binary / decimal) for probe tooltips and
`formatPortValue` (bare bit or unpadded hex) for the always-on labels. Dates in
the Home page use `formatDate`/`formatDateRecent`.

---

## 11. Project Management and Persistence

### 11.1 Routes and the application shell

The router (`src/router.ts`) has exactly two routes: `/` (Home) and
`/workspace`. `Workspace.vue` guards the workspace: if no project is loaded it
notifies and redirects to Home. A comment in the router records the intent to
append `:projectID` to the workspace route and restore the last project/mode on
load — that is a Planned item (§12.3), currently unimplemented.

### 11.2 The IndexedDB schema

Persistence is a single IndexedDB database via JsStore (`src/db/`):

```
database: { name: "mipstream", version: 4, tables: [projectTableConfig] }
```

The `projects` table has one column per project field:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | number | primary key, auto-increment |
| `name` | string | not null |
| `description` | string | default `""` |
| `software` | object | `{ editors: [...] }` |
| `architecture` | object | the full `ArchitectureConfig` |
| `settings` | object | project settings |
| `createdAt` / `updatedAt` | date_time | |

The entire architecture (modules, nets, configuration) is one JSON column — no
normalisation, no joins. That is a deliberate simplicity trade-off: projects
are edited whole, loaded whole and saved whole, and the object graph must be
JSON-safe anyway (§3.8). `BaseRepository<T>` provides the generic
select/insert/update/delete/count operations used by `ProjectRepository`.

### 11.3 Templates and project creation

`src/config/templates.ts` defines three project templates — `blank` (empty
architecture, one empty `main.s` editor), `mips-basic` (a complete
single-cycle MIPS datapath — the golden 18-module / 33-net netlist defined
in `src/config/mips-single-cycle-datapath.ts` — with a five-stage
pipeline configuration, an `imem` mapping, the MIPS ISA preset and a
starter program) and `mips-pipelined` (the classic five-stage pipelined
datapath — the golden 24-module / 67-net netlist in
`src/config/mips-pipelined-datapath.ts`, whose stage boundaries are single
multi-pin managed `std.register` walls carrying the instruction word and
the pipelined control signals, with EX-resolved branches flushing IF/ID +
ID/EX through their synchronous `rst` pins — the same configuration pieces
plus `pipeline.enabled`, a hazard-free starter program and Rig E headless
coverage) — and the three underlying `ArchitectureConfig` values
`BLANK_ARCHITECTURE`, `BASIC_MIPS_ARCHITECTURE` and
`MIPS_PIPELINED_ARCHITECTURE`. `insertProject`
deep-copies the chosen architecture and settings into a fresh project so
templates are never mutated by reference.

### 11.4 The save flow

Saving is a three-step funnel that exists to reconcile the live canvas with the
persisted row:

1. `useProjectSave.saveCurrentProject()` calls `syncLiveArchitecture()`, which
   asks the mounted designer for its snapshot and writes it into the project
   store (when no canvas is mounted, the stored architecture is kept);
2. `projectStore.saveProject()` stamps `updatedAt` and calls
   `updateProject(toRaw(project))`, persisting the whole row;
3. `updateRecentProjects()` refreshes the Home list (latest 10 by `updatedAt`).

The save funnel is layered: a silent core, `persistCurrentProject()` (sync the
live schematic + live panel arrangement into the store, then write the row),
is wrapped by `useProjectSave.saveCurrentProject()` — the explicit save
shared by the toolbar button, the File menu and Ctrl/Cmd+S — which adds the
success toast (gated by the `projectSaveNotification` general setting) and a
recents refresh. On top of that, `useAutosave` (App-hosted) watches the dirty
flag and debounces (2 s) into the silent core while the `autoSave` setting is
on (default on); it flushes on tab hide/page close and re-arms with backoff
after a failed write, and `beforeunload` prompts while anything is unsaved
(a data-safety net that is also active with autosave off). The project title
in the top bar shows a `*` suffix whenever `projectSaved` is false, plus a
small "Saved HH:MM" / autosave-failure hint. Replacing the active project
(open another, reopen the same row, create new) goes through
`useProjectSwitch.openProject`, which guards a dirty project with a three-way
dialog: Save & continue, Discard changes, or Cancel.

### 11.5 Dirty tracking and document revision

Two independent "something changed" signals coexist:

- `projectStore.projectSaved` — whether the project has unsaved changes, set
  false by `markUnsaved()`/`updateArchitecture()` and true again on save. A
  monotonic `mutationCount` backs the flag: `saveProject()` compares it
  before/after its async write so edits landing while a save is in flight
  keep the project dirty instead of being silently marked clean;
- `documentRevision` — the designer's commit counter, bumped on every canvas
  mutation and used to invalidate the compiled simulation (§5.9, §6.15).

The revision counter is finer-grained than the dirty flag: it must invalidate
the engine even when the user has not yet saved, because the running simulation
always compiles from the *live* document, not the last save.

### 11.6 Loading and migration

Loading a project reads the row and hands its `architecture` to the workspace,
where `SchematicEditor` restores it through `loadArchitecture` (§6.16). Two
migration seams protect old data: `ensureConfiguration` normalises the
configuration shape (§7.8) and `normalizeAssemblerConfig` migrates pre-range
ISA payloads (§8.2). Because `config` stores only overrides, new manifest
defaults apply to old projects without an explicit migration step.

### 11.7 Export, import and templates

Implemented 2026-11-11: DB v6 adds an `architecture_templates` table for
user-made templates. "Save Architecture as Template…" (File menu) snapshots
the live document into a template row; the Create Project picker lists them
under "My Templates" (hardware only — no code editors), with popconfirm
delete. Export downloads a single versioned `.miparch` JSON bundle
(`mipstream-architecture-bundle` v1: the project's architecture plus a full
snapshot of the template table); Import validates the bundle, confirms both
restore effects, then replaces the template table wholesale and the current
project's architecture in place (mounted canvas: `replaceArchitecture` =
clear + load as the new undo baseline; otherwise a store-only write plus a
document-revision bump). Exports never dirty the project; imports do and
invalidate the compiled simulation. Remaining: the Electron variant's native
"Save architecture as" / "Load architecture" (§12.5) — browser file IO is
isolated in `src/shared/utils/file-io.ts` as the swap point.

### 11.8 Project management

Implemented 2026-11-01 (Phase 5): the last project and perspective are
remembered via the URL (`/workspace/:projectId?` + `?perspective=` query —
F5/deep links restore; a once-per-launch redirect reopens the last session,
gated by the `autoReopenLastProject` setting, with a Home resume banner as
the manual path); each project's Golden Layout state persists in a nullable
`layouts` column (schema v5) per perspective, restored through
`layout-reconcile` against the live component registry and written via
targeted column writes that do not stamp `updatedAt`; autosave (§11.4); and
the Home page's Recent Projects list is a sortable, searchable table with
Open/Delete/Rename actions.

---

## 12. Planned Features and Design Intent

This section reproduces the open items in `todo.md` as **design intent** — what
the feature is, why it belongs in the current architecture, and which subsystem
it touches. None of these are implemented. The items are grouped as in the todo
file; the "Affected" column names the modules from §2.2 that would change.

### 12.1 Simulator

| Item | Design intent | Affected |
| --- | --- | --- |
| CodeMirror assembly editor | Replace the placeholder with a CodeMirror panel providing syntax highlighting, completion, lint, error highlighting, Ctrl-click go-to-definition and current-instruction highlighting — **for any ISA definition**. The ISA-driven nature is the key requirement: providers must consume `AssemblerConfig` (§8), not a MIPS grammar. | `simulator/components`, `config/monaco` (retire), new CodeMirror providers |
| Pan the schematic viewer | Enable panning in viewer mode; today panning exists in editor mode via `EventManager`, so this is a predicate change, not new machinery. | `editor/core/events.ts`, `SchematicViewer.vue` |

### 12.2 Architecture designer

| Item | Design intent | Affected |
| --- | --- | --- |
| Delete a single net *segment*, not the whole net | Refine `deleteSelected`/`removeNet` so deletion operates on the hovered segment; requires a segment identity layered over `SerializedNet`'s waypoint/branch geometry. | `designer.ts`, `wire-drag.ts`, `routing.ts` |
| Wires match the dashed ghost exactly | The committed wire can occasionally choose the opposite orthogonal direction from the preview; the fix is to commit from the exact polyline the `RoutingManager` previews (§6.8). | `routing.ts` |
| Stage registers with configurable pins | Let a stage register expose a user-configured set of input/output pin pairs (in/out always together), in the style of the control unit's table editor. Requires a `configEditor` for `std.register` and config-driven `generatePorts`. | `register/index.ts`, new config editor |
| Toggleable reset pin on stage registers | Add an optional reset input drawn from the top of the symbol; evaluation resets on the clock edge when asserted. | `register` manifest, `createEvaluators` |
| Undo/redo | **Implemented (2026-10-31, §6.17)** as memento history over the `notifyDocumentChange` commit seam: whole-document snapshots (`history.ts`), gesture batching (`runBatched`) for multi-delete/paste/settings cascades, and configuration restore for settings batches. | `designer.ts`, `history.ts`, `history-bridge.ts` |
| Theme switch updates the diagram immediately | Re-resolve `RenderTheme` and redraw the canvas on theme change rather than requiring a reload (§10.4). | `render/theme.ts`, `SchematicEditor.vue`, `useTheme` |
| Splitter/merger: warn on oversized auto-map | When an automatic `x:y` mapping exceeds the configured output width it currently fails silently; surface a warning in the config editor. | `wiring-logic.ts`, `SplitterConfigEditor.vue`, `MergerConfigEditor.vue` |
| Splitter: one input pin → multiple outputs | Relax the one-to-one constraint so a bus bit can fan out to several splitter outputs (the current model rejects it). | `wiring-logic.ts`, splitter editor |
| Merger: disallow multiple inputs → one output | The current wired-OR behaviour (allowed, with a warning) is unwanted; make it an error. | `wiring-logic.ts`, merger editor |
| Configurable ALU / ALU-control operations | Make the ALU operation set and the ALU-control signal mapping user-editable with a reset-to-default, defaulting to the standard 4-bit map (`0000` AND … `1110` NOP). This generalises the two encoding tables in §4.8 from constants to config. | `alu/index.ts`, `alu-control/index.ts`, new config editors |
| Import/export/"save as template" | New IndexedDB table for user templates; single-file export of architecture + templates; "save as template" writes the current architecture to the table. | `db/tables.ts`, `services`, new modal |
| Error when deleting a managed stage register | `isManagedModule` already *prevents* deletion silently; the intent is an explanatory error rather than a no-op. | `designer.ts`, `ProblemsPanel` |
| Fine-grained routing with Alt held | **Implemented (2026-10-31, §6.9)** as free-form mode: Alt+drag moves the grabbed segment in both axes without auto-inserted orthogonal bends (diagonal legs allowed); free-form polylines render verbatim (`composeNetPathVerbatim`) and persist `freeform` flags. | `wire-drag.ts`, `orthogonal-path.ts`, `netlist.ts` |

### 12.3 Project management

| Item | Design intent | Affected |
| --- | --- | --- |
| Remember where the user left off | Persist the current project and perspective in URL route + params and restore on load (§11.1). | `router.ts`, `UIStore` |
| Remember Golden Layout state per project | Save/restore each project's panel positions, sizes and collapsed state alongside the project. | `GoldenLayout.vue`, `db`, project store |
| Autosave | Debounced background save; interacts with `projectSaved` and the explicit-save funnel (§11.4). | `useProjectSave.ts`, `projectStore` |
| ~~Update the MIPS single-cycle template~~ **Done (Phase 3, 2026-10-24)** — `BASIC_MIPS_ARCHITECTURE` now ships the golden single-cycle datapath (`src/config/mips-single-cycle-datapath.ts`), validated headlessly by Rig C in `npm run simulation:check`. | | `config/templates.ts` |

### 12.4 UI/UX

| Item | Design intent | Affected |
| --- | --- | --- |
| View menu panel toggles | Toggleable list of panels grouped by perspective, with Show all / Hide all. | `TopBar.vue`, `GoldenLayout` |
| Reset layout | Restore the default layout from the View menu. | `TopBar.vue`, layout configs |
| Multiple base layouts | User-selectable layout presets with "Save current layout as new". | layout configs, settings store |
| Keyboard shortcut to switch perspectives | A single binding to flip Design/Simulate (currently only the toolbar buttons). | `config/keyboard-shortcuts.ts` |
| Floating, dockable simulation controls | Pop the run/pause/step controls out of the top bar into a movable toolbar that can dock back. | `TopBar.vue`, `simulator` |
| Recent Projects as a table | Replace the Recent Projects list with a sortable, searchable table (Project Name, Last Modified, Mode, Actions: Open/Delete/Rename). | `pages/Home.vue` |

### 12.5 Electron app

| Item | Design intent | Affected |
| --- | --- | --- |
| Electron variant | Run offline with native file-system save/load; the engine and designer are already framework-free (§2.2), so this is a shell + IPC layer, not a core change. | new `electron/` tree, persistence adapter |
| Export/import project | Single-file project export (including Golden Layout); "Save as"/"Open" in Electron. | `services`, `serialization.ts`, Electron |
| "Save as" project | Duplicate the current project under a new name; file system in Electron. | `projectsService.ts`, project store |

The unifying observation across §12 is that most items are *extensions at an
existing seam* (a manifest `configEditor`, a bridge, a layout config, a
persistence adapter), which is the intended payoff of the manifest/registry and
pure-designer architecture of §4 and §6.

---

## 13. Design Rationale and Trade-offs

### 13.1 Why manifests rather than a class hierarchy

A class hierarchy would have put each component's behaviour behind `extends
Component` with overridden methods, requiring the engine and designer to know
the base class and every addition to touch shared code. A manifest is data, so
the engine and designer depend only on `ModuleManifest`, and the extension
surface is a registry lookup. The cost is that cross-cutting concerns (state
injection, width masking) must be spelled out in every evaluator; the benefit is
that those concerns are *visible per component* and the core never grows a
`switch`. For a teaching tool whose stated goal is that users add their own
components, the data-driven form is the correct default (goal **G5**).

### 13.2 Why a flat buffer and topological sort

The naive design — every wire an object that notifies its neighbours — is easy
to reason about but allocates per edge, recurses, and becomes a maintenance
hazard under Reactivity. The engine instead pre-computes a single
`Uint32Array` and a fixed evaluation order. This buys O(V) stepping, zero
allocation in the steady state and trivial determinism (§5.10). The price is a
one-time compile pass and a coarse simulation model (no event-driven deltas,
loops are errors rather than oscillations). For cycle-accurate CPU simulation
— where every net is read and written every cycle anyway — the flat model is
both simpler and faster than the event-driven alternative.

### 13.3 Why a pure-TS designer

Editing state in Vue components would couple interaction logic to the render
scheduler and make it untestable outside a browser. `SchematicDesigner` and its
managers are plain classes that own Konva imperatively; Vue components are thin
hosts. This is the same separation the engine uses (§2.4 rule 1), applied to
the editor: the bridge modules are the only reactive seam, and each is a few
lines. The known cost is that some Vue conveniences (reactive form bindings in
the Inspector) must be re-implemented through `setModuleConfig` round-trips,
which is exactly the indirection the `documentRevision` counter exists to keep
cheap.

### 13.4 Why three data layers

A single representation cannot be simultaneously JSON-persistable, editor-rich
and simulation-fast (§3.3). Stratifying into Serialized → Hydrated → Runtime
makes each layer's invariants enforceable locally: persistence never sees a
function, the editor always has resolved ports, the engine always has integer
indirection. The cost is two explicit conversions (`hydrateModule`,
`compileArchitecture`) whose correctness must be maintained as the schema
evolves; the benefit is that the boundaries are where the migration seams
(§7.8, §11.6) naturally live.

### 13.5 Why one-to-many assembler mappings

Pipelined and multi-issue datapaths genuinely need a program to reach more than
one instruction memory. Modelling this as one row per editor with a target list
(§7.4) keeps the common case (one editor, one memory) a single-element list and
makes the relationship's cardinality explicit in the type system, rather than
hiding it in naming conventions.

### 13.6 Why a config-driven control unit

The control unit is the component most likely to be different in every design a
student builds, so it is the strongest argument for configuration over code. Its
signals and decode table are user data compiled into a flat lookup at hydration
time (§4.7), which means a student's custom decode table is *as fast as* the
hand-written default — the configuration cost is paid once, at compile time, not
per cycle. The same reasoning is being extended to the ALU and ALU-control in
the planned work (§12.2).

### 13.7 Why shared validation

Netlist validity (width, direction, drivers) is exactly the kind of rule that
drifts if implemented twice. By routing the designer's lint through the engine's
resolver (§6.13), the two surfaces are consistent by construction, and the
"problem → canvas highlight → engine gate" chain is a single data path. The only
cost is that lint must tolerate a *design-in-progress* state (missing
connections are `info`, not errors), which is handled by a severity split rather
than a second resolver.

### 13.8 Trade-off summary

| Decision | Wins | Costs | Mitigation |
| --- | --- | --- | --- |
| Whole-architecture JSON column in IndexedDB | No joins, no hydration mapping, whole-document semantics | No query-time partial reads; whole-row rewrite on save | Projects are small; save is explicit |
| Unsigned 32-bit words only | One buffer type, one mask, no sign plumbing | No multi-word, no `X`/`Z` | Signedness delegated to manifests |
| Single-pass combinational semantics | Deterministic, allocation-free | No delta cycles; loops are errors | Loop detection + "insert a register" guidance |
| Level-sensitive write in combinational modules | Read-old/write-new for free | Relies on once-per-pass guarantee | Enforced by the single topological pass |
| Pure-TS designer + bridges | Testable, framework-free | Manual bridge plumbing | Bridges kept tiny; revision counter centralises invalidation |
| Config = overrides only | Small files; defaults propagate | Ambiguity when a default changes | Normalisation on load; versioned migrations at the seams |
| "Pave over" legacy retention | Reference behaviour stays available | Type-check noise from `src/legacy/**` | Exclude legacy from `tsconfig`; §2.3 |

### 13.9 Validity and current limitations

The design's correctness claims are strongest where the code is exercised: the
engine's 19 self-checks cover the clock-phase semantics, the zero rail, loop
detection, reset and lint (Appendix C). The weakest points are the ones this
chapter has marked Partial or Planned — the assembler is not executable, the
Simulate editor and panels are placeholders, and the type-check is not green due
to legacy residue. These are recorded as facts, not glossed over, because they
bound what can currently be claimed about the system as a whole.

### 13.10 Contribution summary

Relative to the two tool families in §1.2, the design contributes: (i) a single
`Project` artefact that unifies netlist, configuration and program; (ii) an
ISA-agnostic core whose only MIPS residue is confined to configurable component
tables; (iii) a manifest contract that makes hardware extensibility a
non-invasive operation; (iv) a headless, deterministic, O(V)-per-cycle engine
with a shared validation source; and (v) a deliberate three-layer data model and
a "pave-over" migration strategy that make the current partial state explicit
and recoverable.

---

## Appendix A — File-Level Responsibility Map

A compact index of the files referenced throughout, for traceability.

| Path | Responsibility |
| --- | --- |
| `src/main.ts` | Bootstrap: Pinia, router, Konva plugin, `initStandardManifests()`. |
| `src/App.vue` | Naive UI providers, theme overrides, TopBar, modals, router view. |
| `src/router.ts` | Routes `/` and `/workspace`. |
| `src/shared/types/{project,architecture,netlist,manifest,isa}.ts` | The three-layer type contracts and the ISA model. |
| `src/shared/manifestRegistry.ts` | Manifest registry, `hydrateModule`, category list. |
| `src/shared/serialization.ts` | `serializeArchitecture` / `deserializeArchitecture`. |
| `src/shared/manifests/index.ts` | The 22-manifest `StandardManifests` list and re-exports. |
| `src/shared/manifests/wiring-logic.ts` | Bit-to-bit field maps shared by splitter/merger. |
| `src/shared/manifests/word-memory.ts` | Word-addressed memory storage + read/write helpers. |
| `src/shared/utils/*` | Pure helpers: bit-ops, geometry, netlist, stage registers, pipeline stages, ISA validation, formatting. |
| `src/core/engine/compile/{resolver,wire-index,topological-sort,compiler}.ts` | Compile pipeline stages 0–2. |
| `src/core/engine/{engine,lint,types}.ts` | Engine class, lint pass, compile-time types. |
| `src/core/engine/engine-smoke.ts` | Executable self-check (19 checks). |
| `src/editor/core/designer.ts` | `SchematicDesigner` orchestrator. |
| `src/editor/core/{events,grid,keyboard,placement,routing,selection,wire-drag}.ts` | The eight manager classes. |
| `src/editor/core/render/*` | Module/wire/ghost/theme/tooltip/orthogonal-path rendering. |
| `src/editor/components/*` | Vue hosts: `SchematicEditor`, `SchematicViewer`, palette, inspector, problems, toolbar. |
| `src/editor/components/settings/*` | Architecture settings modal and its three tabs. |
| `src/composables/useSimulation.ts` | Engine lifecycle and the rAF run loop. |
| `src/composables/useArchitectureSettings.ts` | Draft/commit flow incl. stage-register sync. |
| `src/composables/useProjectSave.ts` | `syncLiveArchitecture` + explicit save flow. |
| `src/stores/*` | Pinia: project, simulation, UI, settings. |
| `src/config/{default-configuration,isa-presets,templates,keyboard-shortcuts}.ts` | Defaults, presets, templates, app shortcuts. |
| `src/db/{database,tables,repository}.ts` | JsStore connection, schema, generic repository. |
| `src/services/projectsService.ts` | Project CRUD façade + default settings. |
| `src/simulator/*` | Simulate perspective layout and panels. |
| `src/legacy/**` | Quarantined original implementation. |

---

## Appendix B — Glossary of Abbreviations

| Abbreviation | Expansion |
| --- | --- |
| ALU | Arithmetic Logic Unit |
| ISA | Instruction Set Architecture |
| PDL | Processor Description Language (the configurable encoding model, §8) |
| PC | Program Counter |
| ROM | Read-Only Memory (the instruction memory is modelled as one) |
| rAF | `requestAnimationFrame` |
| PWA | Progressive Web App |
| SSR | Server-Side Rendering (used here only for the engine check bundle) |

---

## Appendix C — Validation Procedure and Results

### C.1 Engine self-check

Command:

```
npm run engine:check
```

This builds `src/core/engine` into an SSR bundle
(`.engine-check/engine-smoke.js`) with no UI dependencies and executes it under
Node. The observed output (truncated to the result lines):

```
PASS  counter: compiles clean
PASS  counter: zero rail on undriven cin
PASS  counter: q after 3 cycles
PASS  counter: net n2 mirrors q
PASS  counter: reset rewinds to 0
PASS  chain: r1 latches on cycle 1
PASS  chain: r2 still 0 on cycle 1 (no same-edge ripple)
PASS  chain: r2 latches on cycle 2
PASS  loop: detected as compile error
PASS  unknown type: compile error
PASS  unknown type: port reads null
PASS  both-edge: q advances 2 in one cycle
PASS  both-edge: q advances twice per cycle
PASS  accumulator: compiles clean
PASS  accumulator: unconnected out readable (private slot)
PASS  accumulator: engine owns state
PASS  lint: width mismatch flagged with refs
PASS  lint: unconnected ports flagged as info
PASS  lint: loop flagged as error

All engine checks passed.
```

These nineteen checks exercise: clean and error compilation, the constant-zero
rail, sequential latching with simultaneous-edge semantics (the no-ripple
property), both-edge double-stepping, reset, private slots for unconnected
outputs, engine ownership of module state, and the lint width/loop/connectivity
diagnostics (§5).

### C.2 Type-check status

Command: `npx vue-tsc --noEmit` (equivalent to the first half of
`npm run build`).

Result: **not green at the time of writing.** The errors are dominated by
`src/legacy/**` (imports of modules that were not carried over in the pave-over
migration) plus three active-module issues enumerated in §2.3. The engine
(`src/core/engine/**`) compiles without error, as evidenced by C.1.

*End of specification.*

































