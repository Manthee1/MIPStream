import { ALUopcode } from "../interfaces/core";
import { InstructionType, MemOp, OperandRole, OperandType } from "../interfaces/instruction";

interface OperandConfig {
    type: OperandType;
    role: OperandRole;
}

export enum ALUInputSource1 {
    NPC,
    A,
}
export enum ALUInputSource2 {
    B,
    I,
}

export enum CondRegZCompareConfig {
    NONE,
    EQUAL,
    NOT_EQUAL,
}


export interface BaseInstructionConfig {
    mnemonic: string;
    memOp?: MemOp;
    ALUopcode?: ALUopcode;
    ALUinputSource1?: ALUInputSource1;
    ALUinputSource2?: ALUInputSource2;
    description: string;
    condRegZCompareConfig?: CondRegZCompareConfig;
    operands?: OperandConfig[];
}

export interface BaseInstructionConfigAllRequired extends BaseInstructionConfig {
    type: InstructionType;
    mnemonic: string;
    memOp: MemOp;
    ALUopcode: ALUopcode;
    ALUinputSource1: ALUInputSource1;
    ALUinputSource2: ALUInputSource2;
    description: string;
    condRegZCompareConfig: CondRegZCompareConfig;
    operands: OperandConfig[];
}

interface ITypeInstructionConfig extends BaseInstructionConfig {
    type: InstructionType.I;
    operands?: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER | OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER | OperandType.UNUSED },
        { role: OperandRole.IMMEDIATE, type: OperandType.IMMEDIATE | OperandType.LABEL | OperandType.UNUSED }
    ];
}

interface RTypeInstructionConfig extends BaseInstructionConfig {
    type: InstructionType.R;
    operands?: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER | OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER | OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER | OperandType.UNUSED }
    ];
}

interface JTypeInstructionConfig extends BaseInstructionConfig {
    type: InstructionType.J;
    operands?: [
        { role: OperandRole.DESTINATION, type: OperandType.LABEL | OperandType.REGISTER | OperandType.UNUSED }
    ];
}

type InstructionConfig = ITypeInstructionConfig | RTypeInstructionConfig | JTypeInstructionConfig;

let INSTRUCTION_CONFIG: InstructionConfig[] = [

    {
        mnemonic: "ADDI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        description: "Adds an immediate value to `Rs` and stores the result in `Rd`",
    },
    {
        mnemonic: "ADD",
        type: InstructionType.R,
        ALUopcode: ALUopcode.ADD,
        description: "Adds `Rs1` and `Rs2` and stores the result in `Rd`",
    },
    {
        mnemonic: "SUB",
        type: InstructionType.R,
        ALUopcode: ALUopcode.SUB,
        description: "Subtracts `Rs2` from `Rs1` and stores the result in `Rd`",
    },
    {
        mnemonic: "SUBI",
        type: InstructionType.I,
        ALUopcode: ALUopcode.SUB,
        description: "Subtracts an immediate value from `Rs` and stores the result in `Rd`",
    },
    {
        mnemonic: "LW",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        memOp: MemOp.LOAD,
        description: "Loads a word from memory into `Rd`",
    },
    {
        mnemonic: "J",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "Jumps to a label",
    },
    {
        mnemonic: "JR",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "Jumps to a label",
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        ]
    },
    {
        mnemonic: "JAL",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "Jumps to a label and stores the return address in `Rd`",
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        ]
    },
    {
        mnemonic: "BEQZ",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        ALUinputSource1: ALUInputSource1.NPC,
        description: "Branches to a label if `Rs` is zero",
        condRegZCompareConfig: CondRegZCompareConfig.EQUAL,
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.UNUSED },
            { role: OperandRole.SOURCE, type: OperandType.REGISTER },
            { role: OperandRole.IMMEDIATE, type: OperandType.LABEL },
        ],

    },
    {
        mnemonic: "BNEZ",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        ALUinputSource1: ALUInputSource1.NPC,
        description: "Branches to a label if `Rs` is not zero",
        condRegZCompareConfig: CondRegZCompareConfig.NOT_EQUAL,
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.UNUSED },
            { role: OperandRole.SOURCE, type: OperandType.REGISTER },
            { role: OperandRole.IMMEDIATE, type: OperandType.LABEL },
        ],

    },
    {
        mnemonic: "HALT",
        type: InstructionType.J,
        ALUopcode: ALUopcode.PASSTHROUGH,
        description: "Halts the processor",
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.UNUSED },
        ],
    }
];



const defaultInstructionI: BaseInstructionConfigAllRequired = {
    type: InstructionType.I,
    mnemonic: "",
    description: "",
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.A,
    ALUinputSource2: ALUInputSource2.I,
    memOp: MemOp.NONE,
    condRegZCompareConfig: CondRegZCompareConfig.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
        { role: OperandRole.IMMEDIATE, type: OperandType.IMMEDIATE },
    ],
};

const defaultInstructionR: BaseInstructionConfigAllRequired = {
    type: InstructionType.R,
    mnemonic: "",
    description: "",
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.A,
    ALUinputSource2: ALUInputSource2.B,
    memOp: MemOp.NONE,
    condRegZCompareConfig: CondRegZCompareConfig.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
    ],
};

const defaultInstructionJ: BaseInstructionConfigAllRequired = {
    type: InstructionType.J,
    mnemonic: "",
    description: "",
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.NPC,
    ALUinputSource2: ALUInputSource2.B,
    memOp: MemOp.NONE,
    condRegZCompareConfig: CondRegZCompareConfig.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.LABEL },
    ],
};

// Merge the instruction set with the default values
let INSTRUCTION_SET: BaseInstructionConfigAllRequired[] = INSTRUCTION_CONFIG.map((instruction) => {
    console.log('config inst', instruction);

    let defaultInstruction: BaseInstructionConfigAllRequired;
    switch (instruction.type) {
        case InstructionType.I:
            defaultInstruction = defaultInstructionI;
            break;
        case InstructionType.R:
            defaultInstruction = defaultInstructionR;
            break;
        case InstructionType.J:
            defaultInstruction = defaultInstructionJ;
            break;
        default:
            throw new Error("Invalid instruction type");
    }
    return Object.assign({}, defaultInstruction, instruction);
});

// Insert NOP instruction
INSTRUCTION_SET.unshift({
    mnemonic: "NOP",
    type: InstructionType.I,
    memOp: MemOp.NONE,
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.A,
    ALUinputSource2: ALUInputSource2.B,
    description: "No operation",
    condRegZCompareConfig: CondRegZCompareConfig.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.UNUSED },
        { role: OperandRole.IMMEDIATE, type: OperandType.UNUSED },
    ],
});

console.log(INSTRUCTION_SET);


export default INSTRUCTION_SET;

