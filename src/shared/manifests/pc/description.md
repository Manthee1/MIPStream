# Program Counter
The program counter is a stage register with a **fixed 32-bit width and no user configuration**, so the simulator can identify it by type (`std.pc`) without guessing.

- Updates on every rising clock edge: `PC <- D` (the next-address mux output).
- The assembler loads program words into instruction memory starting at address `0x00000000`; the PC indexes them by byte address.
