# Architecture Simulator: Advanced Core Engine & Canvas IDE Specification

## 1. Project System Architecture & Separation of Concerns

To guarantee execution speed while preserving total visual editability, the simulator splits into two distinct execution lifecycles: a pure-functional, performance-optimized processing backend and a schema-driven, reactive presentation frontend.

```
       ┌────────────────────────────────────────────────────────┐
       │                 FRONTEND (Vue 3 / TypeScript)          │
       │  • View Layer Canvas (Vue Flow)                        │
       │  • Structural Schema Definition (IndexedDB)            │
       │  • Syntax Highlighting & Token Processing (Monaco)     │
       └───────────────────────────┬────────────────────────────┘
                                   │
                     Wasm Payload  │  Live Cycle Execution Buffer
                     Initialization│  (Flat State Arrays)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                BACKEND (WebAssembly / Pure C)          │
       │  • Flat Array Memory Buffers (`uint32_t`)              │
       │  • Pointerless Direct Dependency Evaluation Graph      │
       │  • Microarchitectural Cycle & Latch Controllers        │
       └────────────────────────────────────────────────────────┘

```

### 1.1 The Backend (C Engine via WebAssembly)

* **Design Philosophy:** The execution layer is completely blind to visual semantics, component positions, aesthetic properties, and data types. It evaluates pure binary bitstreams.
* **Memory Architecture:** Operating out of a shared WebAssembly memory buffer, the engine passes state changes down standard flat 32-bit unsigned integer arrays (`uint32_t`). It manages no dynamic pointers during clock cycles, avoiding memory fragmentation and serialization overhead.

### 1.2 The Frontend (Vue 3 / TypeScript / IndexedDB)

* **Design Philosophy:** The frontend serves as the absolute source of truth for structural definitions. The complete system design, component attributes, interconnection arrays, and custom Instruction Set Architecture (ISA) records live in client-side persistence (`IndexedDB`).
* **Runtime Layer:** When a simulation starts, the frontend serializes the database layout into a compact binary layout payload, initializes the Wasm execution instance, and reads raw bit buffers out of memory on every clock edge to dynamically derive representation, layout, and visual state.

---

## 2. Shared Memory State Buffer Protocol

Execution tracking between the WebAssembly runtime and the Vue Flow canvas relies on a single, continuous shared byte array buffer. The layout of this block is defined explicitly upon execution initialization.

### 2.1 Buffer Composition Checklist

#### A. Wire Values Array (Combinational Interconnect State)

A sequential layout of 32-bit unsigned integers where each index maps to a unique connection wire UUID.

* Every wire state tracks its data inside a `uint32_t`.
* **Component-Level Evaluation:** Arbitrary bit widths (e.g., a 5-bit register pointer or a 1-bit control unit line) are enforced uniformly using bitwise masking operations at the component pin level (e.g., `value & 0x1F`), keeping global buffer structures flat.

#### B. Pipeline Stage Interface State

Rather than transmitting strings or complex JSON representations over the Wasm boundary, the engine writes a fixed-size structural metadata payload for each logical pipeline latch register:

1. **Raw Bitstream:** The raw 32-bit binary representation of the instruction currently occupying the stage (e.g., `0x00AF8020`).
2. **Current PC:** The absolute Program Counter memory address attached to that specific instruction.
3. **Execution Flags:** Boolean state triggers verifying if the stage is currently experiencing a **Stall** condition or a **Flush** condition.

#### C. State Storage Elements

* **Register File:** A fixed array block of 32 elements representing tracking fields (`$zero` through `$ra`).
* **Data Memory Modification Queue:** To prevent copying the entire RAM boundary every cycle, the engine manages a small circular mutation log highlighting the **last 10 changed memory addresses and values**, allowing the UI to highlight memory cell overrides dynamically.
* **Internal Performance Metrics:** Shared allocation blocks tracking specific hardware telemetry, such as dynamic branch prediction counters or structural cache miss boundaries.

---

