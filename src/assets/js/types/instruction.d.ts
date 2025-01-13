
interface OperandConfig {
    type: OperandType;
    role: OperandRole;
}

interface InstructionR {
    opcode: number; //Control/Opcode/Instruction
    rs1: number; //Source Register
    rs2: number; //Source Register
    rd: number; //Destination Register
    shamnt: number; //Shift Amount
    funct: number; //Function
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

interface BaseInstructionConfig {
    opcode: number;
    mnemonic: string;
    type: InstructionType;
    description?: string;
    controlSignals: { [name: string]: number };
    funct?: number; // Only for R-Type instructions
    operands?: Array<OperandType>;
}

interface RTypeInstructionConfig extends BaseInstructionConfig {
    funct: number;
}
interface ITypeInstructionConfig extends BaseInstructionConfig {
}
interface JTypeInstructionConfig extends BaseInstructionConfig {
}
declare type InstructionConfig = ITypeInstructionConfig | RTypeInstructionConfig | JTypeInstructionConfig;