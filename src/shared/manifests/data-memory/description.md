# Data Memory
Word-addressed read/write memory for program data.

- Input is a **byte address**; when **MemRead** is asserted the addressed word is driven onto the read output.
- A write commits when **MemWrite** is asserted during the engine's propagation pass (once per clock cycle).
- The panel shows memory words and allows editing them live.
