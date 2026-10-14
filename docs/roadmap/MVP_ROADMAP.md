# Project MVP Roadmap (2026)

## Phase 0: Cleanup & Workspace Prep (Immediate)
- [x] **Structural Reorganization**: Move legacy MIPS-hardcoded logic to `src/legacy/`.
- [x] **Dependency Setup**: Install `konva`, `vue-konva`, and `golden-layout`.
- [x] **Unified Project Store**: Create `projectStore.ts` to manage the new `Project` container (Hardware + Software).
- [x] **Legacy CSS Purge**: Clean up `src/assets/sass/` and establish a CSS-variable-driven theme system.

## Phase 1: Core Simulation Engine & Type Unification
- [x] **Type Refactoring**: Finalize the Serialized, Hydrated, and Runtime type layers in `src/types/architecture.ts`.
- [ ] **Headless Engine**: Implement the `Uint32Array` based simulation loop in `src/core/engine/`.
- [ ] **Topological Compiler**: Logic to sort modules into a flat execution array based on netlist topology.
- [ ] **Clock Cycle Controller**: Implementation of the 2-phase (Rising/Falling) clock logic.

## Phase 2: Architecture Editor (Design Perspective)
> See [Detailed Implementation Plan](../architecture/SCHEMATIC_DESIGNER_PLAN.md) for the Designer Class and Workflow.

- [x] **Konva Canvas**: Basic stage with infinite pan/zoom in `src/editor/`.
- [x] **Module Components**: Rendering modules with dynamic ports.
- [x] **Orthogonal Wiring**: Implementation of the trunk/branch wiring system with junction support.
- [x] **Property Inspector**: Sidebar for configuring module parameters.

## Phase 3: Project & ISA Management
- [ ] **Unified Project Model**: Implementation of the `.simproj` container.
- [ ] **PDL (Processor Description Language)**: Schema for defining custom instruction sets.
- [ ] **Assembler Integration**: Hooking the dynamic `Assembler` class into the multi-memory architecture.

## Phase 4: Simulator & UX (Simulate Perspective)
- [ ] **Runtime Sync**: Reactive bridge between the Engine's `Uint32Array` and the UI.
- [ ] **Educational Layer**: Hover probes and Markdown documentation rendering.
- [ ] **Golden Layout Migration**: Replacing Dockview with Golden Layout for workspace management.
- [ ] **Generic Diagnostic Panels**: Data-driven Memory, Register, and Pipeline inspectors in `src/simulator/`.

## Phase 5: Legacy Deletion
- [ ] **Final Audit**: Ensure all functionality from `src/legacy/` is ported.
- [ ] **Code Purge**: Remove the `src/legacy/` directory and unused dependencies.
