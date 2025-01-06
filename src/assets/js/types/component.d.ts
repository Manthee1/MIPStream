enum ComponentType {
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

interface ControlInput {
    bits: number;
    name: string;
}

interface ControlSignal {
    bits: number;
    name: string;
}

interface ComponentInput {
    bits: number;
    name: string;
}

interface ComponentConnection {
    bitRange: [number, number];
    // from and to format: componentId.portName 
    from: string;
    to: string;
}

interface ComponentOutput {
    bits: number;
    name: string;
}

interface ComponentBaseInterface {
    id: string;
    name: string;
    type: ComponentType;
    description: string;
    controlInputs: ControlInput[];
    inputs: ComponentInput[];
    outputs: ComponentOutput[];
}

enum GateType {
    AND = 'AND',
    OR = 'OR',
    XOR = 'XOR',
    NOT = 'NOT',
    NAND = 'NAND',
    NOR = 'NOR',
    XNOR = 'XNOR'
}