# Bit Splitter
Splits an input bus into separate fields, each exposed as its own output pin.

## Configuration
- **Input Bits**: width of the input bus (1–32).
- **Field Widths**: comma-separated widths, **MSB-first** — e.g. `6,5,5,5,5,6` carves a 32-bit word into 6-bit, 5-bit, 5-bit, 5-bit, 5-bit, and 6-bit fields from the top down. Each output pin is annotated with its bit range `[hi:lo]`.
- If the widths sum to less than the input width, the remaining low bits are not output.

The splitter is fully generic — it taps arbitrary fields out of any bus, not any particular instruction encoding.
