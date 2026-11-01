# Stage Register
An edge-triggered pipeline register. On each rising clock edge every output Q latches its input D.

- The stored value is the register's output net — held by the simulation engine between edges.
- **Pins** are configurable (Inspector ▸ Pins): each pin is an input/output D/Q pair with its own width. The first pin is the main D/Q pair (ports `d`/`q`) and cannot be removed; extra pins derive `d_<id>`/`q_<id>` port ids from their id.
- **Reset pin** (optional, Inspector ▸ Reset pin): synchronous and active-high — while `rst` is 1 at a rising edge, every pin clears to 0 instead of latching. Left unconnected it reads 0 and stays inert.
- Use stage registers to cut combinational paths at pipeline stage boundaries.
