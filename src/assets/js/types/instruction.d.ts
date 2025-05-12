
type OperandType = 'REG_SOURCE' | 'REG_TARGET' | 'REG_DESTINATION' | 'IMMEDIATE' | 'MEM_ADDRESS' | 'SHAMT' | 'LABEL' | 'INVALID' | 'NONE';

type InstructionType = 'R' | 'I' | 'J' | 'INVALID';

interface InstructionConfig {
    opcode: number;
    mnemonic: string;
    type: InstructionType;
    description?: string;
    controlSignals: { [name: string]: number };
    shamt?: number; // Only for R-Type instructions
    funct?: number; // Only for R-Type instructions
    operands?: OperandType[];
}
