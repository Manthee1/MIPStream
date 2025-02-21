export enum GateType {
    AND = 'AND',
    OR = 'OR',
    XOR = 'XOR',
    NOT = 'NOT',
    NAND = 'NAND',
    NOR = 'NOR',
    XNOR = 'XNOR'
}

export enum ComponentType {
    PC = 'PC',
    StageRegister = 'StageRegister',
    RegisterFile = 'RegisterFile',
    ALU = 'ALU',
    ControlUnit = 'ControlUnit',
    InstructionMemory = 'InstructionMemory',
    DataMemory = 'DataMemory',
    MUX = 'MUX',
    SignExtender = 'SignExtender',
    ShiftLeft = 'ShiftLeft',
    Adder = 'Adder',
    ALUControl = 'ALUControl',
    Gate = 'Gate',
    Constant = 'Constant'
}


export enum OperandType {
    UNUSED,
    REGISTER,
    IMMEDIATE,
    LABEL
}

export enum OperandRole {
    DESTINATION,
    SOURCE,
    IMMEDIATE
}
