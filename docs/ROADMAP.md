# MIPStream — High-Level Roadmap (2026)

Purpose

- Shift MIPStream from a code-centric MIPS runner to an interactive CPU microarchitecture editor plus cycle-accurate simulator. The primary user goal is to enable users to visually build datapaths (like Logisim), configure control signals, and run cycle-accurate simulations with advanced branch prediction and verification capabilities.

High-level objectives

1. Visual Datapath Editor
   - Drag-and-drop components (ALU, Register File, MUX, Memory blocks, Pipeline registers).
   - Connect component ports with wires; show signal names, bit widths, and current values.
   - Support component configuration panels (latency, bit-width, register count).
   - Persist diagrams as JSON CPU descriptions.

2. Cycle-Accurate Simulation Engine
   - Single-cycle and pipelined modes.
   - Full hazard detection, forwarding, and stall control.
   - Support for static and dynamic branch predictors (configurable policies).
   - Step/Run/Pause controls with per-cycle trace output.

3. Configuration & Interchange
   - Define a JSON schema for CPU components and connections.
   - Ship example configs in `config/examples/`.
   - Provide importer/exporter for JSON CPU descriptions.

4. Verification & Tracing
   - Produce execution traces, CPI, stalls, branch miss rate, and per-run diagnostics.
   - Verification harness to compare final register/memory state vs golden traces.

5. UX & Developer Experience
   - Integrate Monaco for instruction editing where required.
   - Provide intuitive panel layout: diagram, registers, memory, instruction memory, and controls.
   - Add unit/integration tests for engine and config parsing.

Mapping to codebase (high-level file/area changes)

- `src/components/panels/` and `src/components/layout/`
  - Add/extend components for the visual editor (canvas, palette, property inspector).
  - Implement pan/zoom, selection, and wiring UI.

- `src/core/` and `core/`
  - Extract/extend simulation logic into a dedicated engine module with a stable stepping API (e.g., `Engine.step()` returns trace object).
  - Add interfaces to toggle single-cycle vs pipelined execution and branch predictor strategies.

- `src/stores/` and `stores/`
  - Add persistent store for diagram JSON, simulation state, and run metadata.
  - Support multiple CPU configs per project.

- `src/services/` and `core/config/`
  - Add JSON schema validation, import/export services, and config examples.

- `db/` and `storage/`
  - Ensure project persistence includes diagram JSON and example configs (versioned).

- `tests/` or `core/tests/`
  - Add fast unit tests for engine stepping, hazard detection, and branch predictor behaviour.
  - Add small integration tests that run example configs and compare traces against golden references.

Phased implementation (suggested)

Phase 0 — Discover & design (1 week)
- Finalize JSON schema draft and component model.
- Design UI mockups for the editor and property inspector.

Phase 1 — Core engine & schema (2–3 weeks)
- Implement minimal cycle-accurate engine API and unit tests.
- Define JSON schema and parser; add example configs.

Phase 2 — Visual editor MVP (3–4 weeks)
- Implement canvas, palette, wiring, and property panel.
- Hook editor to import/export JSON CPU descriptions.

Phase 3 — Integration & UX polish (2–3 weeks)
- Connect editor to simulation engine.
- Add step/run controls, traces, and diagnostics UI.

Phase 4 — Verification & examples (1–2 weeks)
- Implement verification harness and golden-reference tests.
- Add documentation and tutorial example configs.

Risks & trade-offs

- Full graphical editor is non-trivial; prioritize a minimal MVP with drag-drop, connect, and properties first.
- Aim for a stable engine API early so the UI can iterate independently.
- Keep JSON schema expressive but simple — avoid trying to model every exotic component up-front.

Next concrete steps (short)

- Review this roadmap and confirm priorities.
- Implement Phase 0: draft JSON schema and create `config/examples/` with 2 example CPU configs.
- Start Phase 1 by extracting a small `engine.ts` in `core/` with a stepping API and unit tests.
