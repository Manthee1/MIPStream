# Data Memory
Word-addressed read/write memory for program data.

- Input is a **byte address**; when **MemRead** is asserted the addressed word is driven onto the read output.
- A write commits at the **rising clock edge** when **MemWrite** was asserted on the edge-sampled inputs; the addressed word is driven onto the read output whenever **MemRead** is asserted (asynchronous read, synchronous write — real hardware memory semantics).
- The panel shows memory words and allows editing them live.
