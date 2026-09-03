# Architecture Simulator: Advanced Core Engine & Canvas IDE Specification

## 1. Project System Architecture & Separation of Concerns

To guarantee high execution throughput while preserving complete visual editability, the simulator splits into two distinct execution lifecycles: a pure, headless TypeScript simulation engine operating directly over flat memory structures, and a schema-driven, reactive presentation layer built with Vue 3 and Vue Flow.

```
       ┌────────────────────────────────────────────────────────┐
       │             PRESENTATION LAYER (Vue 3 / Vue Flow)       │
       │  • Interactive Visual Canvas (Vue Flow)                │
       │  • Structural Layout & Persistence (IndexedDB)         │
       │  • Text Editing, Syntax Highlighting & Tokenizing (Monaco)│
       └───────────────────────────┬────────────────────────────┘
                                   │
                      Canvas Schema│  Batched Signal Updates /
                       Instantiation│  UI Flush (Shared Memory)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             HEADLESS ENGINE LAYER (TypeScript)         │
       │  • Flat Typed State Arrays (`Uint32Array`)             │
       │  • Direct Topological Graph Evaluation Loop            │
       │  • 2-Phase Clock Step & Latch Controllers             │
       └────────────────────────────────────────────────────────┘

```

### 1.1 The Engine Layer (Pure TypeScript Core)

* **Design Philosophy:** The execution layer is headless and operates independently from visual semantics, component positions, aesthetic properties, and UI state. It processes raw numeric data through a direct graph representation.
* **Memory Architecture:** Operating on pre-allocated, flat TypedArrays (e.g., `Uint32Array`), the engine passes signal states without allocating short-lived objects during execution loops. This minimizes Garbage Collection (GC) pauses and allows the engine to evaluate tens of thousands of instruction cycles per second entirely within the JavaScript runtime.

### 1.2 The Presentation Layer (Vue 3 / TypeScript / IndexedDB)

* **Design Philosophy:** The frontend serves as the source of truth for visual layout and structural definitions. System layouts, node positions, port attributes, wire routing points, and custom Instruction Set Architecture (ISA) records reside in client-side storage (`IndexedDB`).
* **Runtime Sync Layer:** When simulation runs, the presentation layer instantiates the engine graph directly from the active structural schema. On clock ticks, the engine updates its internal state arrays, and the UI periodically samples those arrays to refresh pin labels, high-low wire states, and visual component diagnostic views at standard frame rates (e.g., 60 FPS).

---

## 2. Shared In-Memory State Buffer Protocol

To decouple engine performance from Vue 3 reactivity overhead, the execution state uses a central memory context composed of continuous flat `Uint32Array` buffers. The presentation layer selectively reads from these arrays to update the UI without driving individual cycle evaluations through reactive state wrappers.

### 2.1 Buffer Composition Checklist

#### A. Wire Values Array (Combinational Interconnect State)

A contiguous `Uint32Array` where each index corresponds directly to a unique internal wire handle ID.

* Every wire state tracks its data as a raw 32-bit integer.
* **Component-Level Evaluation:** Arbitrary bit widths (e.g., a 5-bit register pointer or a 1-bit control line) are enforced uniformly using bitwise masking operations within the component logic (e.g., `value & 0x1F`), keeping global buffer structures flat.

#### B. Pipeline Stage Interface State

For each logical pipeline latch register, the engine updates a fixed-size slot within a flat typed state block:

1. **Raw Bitstream:** The raw 32-bit binary representation of the instruction currently occupying the stage (e.g., `0x00AF8020`).
2. **Current PC:** The absolute Program Counter memory address attached to that specific instruction.
3. **Execution Flags:** Bitmasks tracking flags such as **Stall** or **Flush** conditions for that stage.

#### C. State Storage Elements

* **Register File Buffer:** A contiguous `Uint32Array` of fixed size (e.g., 32 elements for standard general-purpose registers).
* **Data Memory Modification Queue:** To avoid scanning or copying large RAM blocks during UI sync passes, the engine maintains a small ring buffer tracking recent memory writes (address and mutated value pairs), allowing the UI to highlight changed memory cells dynamically.
* **Internal Performance Metrics:** Continuous counters tracking hardware telemetry, such as branch prediction attempts, hits, and structural pipeline stalls.

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

### 4.4 Circular Dependency Validation

