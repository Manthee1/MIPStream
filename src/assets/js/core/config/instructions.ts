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


export const instructionConfig: InstructionConfig[] = [
    {
        ...RType,
        mnemonic: "nop",
        operands: [],
    },
    {
        ...RType,
        mnemonic: "add",
        funct: 0x20,
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
    },
    {
        opcode: 0x04,
        mnemonic: "beq",
        type: 'I',
        controlSignals: {
            ALUOp: 1,
            Branch: 1,
        },
        operands: ['REG_SOURCE', 'REG_SOURCE', 'LABEL'],
    },
    {
        opcode: 0xff,
        mnemonic: "halt",
        type: 'J',
        controlSignals: {},
        operands: [],

    }
];

