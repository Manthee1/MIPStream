# Instruction Configuration Guide

This guide explains how to use the instruction configuration page to manage and configure instruction sets for different CPU models.

---

## Overview

Each instruction set is defined for a specific CPU model. To begin, select the desired CPU model from the available options. The instruction panel allows you to:

- **Search** for instructions (both custom and default).
- **Create** a new custom instruction.
- **Duplicate** an existing custom instruction.
- **Rename** or **Delete** custom instructions.

### Default vs. Custom Instructions
- **Default Instructions**: These are predefined and cannot be altered. You can only view their details.
- **Custom Instructions**: These can be fully configured, including renaming, modifying, or deleting.

---

## Configuration Section

Once an instruction is selected, the configuration section provides detailed information, including:

1. **CPU Diagram**: Displays how the instruction looks at each stage of the CPU pipeline.
2. **Pseudo Code**: Reactively updates to reflect the current configuration of the instruction.

> **Note**: Any and all changes are immediately applied without the need for a save button. This allows for quicker switching between instructions or modifications without unnecessary clicks.

### MIPS Instruction Types

MIPS instructions are categorized into three types:
- **R-Type**: Used for register-to-register operations.
- **I-Type**: Used for immediate values or memory access.
- **J-Type**: Used for jump instructions.

A good resourse for understanding MIPS instruction types is the [MIPS Instruction Formats](https://en.wikibooks.org/wiki/MIPS_Assembly/Instruction_Formats) on Wikibooks.

---

## Configurable Fields

### 1. **Opcode**
- **R-Type**: Always `0` (fixed by definition).
- **I-Type and J-Type**: Configurable to define the operation.
> Make sure to avoid duplicate opcodes for different instructions, as the control unit retrieves the instruction based on the opcode. And if there are duplicates, it will pick the first one it finds.

### 2. **Type**
Tells the assembler how to interpret the instruction. The options are already mentioned in the previous section.

### 3. **Funct Field** (R-Type Only)
Defines the specific operation the ALU will perform (e.g., addition, subtraction).

### 4. **Operands**
Operands specify the data or addresses used by the instruction:
- **Rs**: Source register (Read Reg 1 in the diagram).
- **Rd**: Destination register (R-Type only - Read Reg 2 in the diagram).
- **Rt**: Target register (Write Reg in the diagram).
- **imm**: Immediate value (I-Type only).
- **label**: Address label for jumps.
- **imm(Rs)**: Memory address offset (I-Type for load/store).



### 5. **Control Signals** (I-Type and J-Type Only)
Control signals determine the behavior of the CPU for the instruction. You can understand their function by observing their path in the CPU diagram.