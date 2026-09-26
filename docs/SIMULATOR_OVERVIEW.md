# CPU Simulator Project Technical & Functional Overview

This document outlines the design, management, functionality, and execution lifecycle of the CPU Simulator project. It describes the structural relationship between projects and architectures, the configuration layers, the schematic editing environment, and the interactive execution environment.

---

## 1. Project & Architecture Ownership Model

### Core Concepts

* **Project Ownership:** A project acts as the primary container for a simulation environment. It holds the active architecture, state, and user data. Technically, a project owns its architecture instance directly.
* **Architecture vs. Project:** An architecture defines the hardware topology (modules, connections, register files, memory layouts, and pipeline behavior). A project encompasses the active architecture alongside project-level overrides, editor contents, and simulation state.
* **Templates:** Architectures can exist independently as templates. These can be pre-packaged defaults embedded within the application, custom user-built templates saved locally, or external files imported/exported by the user.

### Project Lifecycle & Creation Flow

When a user initializes a new project, they undergo a setup wizard with the following steps:

1. **Name Specification:** Set the project title.
2. **Template Selection:** Choose from multiple initialization baselines:
* **Blank / Scratch:** Completely empty schematic canvas.
* **Architecture Templates:** Pre-configured CPU topographies (e.g., basic MIPS, hazard-flushing pipeline MIPS, branch-prediction / J-type supported variants) containing hardware modules but no assembly code.
* **Project Templates:** Complete CPU architectures bundled with pre-written assembly source code in the editor.


3. **Target Entry Point:** Choose whether to launch directly into the **Architecture Editor View** (to modify hardware topology) or the **Simulator View** (to write code and run execution).
4. **Default Code Provision:** If an editor module is mapped in the selected architecture, the project initializes with a clean assembly template containing standard `.data` and `.text` segment declarations.

---

## 2. Configuration Hierarchies

Configuration follows a layered model similar to modern IDEs (e.g., VS Code), allowing global defaults to be overridden at the project level.

### Configuration Layers

* **Global Configuration:** System-wide application defaults (e.g., preferred register naming conventions such as standard `$t0`/`$s0` vs. raw `R1`/`R2` representation).
* **Project Configuration:** Project-specific settings that override global defaults without altering the base architecture template.
* **Architecture Configuration:** Configured within the architecture itself, governing how hardware behaves and how internal simulation views render data.

### Specific Architecture Configurations

#### Pipeline & Stage Instruction Visualizer

Governs the visual feedback strip rendered above the primary hardware diagram to display human-readable assembly instructions alongside their corresponding execution stages:

* **Stage Sequence & Ordering:** Reorderable list defining the physical execution sequence of stages (e.g., IF, ID, EX, MEM, WB).
* **Stage Naming:** Custom naming fields for each individual stage.
* **Instruction Display Toggle:** Global switch to enable or disable the top instruction visualization bar.
* **Start Stage Boundary:** Option specifying which stage begins tracking and decoding the human-readable assembly string (handling topologies where initial stages perform pre-fetch operations prior to instruction identity resolution).
* **Internal Tagging:** Internal simulator state tags stage registers dynamically to track which instruction is currently executing or scheduled to execute at each stage boundary.

#### Assembler & Editor-Memory Mapping

Maps assembly editor instances to target instruction memory modules:

* **Multi-Memory Routing:** Configures which code editor panel compiles through specific assemblers into designated Instruction Memory hardware components.
* **Mapping Options:** An editor can be mapped to a single instruction memory or broadcast assembly machine code across multiple instruction memories simultaneously.

---

## 3. Architecture Editor View (Schematic Canvas)

The Architecture Editor View provides a graphical environment for constructing and modifying hardware circuits.

### Structural Editing & Interaction

* **Module Library:** A left-hand sidebar containing draggable hardware components and functional modules (ALUs, Registers, Control Units, Multiplexers, Memory Blocks).
* **Toolbar & Shortcuts:** A contextual editing toolbar equipped with keyboard shortcuts for common actions (selection, deletion, grouping, rotation, routing).
* **Multi-Selection & Grouping:** Capability to select multiple components, drag them as a group, and re-arrange schematic layouts cleanly.

### Netlist & Wire Routing

* **Net Creation:** Dedicated wiring tool allowing freeform routing of interconnecting nets between module ports.
* **Implicit Junctions:** Tapping a wire onto an existing net automatically splits the line and inserts an explicitly serialized hardware junction.
* **Connection Constraints:** Hardware validation enforces signal direction rules:
* One output port can drive one or multiple input ports.
* Output-to-output connections are strictly prohibited and flagged as topological errors.



### Component-Level Configurations & Panels

* **Static & Dynamic Properties:** Individual hardware components expose parameters (e.g., bit-width, register counts, default memory values).
* **Component Panels:** Specialized UI overlays associated with complex components (e.g., Register Files, Data Memory, Instruction Memory):
* **Toggle Controls:** Architecture creators can enable or disable specific component panels from appearing in the final Simulator View.
* **Interactive Panel Features:** When active, these panels allow viewing and editing live memory cell values, changing variable representations, or reviewing register states.



---

## 4. Simulator View (Execution Environment)

The Simulator View is the operational workspace used to write code, analyze signal paths, and step through program execution.

### Dual-Mode Component Rendering

All diagram components support two distinct operational modes:

* **Editor Mode:** Focuses on port placement, wire routing, component configuration, and canvas positioning.
* **Viewer Mode:** Active during simulation. Disables structural changes and renders live signal states, displaying data bits passing through nets, active control lines, and hoverable tooltip inspection for runtime values.

### Integrated Code Editor

* **Monaco Editor Integration:** Embedded code editor supporting syntax highlighting and real-time syntax error checking.
* **Dynamic Assembly Configuration:** Adaptable to match the custom instruction set definitions and memory mappings set in the architecture configuration.

### Execution Control State Machine

Program execution is managed via a strict state control interface:

| Control Action      | Required Prerequisite State  | Resulting State             | Description                                                                                        |
| ------------------- | ---------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------- |
| **Load Program**    | Code compiled without errors | Paused (at Instruction 0)   | Assembles code, loads machine bits into mapped Instruction Memory, and primes execution at PC = 0. |
| **Start Program**   | Unloaded or Stopped          | Running                     | Assembles/loads code and immediately begins continuous clock cycle execution.                      |
| **Restart Program** | Program must be Loaded       | Paused (at Instruction 0)   | Resets Program Counter, registers, and memory flags to initial loaded state.                       |
| **Stop Program**    | Program must be Running      | Stopped                     | Terminates simulation execution cycle completely.                                                  |
| **Pause Program**   | Program must be Running      | Paused                      | Temporarily halts clock cycle processing at the current instruction state.                         |
| **Next Step**       | Program must be Paused       | Paused (advanced by 1 step) | Executes a single clock cycle / pipeline step and returns to a paused state.                       |

*Note: The simulator operates on a forward-only execution model; step-back/backtracking capabilities are not supported.*