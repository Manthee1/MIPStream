# Bit Splitter
Taps arbitrary, individually-mapped bits out of an input bus and exposes each field as its own output pin — like wiring jumper cables between individual bit terminals.

## Configuration
- **Input Bits**: width of the input bus (1–32).
- **Outputs**: named fields, each with its own width. Every output bit maps to exactly one input bit (constant 0 when unconnected). Mappings may **overlap** and **reorder** freely — one splitter can emit `10-12`, `8-10`, `0-16`, and `0-31` at the same time.
- **Bit Wiring**: click an input terminal then an output terminal (or drag between them) to run a jumper; click a connected terminal to pull the jumper out.
- **Range presets**: type `31:16` (or a single bit like `7`) into a field's preset box to resize and contiguously map it in one step.

Unmapped output bits read 0. The symbol is a compact fan: the input trunk feeds a slim spine and individual conductors branch out to each output, annotated with the field's mapping.