## 3. Parametric Component & Variant Design Schema

To maintain canvas layout stability without limiting microarchitectural design freedom, components on the editor grid balance structural variation using a hybrid layout inheritance strategy.

### 3.1 Figma-Style Component Families (Structural Variants)

Components that alter physical canvas geometry or base layout logic are grouped into fixed parameter variants inside the editor palette.

#### Multiplexers (MUX)

Instead of forcing a single node template to handle infinite configurations, the editor delivers distinct variants (`Mux2to1`, `Mux4to1`, `Mux8to1`).

* **Bit Width Consistency:** Selecting a 4-to-1 MUX locks the selection port requirements to exactly 2 bits.
* **Canvas Layout Predictability:** Restricting these variations to fixed component models prevents dynamic nodes from resizing unexpectedly, which can disrupt established wire tracks or alter connecting coordinate handles.

### 3.2 Dynamic Parametric Nodes (Flexible Handle Generation)

Components that share an outer geometry but manage custom port assignments utilize schema-driven dynamic handle arrays.

#### The Control Unit (CU)

The node body uses a fixed-dimension visual layout, but its physical connection ports on the right boundary are compiled dynamically by iterating over an active signals array.

```
┌────────────────────────┐
│      CONTROL UNIT      │
│                        ├─ (1-bit Handle) ──► RegWrite
│ [Input Width: 6 Bits]  ├─ (1-bit Handle) ──► MemRead
│                        ├─ (3-bit Handle) ──► ALUOp
└────────────────────────┘

```

* **Signal Appending:** If a designer adds a new experimental control signal to their architecture (e.g., `IsVectorOp`), a new physical source handle pin is instantiated on the canvas instantly.
* **Bit Width Adjustments:** Modifying an input parameter field from a standard 6-bit opcode to an 8-bit custom instruction variant dynamically remaps the input handle's internal bitmask without resetting the node template.

---

## 4. Visual Data Type Display Hierarchy (The 5-Tier Chain)

To prevent cognitive overload—such as a student confusing a signed Two's Complement value like `-3` with its raw hardware representation of `4,294,967,293`—the presentation framework applies an evaluation hierarchy to resolve how wires and registers display data.

### 4.1 Naming and Evaluation Structure

```
[ Tier 5: Runtime User Override ] ───► Interactive Right-Click (Forces explicit state)
               │
               ▼ (If set to Inherit)
[ Tier 4: Instance Custom Override ] ──► Node Specific Property (e.g., "This MUX tracks an address")
               │
               ▼ (If set to Inherit)
[ Tier 3: Architecture-Wide Override ] ► Project Schema Profile (e.g., "All registers default to Hex")
               │
               ▼ (If set to Inherit)
[ Tier 2: Built-In Component Default ] ► Hardcoded Template Spec (e.g., SignExtender = Signed Dec)
               │
               ▼ (If set to Inherit)
[ Tier 1: Global Simulator Bar ] ──────► Master Application View Toggle (Universal System Fallback)

```

### 4.2 UI Representation Vocabulary Rules

Dropdowns and inspectors must eliminate ambiguity by appending evaluated contextual values in parentheses directly inside the selection options:

1. **Auto-Detect (Instruction Dependent):** The component tracks the active pipeline instruction. If an unsigned instruction (`ADDU`) sits in the execution latch, data shows as unsigned decimal. If it is signed (`ADD`), it switches to signed Two's Complement.
2. **Use Project Default (`<Current Mode>`):** Explicitly states the global fallback strategy inherited from the master view panel (e.g., *Use Project Default (Hexadecimal)*).
3. **Use Component Type Default (`<Current Mode>`):** Ignores outer project parameters to follow component-specific behaviors (e.g., *Use Component Type Default (Signed Decimal)* for a Sign Extender node).
4. **Force `<Mode>` (e.g., Force Binary):** Explicitly alerts the designer that this specific node has broken the inheritance chain, locking its visual port states regardless of ongoing pipeline behaviors.

