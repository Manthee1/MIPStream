import { InstructionDef, InstructionType, MemOp, OperandType } from '../interfaces/instruction'
import { ALUopcode } from '../interfaces/core'

const INSTRUCTION_SET: Array<InstructionDef> = [
    {
        mnemonic: "NOP",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
    },
    {
        mnemonic: "ADD",
        type: InstructionType.R,
        ALUopcode: ALUopcode.ADD,
    },
    {
        mnemonic: "ADDI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
    },
    {
        mnemonic: "AND",
        type: InstructionType.R,
        ALUopcode: ALUopcode.AND,
    },
    {
        mnemonic: "ANDI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.AND,
    },
    {
        mnemonic: "SI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
        memOp: MemOp.STORE
    },
    {
        mnemonic: "SW",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        memOp: MemOp.STORE
    },
    {
        mnemonic: "LI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.PASSTHROUGH,
        memOp: MemOp.LOAD
    },
    {
        mnemonic: "LW",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        memOp: MemOp.LOAD
    },
    {
        mnemonic: "HALT",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
    }
]


export default INSTRUCTION_SET;