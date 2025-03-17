export const ALUOperations = {
    ADD: 0b0000,
    SUB: 0b0001,
    AND: 0b0010,
    OR: 0b0011,
    XOR: 0b0100,
    SLL: 0b0101,
    SRL: 0b0110,
    SRA: 0b0111,
    SLT: 0b1000,
    SLTU: 0b1001,
    MUL: 0b1010,
    DIV: 0b1011,
    MFHI: 0b1100,
    MFLO: 0b1101
};


export const ALUOperationsSigns = {
    ADD: '+',
    SUB: '-',
    AND: '&',
    OR: '|',
    XOR: '^',
    SLL: '<<',
    SRL: '>>>',
    SRA: '>>',
    SLT: '<',
    SLTU: '<',
    MUL: '*',
    DIV: '/',
    MFHI: 'MFHI',
    MFLO: 'MFLO'
}

export const ALUOperationstoSigns = {
    0b0000: '+',
    0b0001: '-',
    0b0010: '&',
    0b0011: '|',
    0b0100: '^',
    0b0101: '<<',
    0b0110: '>>>',
    0b0111: '>>',
    0b1000: '<',
    0b1001: '<',
    0b1010: '*',
    0b1011: '/',
    0b1100: 'MFHI',
    0b1101: 'MFLO'
}


export function getAluControl(ALUOp: number, funct: number): number {
    let ALUControl: number = 0;
    switch (ALUOp) {
        case 0b00:
            ALUControl = ALUOperations.ADD;
            break;
        case 0b01:
            ALUControl = ALUOperations.SUB;
            break;
        case 0b10:
            // Map the funct field to the ALU operation
            ALUControl = funct;
            break;
        default:
            throw new Error("Unknown ALU operation");
    }
    return ALUControl;
}