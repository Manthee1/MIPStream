# Bit Merger
Merges multiple input fields into a single output bus, bit by bit — like wiring jumper cables between individual bit terminals. It is the Bit Splitter's mirror (a Logisim-style fork).

## Configuration
- **Output Bits**: width of the output bus (1-32).
- **Inputs**: named fields, each with its own width. Every input bit drives exactly one output bit (or nothing when unconnected). Mappings may reorder freely — swap byte lanes, gather scattered control bits into one control word.
- **Bit Wiring**: click an input terminal then an output terminal (or drag between them) to run a jumper; click a connected terminal to pull the jumper out.
- **Range presets**: type `31:16` (or a single bit like `7`) into a field's preset box to resize and contiguously map it in one step.

Inputs must target **non-overlapping** output bits — every output bit accepts exactly one driver, and the configuration editor refuses to commit a mapping that drives the same output bit from two inputs. Unconnected input bits drive nothing; undriven output bits read 0.