import { InstructionR, InstructionI, InstructionJ } from "./instruction";


interface StageData {
    IR: InstructionR | InstructionI | InstructionJ; // The current instruction to decode 

    OPC: number; // The PC of the current instruction
    NPC: number; // Next PC that overwrties pc once an instrution reaches it's final stage

    A: number; // A param for ALU
    B: number; // B Param for ALU (usaually the destination register)
    I: number; // Imidiate value for ALU

    ALUOutput: number;

    LMD: number; // Load Memory Data

    cond: boolean; // Conditional flag

}


interface CPU {
    intRegisters: Array<number>; // Integer registers (32x 32-bit wide)
    FPRegisters: Array<number>;// Sinfle persision floating point registers (32x 32-bit wide) or double precision (16x 32-bit wide) IEEE754 
    PC: number; // The current instruction index
    stages: Array<StageData>; // The current stage data
}

interface Memory {
    data: Array<number>;
    instructions: Array<InstructionR | InstructionI | InstructionJ>;
}

enum ALUopcode {
    // Arithmetic
    PASSTHROUGH,
    ADD,
    SUB,
    MUL,
    DIV,
    INC,
    DEC,
    // Logic
    AND,
    OR,
    XOR,
    NOT,
    // Shift
    LSHIFT,
    RSHIFT,
    // Comparison
    EQ,
    NEQ,
    GT,
    LT,
    GTE,
    LTE,

}



export { ALUopcode };
export type { CPU, Memory, StageData };

