# Project MVP Roadmap (2026)

## Phase 1: Core Simulation Engine & Type Unification (Current)
- [ ] **Type Refactoring**: Split Serialized (JSON), Hydrated (Editor), and Runtime (Engine) types.
- [ ] **Headless Engine**: Implement the `Uint32Array` based simulation loop.
- [ ] **Dependency Compiler**: Logic to sort modules into a flat execution array based on netlist topology.
- [ ] **Clock Cycle Controller**: Implementation of the 2-phase (Rising/Falling) clock logic.

## Phase 2: Architecture Editor (Design Perspective)
- [ ] **Konva Canvas**: Basic stage with infinite pan/zoom.
- [ ] **Module Components**: Rendering modules with dynamic ports.
- [ ] **Orthogonal Wiring**: Implementation of the trunk/branch wiring system with junction support.
- [ ] **Property Inspector**: Sidebar for configuring module parameters (e.g., MUX width, ALU ops).

## Phase 3: Project & ISA Management
- [ ] **Unified Project Model**: Implementation of the `.simproj` container.
- [ ] **PDL (Processor Description Language)**: Schema for defining custom instruction sets.
- [ ] **Assembler Integration**: Hooking the existing `Assembler` class into the multi-memory architecture.

## Phase 4: Simulator & UX (Simulate Perspective)
- [ ] **Runtime Sync**: Reactive bridge between the Engine's `Uint32Array` and the UI.
- [ ] **Educational Layer**: Hover probes and Markdown documentation rendering.
- [ ] **Golden Layout Migration**: Replacing Dockview with Golden Layout for workspace management.
- [ ] **Diagnostic Panels**: Memory, Register, and Pipeline stage inspectors.
