import { ALUopcode } from "../interfaces/core";
import { InstructionType, MemOp, OperandRole, OperandType } from "../interfaces/instruction";

interface OperandConfig {
    type: OperandType;
    role: OperandRole;
}

enum ALUInputSource1 {
    NPC,
    A,
}
enum ALUInputSource2 {
    B,
    I,
}

interface BaseInstructionConfig {
    mnemonic: string;
    memOp?: MemOp;
    ALUopcode?: ALUopcode;
    ALUinputSource1?: ALUInputSource1;
    ALUinputSource2?: ALUInputSource2;
    description: string;
    operands?: OperandConfig[];
}

interface ITypeInstructionConfig extends BaseInstructionConfig {
    type: InstructionType.I;
    memOp?: MemOp;
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

let INSTRUCTION_SET: InstructionConfig[] = [

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
        mnemonic: "BEQ",
        type: InstructionType.I,
        ALUopcode: ALUopcode.ADD,
        ALUinputSource1: ALUInputSource1.NPC,
        description: "Branches to a label if Rs and Rt are equal",
        operands: [
            { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
            { role: OperandRole.SOURCE, type: OperandType.UNUSED },
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



const defaultInstructionI: ITypeInstructionConfig = {
    type: InstructionType.I,
    mnemonic: "",
    description: "",
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.A,
    ALUinputSource2: ALUInputSource2.I,
    memOp: MemOp.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
        { role: OperandRole.IMMEDIATE, type: OperandType.IMMEDIATE },
    ],
};

const defaultInstructionR: RTypeInstructionConfig = {
    type: InstructionType.R,
    mnemonic: "",
    description: "",
    ALUopcode: ALUopcode.PASSTHROUGH,
    ALUinputSource1: ALUInputSource1.A,
    ALUinputSource2: ALUInputSource2.B,
    memOp: MemOp.NONE,

    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
        { role: OperandRole.SOURCE, type: OperandType.REGISTER },
    ],
};

const defaultInstructionJ: JTypeInstructionConfig = {
    type: InstructionType.J,
    mnemonic: "",
    description: "",
    ALUinputSource1: ALUInputSource1.NPC,
    ALUinputSource2: ALUInputSource2.B,
    memOp: MemOp.NONE,
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.LABEL },
    ],
};

// Merge the instruction set with the default values
INSTRUCTION_SET = INSTRUCTION_SET.map((instruction) => {
    console.log('config inst', instruction);

    let defaultInstruction: InstructionConfig;
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
    type: InstructionType.R,
    ALUopcode: ALUopcode.PASSTHROUGH,
    description: "No operation",
    operands: [
        { role: OperandRole.DESTINATION, type: OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.UNUSED },
        { role: OperandRole.SOURCE, type: OperandType.UNUSED },
    ],
});

console.log(INSTRUCTION_SET);


export default INSTRUCTION_SET;

