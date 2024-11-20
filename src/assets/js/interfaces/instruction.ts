import { ALUopcode } from "./core";

enum InstructionType {
    R,
    I,
    J,
    INVALID,
}
enum OperandType {
    REGISTER,
    IMMEDIATE,
    MEMORY,
    OFFSET,
}


interface InstructionR {
    opcode: number; //Control/Opcode/Instruction
    rs1: number; //Source Register
    rs2: number; //Source Register
    rd: number; //Destination Register
}

interface InstructionI {
    opcode: number; //Control/Opcode/Instruction
    rs: number; //Source Register
    rd: number; //Destination Register
    imm: number; //Immediate Value
}

interface InstructionJ {
    opcode: number; //Control/Opcode/Instruction
    offset: number; //Immediate Value
}

enum MemOp {
    STORE,
    LOAD,
    NONE
}

interface InstructionDef {
    mnemonic: string;
    type: InstructionType;
    ALUopcode: ALUopcode;
    memOp?: MemOp;
    operands?: Array<OperandType>;
}

export { InstructionType, OperandType, MemOp };
export type { InstructionR, InstructionI, InstructionJ, InstructionDef };
