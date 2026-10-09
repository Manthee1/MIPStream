# Main Control Unit
Decodes the instruction opcode into the datapath's control signals.

| Signal | R-type | lw | sw | beq |
|---|---|---|---|---|
| RegDst | 1 | 0 | x | x |
| ALUSrc | 0 | 1 | 1 | 0 |
| MemtoReg | 0 | 0 | x | x |
| RegWrite | 1 | 1 | 0 | 0 |
| MemRead | 0 | 1 | 0 | 0 |
| MemWrite | 0 | 0 | 1 | 0 |
| Branch | 0 | 0 | 0 | 1 |
| ALUOp | `10` | `00` | `00` | `01` |

Opcodes: R-type `0x00`, lw `0x23`, sw `0x2b`, beq `0x04`. Unknown opcodes deactivate all signals.