### 4.3 Validation and Canvas Linting

If an adjustment down the 5-tier inheritance chain creates an invalid bit-width pairing (e.g., a component variant changes output size from 16 bits to 32 bits while its destination node still reads a 16-bit register address), **the editor will not disrupt the layout by breaking wires**.

* **The Warning State:** The canvas triggers a validation warning flag. The mismatched connection line and handle are highlighted in a distinct amber/yellow outline (`.wire-warning`).
* **Contextual Tooltip Reporting:** Hovering over the error node invokes an accurate feedback modal: *“Bit-width mismatch: This port outputs 32 bits, but the destination port is configured to process 16 bits.”*

### 4.4 Circular Dependency Errors

If a designer creates a circular dependency (e.g., a feedback loop where the output of a register feeds back into its own input without an intervening pipeline stage or any other clocked component), the system will:
* **Detect the Cycle:** The frontned will analyze the directed graph of connections and identify the cycle.
* **Highlight the Loop:** All wires and nodes involved in the cycle will be highlighted in red.
* **Block Simulation:** The simulation engine will refuse to run until the cycle is resolved, preventing undefined behavior.
* **Provide Resolution Suggestions:** The tooltip will suggest possible fixes, such as adding a pipeline stage or breaking the loop.

---

## 5. Processor Description Language (PDL) Instruction Configuration Specification

To provide absolute architectural freedom, the framework avoids hardcoding rigid instruction types (R-Type, I-Type, J-Type). Instead, the system treats an Instruction Set Architecture (ISA) as a customizable layout composed of modular **token fields** and **control line truth tables**.

### 5.1 Token/Field-Based Machine Layout Specification

Every instruction format is mapped structurally as an array of discrete bitfields whose lengths must sum up precisely to the target width of the machine architecture (e.g., 32 bits).

```json
{
  "format_name": "Custom-Experimental-R-Type",
  "total_bits": 32,
  "fields": [
    { "name": "opcode", "bits": 8, "type": "constant" },
    { "name": "rs",     "bits": 5, "type": "register" },
    { "name": "rt",     "bits": 5, "type": "register" },
    { "name": "rd",     "bits": 5, "type": "register" },
    { "name": "funct",  "bits": 9, "type": "constant" }
  ],
}

Concrete instruction mnemonics (e.g., `ADD`, `SUB`, `AND`) are then mapped to specific field values in a separate instruction definition table, allowing the frontend to generate accurate syntax highlighting, auto-completion, and real-time validation in the Monaco editor.

```json
{
  "mnemonic": "ADD",
  "format": "Custom-Experimental-R-Type",
  "field_values": {
    "opcode": 0x00,
    "funct": 0x20
  },
  "operands": ["rs", "rt", "rd"]
}

```

### 5.2 Assembly Syntax Token Integration with Monaco Editor

The frontend takes this layout definition schema and automatically builds syntax profiles for the text editor, keeping compilation tracking efficient and modular:

* **Real-Time Linting Syntax Generation:** The system transforms the structural `syntax_template` definition straight into a runtime Regular Expression validation array. If a programmer drops an immediate parameter into a instruction structure that expects three register variables, Monaco flags the syntax mismatch instantly with a red squiggle error line.
* **Contextual Auto-Complete Cache:** When a designer instantiates a custom instruction mnemonic (e.g., `MY_VEC_ADD`), it is instantly parsed by the editor's Language Server. It populates auto-complete panels and renders structural parameter summaries whenever a user hovers over the token string.

### 5.3 Decoupling Microarchitectural Control Signals

To resolve the paradox of configuring complex execution paths without restricting layout styles, instructions map directly to raw hardware lines instead of hardcoded operations.

#### A. External Truth Tables

Instead of a hidden configuration wizard, instructions write direct hexadecimal value blocks to their mapped bitfields. If an architect designs a variant with an instruction format that routes an `opcode` of `0x01` out to an unconventional control block, they type `0x01` directly into that constant field row.

#### B. Component-Exposed Operation Enums (The ALU Solution)

To preserve intuitive drop-down configuration menus for complex units (like the ALU) on an architecture where underlying binary mappings can be reversed or scrambled:

1. **Component-Level Mapping:** The creator registers their custom operation mappings directly inside the canvas **ALU Component Property Inspector** (e.g., declaring that binary sequence `0x0C` triggers `SUBTRAC_MODE`, while `0x02` triggers `ADD_MODE`).
2. **Dynamic Inspector Generation:** When a user configures an instruction to trigger an ALU task, the workspace panel queries the active canvas arrangement, checks the ALU node's translation matrix, and dynamically updates its dropdown text labels using the creator's precise structural choices.

```
[ALU Node Config Canvas] ──► Sets 0x0C = "SUB" 
                                    │
                                    ▼
