import { ALUOperations } from "./alu";

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
        funct: ALUOperations.ADD,
        description: "Add two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "addu",
        funct: ALUOperations.ADDU,
        description: "Add two registers (unsigned) and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sub",
        funct: ALUOperations.SUB,
        description: "Subtract the second register from the first and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "subu",
        funct: ALUOperations.SUBU,
        description: "Subtract the second register from the first (unsigned) and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "and",
        funct: ALUOperations.AND,
        description: "Perform a bitwise AND operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "or",
        funct: ALUOperations.OR,
        description: "Perform a bitwise OR operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "xor",
        funct: ALUOperations.XOR,
        description: "Perform a bitwise XOR operation on two registers and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sll",
        funct: ALUOperations.SLL,
        description: "Shift the bits of the second register to the left by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "srl",
        funct: ALUOperations.SRL,
        description: "Shift the bits of the second register to the right (logical shift) by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "sra",
        funct: ALUOperations.SRA,
        description: "Shift the bits of the second register to the right (arithmetic shift) by a specified amount and store the result in the destination register.",
    },
    {
        ...RType,
        mnemonic: "slt",
        funct: ALUOperations.SLT,
        description: "Set the destination register to 1 if the first register is less than the second register, otherwise set it to 0.",
    },
    {
        ...RType,
        mnemonic: "sltu",
        funct: ALUOperations.SLTU,
        description: "Set the destination register to 1 if the first register is less than the second register (unsigned comparison), otherwise set it to 0.",
    },
    {
        ...RType,
        mnemonic: "neg",
        funct: ALUOperations.NEG,
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
        opcode: 0x3f,
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

