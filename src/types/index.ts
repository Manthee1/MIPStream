// Canonical project types — small subset to improve typing during refactor

export type OperandType =
    | 'REG_DESTINATION'
    | 'REG_SOURCE'
    | 'REG_TARGET'
    | 'IMMEDIATE'
    | 'SHAMT'
    | 'MEM_ADDRESS'
    | 'LABEL'
    | 'NONE';

export interface ControlSignals {
    RegWrite?: number;
    MemtoReg?: number;
    MemWrite?: number;
    MemRead?: number;
    Branch?: number;
    ALUOp?: number;
    ALUSrc?: number;
    RegDst?: number;
    [key: string]: any;
}

export interface InstructionConfig {
    mnemonic: string;
    opcode: number;
    type: 'R' | 'I' | 'J';
    operands?: OperandType[];
    controlSignals: ControlSignals;
    funct?: number;
    [key: string]: any;
}

export interface CPUOptionItem {
    label: string;
    key: string;
    default: any;
    type: string;
    min?: number;
    max?: number;
    verify?: (v: any) => boolean;
}

export type CPUOptionsConfig = CPUOptionItem[];

export interface StageRegisterField {
    value: number;
}

export interface StageRegisters {
    [stage: string]: Record<string, StageRegisterField>;
}
