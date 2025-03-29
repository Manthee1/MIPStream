const RType: InstructionConfig = {
    mnemonic: "",
    opcode: 0x00,
    type: 'R',
    controlSignals: {
        RegDst: 1,
        RegWrite: 1,
        ALUOp: 2,
    },
}


export const baseInstructionConfig: InstructionConfig[] = [
    {
        ...RType,
        mnemonic: "nop",
        operands: [],
        description: "No operation",
    },
    {
        ...RType,
        mnemonic: "add",
        funct: 0b0000,
    },
    {
        ...RType,
        mnemonic: "sub",
        funct: 0b0001,
    },
    {
        ...RType,
        mnemonic: "and",
        funct: 0b0010,

    },
    {
        ...RType,
        mnemonic: "or",
        funct: 0b0011,
    },
    {
        ...RType,
        mnemonic: "xor",
        funct: 0b0100,
    },
    {
        ...RType,
        mnemonic: "sll",
        funct: 0b0101,
    },
    {
        ...RType,
        mnemonic: "srl",
        funct: 0b0110,
    },
    {
        ...RType,
        mnemonic: "sra",
        funct: 0b0111,
    },
    {
        ...RType,
        mnemonic: "slt",
        funct: 0b1000,
    },
    {
        ...RType,
        mnemonic: "sltu",
        funct: 0b1001,
    },
    {
        ...RType,
        mnemonic: "neg",
        funct: 0b0001,
        operands: ["REG_DESTINATION", "REG_TARGET"]
    },
    {
        opcode: 0x08,
        mnemonic: "addi",
        type: 'I',
        controlSignals: {
            ALUSrc: 1,
            RegWrite: 1,
            ALUOp: 0,
        },
        description: "Add immediate",
    },

    {
        opcode: 0x23,
        mnemonic: "lw",
        type: 'I',
        controlSignals: {
            ALUSrc: 1,
            MemtoReg: 1,
            MemRead: 1,
            RegWrite: 1,
            ALUOp: 0,
        },
        operands: ['REG_DESTINATION', 'MEM_ADDRESS'],
        description: "Load word from memory",
    },
    {
        opcode: 0x2b,
        mnemonic: "sw",
        type: 'I',
        controlSignals: {
            ALUSrc: 1,
            MemWrite: 1,
            ALUOp: 0,
        },
        operands: ['REG_TARGET', 'MEM_ADDRESS'],
        description: "Store word to memory",
    },
    {
        opcode: 0x04,
        mnemonic: "beq",
        type: 'I',
        controlSignals: {
            ALUOp: 1,
            Branch: 1,
        },
        operands: ['REG_SOURCE', 'REG_TARGET', 'LABEL'],
        description: "Branch if equal",
    },
    {
        opcode: 0xff,
        mnemonic: "halt",
        type: 'J',
        controlSignals: {},
        operands: [],

    }
];



export const instructionConfigWithJump: InstructionConfig[] = [
    ...baseInstructionConfig,
    {
        opcode: 0x02,
        mnemonic: "j",
        description: "Jump to address",
        type: 'J',
        controlSignals: {
            "Jump": 1,
        },
        operands: [
            'LABEL',
        ],
    }
]

