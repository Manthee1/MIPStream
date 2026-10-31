# MIPStream

Digital logic schematic editor and computer architecture simulator.

## Functionality
- Schematic capture with orthogonal routing.
- Cycle-accurate simulation via dependency graph evaluation.
- Custom ISA definition via PDL (Processor Description Language).
- Dual-mode operation: Design (edit) and Simulate (runtime).

## Stack
- Framework: Vue 3, Pinia, Vue Router
- UI/Layout: Radix Vue, Tailwind CSS v4, Golden Layout
- Graphics: Konva (via vue-konva)
- Persistence: JsStore (IndexedDB)
- Editor: CodeMirror

## Usage
1. `npm install`
2. `npm run dev`

## Structure
- src/core/engine: Simulation runtime logic.
- src/editor: Schematic editor components and wiring.
- src/simulator: Runtime diagnostic panels.
- src/shared: Component manifests and unified types.
- src/legacy: Archived MIPS-specific code.

Documentation located in /docs.
Agent context located in AGENTS.md.
