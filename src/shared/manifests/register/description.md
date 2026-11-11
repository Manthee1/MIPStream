# Stage Register
An edge-triggered pipeline register. On each rising clock edge every output Q latches its input D.

- The stored value is the register's output net — held by the simulation engine between edges.
- **Pins** are configurable (Inspector ▸ Pins): each pin is an input/output D/Q pair with its own width, and the list is freely **reorderable** — reordering only re-stacks the drawn rows, never rewires a net. The pin id'd `main` derives the classic `d`/`q` ports; every other pin derives `d_<id>`/`q_<id>` from its stable id. Any pin can be deleted — an empty register is valid and simply latches nothing. A newly added register ships one placeholder D/Q pair.
- **Reset pin** (optional, Inspector ▸ Reset pin): synchronous and active-high — while `rst` is 1 at a rising edge, every pin clears to 0 instead of latching. Left unconnected it reads 0 and stays inert.
- Use stage registers to cut combinational paths at pipeline stage boundaries.
