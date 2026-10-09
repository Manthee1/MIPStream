# Instruction Memory
Word-addressed read-only memory holding the program machine code.

- Input is a **byte address**; the addressed word (`addr >> 2`) is driven combinationally onto the instruction output.
- Contents are written by the assembler mapping and can be inspected/edited in the simulator panel.
