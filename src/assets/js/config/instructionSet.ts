import { InstructionDef, InstructionType, MemOp, OperandType } from '../interfaces/instruction'
import { ALUopcode } from '../interfaces/core'

const INSTRUCTION_SET: Array<InstructionDef> = [
    {
        mnemonic: "NOP",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "No operation - does nothing for one cycle"
    },
    {
        mnemonic: "ADD",
        type: InstructionType.R,
        ALUopcode: ALUopcode.ADD,
        description: "Adds two registers and stores the result in `Rd`"
    },
    {
        mnemonic: "ADDI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        description: "Adds Rs and an immediate value and stores the result in `Rd`"
    },
    {
        mnemonic: "AND",
        type: InstructionType.R,
        ALUopcode: ALUopcode.AND,
        description: "Performs a bitwise AND on two registers and stores the result in `Rd`"
    },
    {
        mnemonic: "ANDI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.AND,
        description: "Performs a bitwise AND on Rs and an immediate value and stores the result in `Rd`"
    },
    {
        mnemonic: "SI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
        memOp: MemOp.STORE,
        description: "Stores an immediate value into memory"
    },
    {
        mnemonic: "SW",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        memOp: MemOp.STORE,
        description: "Stores a word from a register into memory"
    },
    {
        mnemonic: "LI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
        memOp: MemOp.LOAD,
        description: "Loads an immediate value into `Rd`"
    },
    {
        mnemonic: "LW",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        memOp: MemOp.LOAD,
        description: "Loads a word from memory into `Rd`"
    },
    {
        mnemonic: "HALT",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "Halts the processor"
    }
]


export default INSTRUCTION_SET;