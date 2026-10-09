# Register File
32 general-purpose 32-bit registers with two combinational read ports and one write port.

- **$zero (r0)** is hardwired to 0 — writes are ignored.
- Reads (`rs`, `rt`) are combinational; a write commits when **Write Enable** is asserted during the engine's propagation pass (once per clock cycle).
- The panel shows all registers and allows editing values live ($zero is locked).