If a designer creates an unbuffered circular path (e.g., a pure combinational feedback loop where an output feeds back into its own input path without passing through a clocked sequential component like a register):

* **Cycle Detection:** The engine performs a Depth-First Search (DFS) topological sort over combinational nodes during graph compilation.
* **Highlight Loop:** All wires and nodes participating in the unstable combinational loop are visually highlighted on the Vue Flow canvas in red.
* **Block Execution:** The engine halts clock execution until a clocked buffer (e.g., pipeline register or latch) breaks the combinational loop.
* **Resolution Guidance:** Tooltips display clear actionable suggestions (e.g., *“Unbuffered combinational cycle detected. Insert a latch or register to split the path across clock boundaries.”*).

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
  ]
}

```

Concrete instruction mnemonics (e.g., `ADD`, `SUB`, `AND`) map to specific field values in a separate instruction definition table, allowing the presentation layer to generate accurate syntax highlighting, auto-completion, and real-time validation in the Monaco editor.

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

The frontend takes this layout definition schema and automatically builds syntax profiles for the text editor:

* **Real-Time Linting Syntax Generation:** The system transforms the structural definition directly into Regular Expression rules. If a programmer drops an immediate value into an instruction structure that expects three register variables, Monaco flags the mismatch with an error squiggle.
* **Contextual Auto-Complete:** Custom instruction mnemonics (e.g., `MY_VEC_ADD`) are dynamically ingested into the editor's Language Server configuration, providing auto-completion and operand documentation on hover.

### 5.3 Decoupling Microarchitectural Control Signals

To resolve the paradox of configuring complex execution paths without restricting layout styles, instructions map directly to raw hardware lines instead of hardcoded operations.

#### A. External Truth Tables

Instructions write direct hexadecimal or integer values to their mapped bitfields. If an architect designs a variant with an instruction format that routes an `opcode` of `0x01` out to a control block, they set `0x01` directly in that constant field row.

#### B. Component-Exposed Operation Enums (The ALU Solution)

To preserve intuitive dropdown configuration menus for complex units (like the ALU) on an architecture where underlying binary mappings can vary:

1. **Component-Level Mapping:** The creator registers custom operation mappings directly inside the canvas **ALU Component Property Inspector** (e.g., declaring that binary sequence `0x0C` triggers `SUBTRACT_MODE`, while `0x02` triggers `ADD_MODE`).
2. **Dynamic Inspector Generation:** When configuring an instruction to trigger an ALU operation, the workspace panel queries the active ALU node configuration, reads its translation matrix, and populates dropdown labels using those precise choices.

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

* **Dynamic Panel Ingestion:** A component type like `RegisterFile` explicitly binds to a matching frontend view template (e.g., a tabular grid). If that hardware node exists on the canvas, the workspace dynamically mounts the corresponding panel inside the active `dockview` interface.
* **Eliminating Layout Redundancy:** If an engineer designs an arithmetic-only processor that lacks a data memory module, the `DataMemory` component is omitted from the canvas. The IDE detects this omission and automatically hides the data memory inspector panel.
* **Decoupled Metric Tracking UI:** Complex runtime metrics (e.g., branch predictor hit/miss ratios) are exported through a telemetry configuration schema. The main dashboard loop consumes these counters and renders modular diagnostic widgets in a performance monitoring panel without requiring dedicated hardcoded layouts.

---

## 7. Long-Term Architecture Refactoring Roadmap

To ensure steady progress during development, layout engine tasks are divided into clear operational phases.

### 7.1 Layout Engine Transition Strategy (Polishing Phase Priority)

While the baseline workspace uses `dockview` (Version 2.x) to manage UI panels, long-term state preservation across complex user sessions remains a key focus area.

#### The Golden Layout Migration Path

Once the core TypeScript execution loop and instruction field compilers are fully stabilized, a planned UI refactoring pass will evaluate migrating the layout management layer over to **Golden Layout**.

* **Motivation:** Golden Layout offers robust, framework-agnostic layout preservation features that serialize multi-panel workspace arrangements to clean JSON structures stored in client-side storage (`localStorage` or IndexedDB).
* **Implementation Strategy:** Because Golden Layout operates as a framework-agnostic module, integration will leverage Vue 3 `teleport` targets to cleanly isolate panel mounting logic from the underlying Vue Flow graph rendering pipeline.