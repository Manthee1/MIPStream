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
        description: "No operation. The processor does nothing for this instruction.",
    },
    {
        ...RType,
        mnemonic: "add",
        funct: 0b0000,
        description: "Add two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sub",
        funct: 0b0001,
        description: "Subtract the second register from the first and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "and",
        funct: 0b0010,
        description: "Perform a bitwise AND operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "or",
        funct: 0b0011,
        description: "Perform a bitwise OR operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "xor",
        funct: 0b0100,
        description: "Perform a bitwise XOR operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sll",
        funct: 0b0101,
        description: "Shift the bits of the second register to the left by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "srl",
        funct: 0b0110,
        description: "Shift the bits of the second register to the right (logical shift) by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sra",
        funct: 0b0111,
        description: "Shift the bits of the second register to the right (arithmetic shift) by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "slt",
        funct: 0b1000,
        description: "Set the destination register to 1 if the first register is less than the second register, otherwise set it to 0.",
    },
    {
        ...RType,
        mnemonic: "sltu",
        funct: 0b1001,
        description: "Set the destination register to 1 if the first register is less than the second register (unsigned comparison), otherwise set it to 0.",
    },
    {
        ...RType,
        mnemonic: "neg",
        funct: 0b0001,
        operands: ["REG_DESTINATION", "REG_TARGET"],
        description: "Negate the value of the second register and store the result in the destination register.",
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
        description: "Add an immediate value to a register and store the result in the destination register.",
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
        description: "Load a word from memory at the specified address into the destination register.",
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
        description: "Store a word from the specified register into memory at the specified address.",
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
        description: "Branch to the specified label if the values in the two registers are equal.",
    },
    {
        opcode: 0xff,
        mnemonic: "halt",
        type: 'J',
        controlSignals: {},
        operands: [],
        description: "Stop the execution of the program.",
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

