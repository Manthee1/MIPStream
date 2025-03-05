
type OperandType = 'REG_SOURCE' | 'REG_DESTINATION' | 'IMMEDIATE' | 'ADDRESS' | 'LABEL' | 'INVALID';

type InstructionType = 'R' | 'I' | 'J' | 'INVALID';

interface InstructionConfig {
    opcode: number;
    mnemonic: string;
    type: InstructionType;
    description?: string;
    controlSignals: { [name: string]: number };
    funct?: number; // Only for R-Type instructions
    operands?: OperandType[];
}