[Global Instruction Slot Config] ──► Reads ALU properties ──► Populates Dropdown with "SUB" (Writes 0x0C to field)

```

---

## 6. Schema-Driven Dynamic Layout Ingestion (The Docking UI)

To handle distinct microarchitectural features (such as tracking branch predictor tables or omitting data memory components entirely), the application viewport utilizes an inheritance structure integrated with the docking management layer.

### 6.1 Component-to-View Pairing Protocol

Rather than rendering layout windows statically, the IDE dashboard scans the canvas topology on project load to identify active components that export specialized diagnostic panels.

```
┌────────────────────────────────────────────────────────┐
│               DOCKVIEW CANVAS WORKSPACE                │
│                                                        │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │ Vue Flow Network Diagram │  │ Monaco Code Editor │  │
│  │                          │  │                    │  │
│  └──────────────────────────┘  └────────────────────┘  │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │ Register File Table View │  │ Branch History     │  │
│  │ (Registered by RegFile)  │  │ (Registered by BP) │  │
│  └──────────────────────────┘  └────────────────────┘  │
└────────────────────────────────────────────────────────┘

```

* **Dynamic Panel Ingestion:** A component type like `RegisterFile` explicitly binds to a matching frontend view template (e.g., a multi-column table element grid). If that hardware node exists on the canvas grid, the workspace dynamically mounts a matching panel inside the active `dockview` interface.
* **Eliminating Layout Redundancy:** If an engineer designs a streamlined arithmetic processor that completely lacks data memory, the `DataMemory` block is left off the connection canvas. The IDE reads this omission and automatically removes the data memory viewer panel from the application menus.
* **Decoupled Metric Tracking UI:** Complex runtime structures (e.g., tracking correct vs. incorrect steps inside a branch predictor) are managed via an exported `metrics` tracking configuration schema. The main dashboard loop automatically catches these counter rows and initializes modular graphing widgets inside a general performance monitoring pane without hardcoding custom panel tracking logic.

---

## 7. Long-Term Architecture Refactoring Roadmap

To ensure development velocity remains steady during development, layout engine optimization tasks are split into clear operational implementation cycles.

### 7.1 Layout Engine Transition Strategy (Polishing Phase Priority)

While the current configuration under `dockview` (Version 2.x) provides the baseline core panels necessary for prototype simulation, long-term layout maintenance and configuration state caching present known lifecycle limits.

#### The Golden Layout Migration Path

Once the underlying WebAssembly binary execution paths and the token-based instruction compiler engines are stable, developers will execute a planned UI refactoring migration to move the layout management layer over to **Golden Layout**.

* **Why this transition is planned:** Golden Layout provides a native, highly resilient layout preservation engine that reduces custom state code. It tracks entire multi-window layout positions and container groupings inside a clean, standard JSON payload that saves straight to client storage (`localStorage` or IndexedDB) with absolute reliability across window reloads.
* **Implementation Protocol:** Because Golden Layout is built as a pure, framework-agnostic TypeScript module, its inclusion will utilize explicit component mount targets using Vue 3 `teleport` configurations, isolating window sizing refactoring passes safely away from the canvas rendering engine layers.