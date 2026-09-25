# Simulation Engine Specification

The Engine is a synchronous, cycle-accurate logic simulator optimized for execution speed and deterministic behavior.

## 1. Global State Management
All logical signal states are maintained in a central, contiguous memory buffer. Each unique electrical net in the architecture is assigned a specific offset in this buffer. This approach eliminates object allocation during the simulation loop and allows the engine to handle wide buses and high-frequency clocking with minimal overhead.

## 2. Compilation and Graph Resolution
Before execution, the engine compiles the user's architectural blueprint into a directed execution graph.
- **Topological Sorting**: Combinational components are ordered such that all dependencies are resolved in a single forward pass.
- **Dependency Validation**: The engine identifies and flags illegal unbuffered combinational loops.
- **Port Mapping**: String-based port identifiers are translated into direct memory offsets.

## 3. The Two-Phase Clock Cycle
The simulation follows a strict two-phase evaluation pattern per master clock cycle:
- **Phase 1 (Rising Edge)**: Sequential components sensitive to the rising edge update their internal states and push new values to the buffer.
- **Phase 2 (Combinational Propagation)**: The sorted list of combinational modules is evaluated to propagate signals through the logic gates until the system reaches a stable state for the current half-cycle.
- **Phase 3 (Falling Edge & Post-Propagation)**: The process repeats for falling-edge sensitive components, followed by a final combinational stabilization pass.

## 4. Host Integration
The engine is designed to be headless. It exposes a control API for stepping, running, and resetting. The user interface samples the engine's memory buffer at regular intervals to provide visual feedback, ensuring that high-speed simulations do not bottleneck on UI rendering.
