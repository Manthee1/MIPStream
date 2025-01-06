enum InstructionType {
    R,
    I,
    J,
    INVALID,
}
enum OperandType {
    UNUSED,
    REGISTER,
    IMMEDIATE,
    LABEL
}

enum OperandRole {
    DESTINATION,
    SOURCE,
    IMMEDIATE
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
    controlSignals: ControlSignals;
    funct?: number; // Only for R-Type instructions
}

interface RTypeInstructionConfig extends BaseInstructionConfig {
    opcode: 0x00;
    funct: number;

}
interface ITypeInstructionConfig extends BaseInstructionConfig {
}
interface JTypeInstructionConfig extends BaseInstructionConfig {
}
type InstructionConfig = ITypeInstructionConfig | RTypeInstructionConfig | JTypeInstructionConfig;