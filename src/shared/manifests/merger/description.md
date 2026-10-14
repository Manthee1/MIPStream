# Bit Merger
Merges multiple input fields into a single output bus, bit by bit — like wiring jumper cables between individual bit terminals. It is the Bit Splitter's mirror (a Logisim-style fork).

## Configuration
- **Output Bits**: width of the output bus (1-32).
- **Inputs**: named fields, each with its own width. Every input bit drives exactly one output bit (or nothing when unconnected). Mappings may reorder freely — swap byte lanes, gather scattered control bits into one control word.
- **Bit Wiring**: click an input terminal then an output terminal (or drag between them) to run a jumper; click a connected terminal to pull the jumper out.
- **Range presets**: type `31:16` (or a single bit like `7`) into a field's preset box to resize and contiguously map it in one step.

Inputs should target **non-overlapping** output bits — when two inputs drive the same output bit the panel raises a warning and the result resolves to a wired-OR. Unconnected input bits drive nothing; undriven output bits read 0.