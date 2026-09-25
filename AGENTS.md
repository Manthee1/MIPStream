# Agent Context & System Specification

This document provides high-level architectural context for AI agents working on this project. It details the domain model, simulation engine logic, and UI perspectives.

---

## 1. Unified Project Model

The platform unifies architecture definition, software programs, and simulation state into a single `Project` entity.

### Data Layers
- **Hardware Blueprint**: The netlist (modules, ports, muxes, ALUs, registers, wires, and pipeline stage boundaries).
- **Program & Initial State**: Assembly source code, machine code hex dumps, and initial RAM/Register states.
- **Runtime Session (Volatile)**: Simulation execution state (clock cycle counter, active pipeline tokens, wire logic values, register values).

---

## 2. Simulation Engine & Execution Logic

The simulation uses a high-performance headless engine.

### Evaluation Loop
1. **Compilation**: Architecture is compiled into a dependency graph.
2. **Topological Sort**: Combinational modules are ordered for single-pass forward propagation.
3. **Clock Phases**:
   - **Rising Edge**: Sequential modules (registers/latches) update.
   - **Combinational Pass**: Values propagate through sorted combinational logic.
   - **Falling Edge**: Falling-edge sensitive modules update.
   - **Final Pass**: Post-falling edge combinational stabilization.

### Memory Architecture
Uses `Uint32Array` buffers to store wire/net states. The UI samples this buffer at 60fps to decouple simulation speed from rendering.

---

## 3. Workspace Perspectives

The UI adapts to the user's intent via two primary modes:

### A. Design Perspective (Architecture Mode)
- **Target**: Hardware Engineering.
- **Features**: Unlocked Konva Canvas, Component Palette, Port Inspector, Wire Routing Tools.
- **Validation**: Bit-width mismatch detection and circular combinational path identification.

### B. Simulate Perspective (Runtime Mode)
- **Target**: Students and Programmers.
- **Features**: Code Editor/Assembler, Memory/Register Tables, Clock Controls.
- **Behavior**: Canvas visual elements are locked. Interaction is limited to non-destructive logic probing and tooltip-based documentation inspection.

---

## 4. Educational Documentation Layer

Every hardware entity supports a multi-tiered documentation system:
- **Generic Description**: Built-in explanations for base logic (e.g., how a MUX works).
- **Architectural Context**: User-defined explanations for a specific CPU design (e.g., why this specific register exists in the pipeline).

---

## 5. Directory Mapping

- `src/core/engine/`: Headless logic and buffer management.
- `src/editor/`: Konva-based schematic design components.
- `src/simulator/`: Data-driven runtime panels (Registers, Memory).
- `src/shared/manifests/`: Reusable logic component definitions (ALU, Adder, etc.).
- `src/shared/types/`: Unified layer types (Serialized, Hydrated, Runtime).
