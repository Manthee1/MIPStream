const aluOperationsConfig = {
    ADD: {
        funct: 0x20,
        sign: '+',
    },
    ADDU: {
        funct: 0x21,
        sign: '+',
    },
    SUB: {
        funct: 0x22,
        sign: '-',
    },
    SUBU: {
        funct: 0x23,
        sign: '-',
    },
    AND: {
        funct: 0x24,
        sign: '&',
    },
    OR: {
        funct: 0x25,
        sign: '|',
    },
    XOR: {
        funct: 0x26,
        sign: '^',
    },
    NOR: {
        funct: 0x27,
        sign: '~|',
    },
    SLL: {
        funct: 0x00,
        sign: '<<',
    },
    SRL: {
        funct: 0x02,
        sign: '>>>',
    },
    SRA: {
        funct: 0x03,
        sign: '>>',
    },
    SLT: {
        funct: 0x2A,
        sign: '<',
    },
    SLTU: {
        funct: 0x2B,
        sign: '<',
    },
    DIV: {
        funct: 0x1A,
        sign: '/',
    },
    // DIVU: {
    //     funct: 0x1B,
    //     sign: '/',
    // },
    MULT: {
        funct: 0x18,
        sign: '*',
    },
    // MULTU: {
    //     funct: 0x19,
    //     sign: '*',
    // },
    MFHI: {
        funct: 0x10,
        sign: 'MFHI',
    },
    MTHI: {
        funct: 0x11,
        sign: 'MTHI',
    },
    MFLO: {
        funct: 0x12,
        sign: 'MFLO',
    },
    MTLO: {
        funct: 0x13,
        sign: 'MTLO',
    },
};




export const ALUOperations: { [key: string]: number } = {}
export const ALUOperationsSigns: { [key: string]: string } = {}
export const ALUOperationstoSigns: { [key: number]: string } = {}


for (const [key, value] of Object.entries(aluOperationsConfig)) {
    ALUOperations[key] = value.funct;
    ALUOperationsSigns[key] = value.sign;
    ALUOperationstoSigns[value.funct] = value.sign;
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
        case 0b11:
            return ALUOperations.AND;
        default:
            throw new Error("Unknown ALU operation");
    }
    return ALUControl;
}


export function getAluResult(ALUControl: number, ALUInput1: number, ALUInput2: number, HI: number, LO: number) {
    console.log(`ALUControl: ${ALUControl}, ALUInput1: ${ALUInput1}, ALUInput2: ${ALUInput2}, HI: ${HI}, LO: ${LO}`);

    let ALUResult: number = 0;
    switch (ALUControl) {
        case ALUOperations.SLL: ALUResult = ALUInput1 << ALUInput2; break;
        case ALUOperations.SRL: ALUResult = ALUInput1 >>> ALUInput2; break;
        case ALUOperations.SLT: ALUResult = ALUInput1 < ALUInput2 ? 1 : 0; break;
        case ALUOperations.SLTU: ALUResult = (ALUInput1 >>> 0) < (ALUInput2 >>> 0) ? 1 : 0; break;
        case ALUOperations.SRA: ALUResult = ALUInput1 >> ALUInput2; break;
        case ALUOperations.ADD: ALUResult = ALUInput1 + ALUInput2; break;
        case ALUOperations.ADDU: ALUResult = (ALUInput1 >>> 0) + (ALUInput2 >>> 0); break;
        case ALUOperations.SUB: ALUResult = ALUInput1 - ALUInput2; break;
        case ALUOperations.SUBU: ALUResult = (ALUInput1 >>> 0) - (ALUInput2 >>> 0); break;
        case ALUOperations.AND: ALUResult = ALUInput1 & ALUInput2; break;
        case ALUOperations.OR: ALUResult = ALUInput1 | ALUInput2; break;
        case ALUOperations.XOR: ALUResult = ALUInput1 ^ ALUInput2; break;
        case ALUOperations.NOR: ALUResult = ~(ALUInput1 | ALUInput2); break;
        case ALUOperations.MULT:
            const result = BigInt(ALUInput1) * BigInt(ALUInput2);
            HI = Number(result >> 32n); // High 32 bits
            LO = Number(result & 0xFFFFFFFFn); // Low 32 bits
            ALUResult = LO; // For simplicity, returning the low part
            break;
        case ALUOperations.DIV:
            if (ALUInput2 !== 0) {
                LO = Math.floor(ALUInput1 / ALUInput2);
                HI = ALUInput1 % ALUInput2;
                ALUResult = LO; // For simplicity, returning the low part
            } else throw new Error("Division by zero");
            break;
        case ALUOperations.MFHI: ALUResult = HI; break;
        case ALUOperations.MFLO: ALUResult = LO; break;
        case ALUOperations.MTHI: HI = ALUInput1; break;
        case ALUOperations.MTLO: LO = ALUInput1; break;
        case 0x3f: break; // Flushed Instruction identifier
        default: throw new Error("Unknown ALU operation");
    }

    return {
        ALUResult,
        HI,
        LO,
    };
}