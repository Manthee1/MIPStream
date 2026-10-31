# Register File
32 general-purpose 32-bit registers with two combinational read ports and one write port.

- **$zero (r0)** is hardwired to 0 — writes are ignored.
- Reads (`rs`, `rt`) are combinational (asynchronous read ports); a write commits at the **rising clock edge** when **Write Enable** was asserted on the edge-sampled inputs — a value written at edge k is readable in the propagation pass of cycle k (real hardware register-file semantics).
- The panel shows all registers and allows editing values live ($zero is locked).
