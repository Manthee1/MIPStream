# ALU Control
Translates the main control unit's 2-bit ALUOp plus the instruction's 6-bit funct field into the 4-bit ALU operation.

## Decode
| ALUOp | Meaning | Operation |
|-------|---------|-----------|
| `00` | load/store | Add |
| `01` | branch (beq) | Subtract |
| `10` | R-type | by funct: `0x20` add, `0x22` sub, `0x24` and, `0x25` or, `0x2a` slt |
