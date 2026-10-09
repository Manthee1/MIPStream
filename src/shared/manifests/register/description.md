# Stage Register
A single D-type edge-triggered register. On each rising clock edge the output Q adopts the input D.

- The stored value is the register's output net — held by the simulation engine between edges.
- Use stage registers to cut combinational paths at pipeline stage boundaries.
