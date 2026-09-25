# Cleanup & Structural Reorganization Strategy

To transition from a hardcoded MIPS simulator to a universal architecture editor, the project will follow a "Pave Over" strategy for legacy components.

## 1. The "Pave Over" Philosophy
Rather than attempting to incrementally patch legacy code that is tightly coupled to a single architecture, core systems will be reimplemented from scratch using the new unified project model. Legacy code will be isolated to prevent it from polluting the new architecture.

## 2. Structural Reorganization
The codebase will be restructured to separate concerns between simulation, design, and shared logic:

- **`src/core/engine/`**: (New) Pure TypeScript simulation logic. Optimized for performance, operating exclusively on memory buffers.
- **`src/editor/`**: (New) Design Perspective. Logic and UI for the Konva-based architecture editor.
- **`src/simulator/`**: (New) Simulate Perspective. Data-driven panels and runtime UI for inspecting simulation state.
- **`src/shared/`**: (New) Types, Manifests, and Utility functions shared across perspectives.
- **`src/legacy/`**: (Temporary) Quarantine for old MIPS-hardcoded logic, components, and utilities.

## 3. High-Priority Cleanup Areas
- **Simulation Store**: The current `simulationStore.ts` is MIPS-specific and will be replaced by a generic runtime controller.
- **Panels**: Hardcoded Vue panels (Registers, Memory, Stages) will be replaced by parametric versions that adapt to the active architecture's modules.
- **Legacy CSS**: Custom grid systems and outdated CSS frameworks (Skeleton) will be purged in favor of a modern, variable-based theme system.
- **LSP / Monaco**: The Monaco editor configuration will be updated to be driven by the project's PDL (Processor Description Language) rather than a static config.

## 4. Decommissioning Process
Legacy code remains in the `src/legacy/` directory until its functionality is fully replicated and verified in the new system. Once the MVP reaches parity with the old simulator's core features, the legacy directory will be purged.
