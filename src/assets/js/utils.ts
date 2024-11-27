import { StageData } from "./interfaces/core";
import { InstructionR, InstructionI, InstructionJ, InstructionType, InstructionDef, MemOp } from "./interfaces/instruction";
// utils.ts

/**
 * Checks if the given string is a register.
 * @param str - The string to check.
 * @returns True if the string is a register, false otherwise.
 */
export function isRegister(str: string): boolean {
    const registerPattern = /^R\d+$/;
    return registerPattern.test(str);
}

// Get the register number from a register string
export function getRegisterNumber(register: string): number {
    return parseInt(register.slice(1));
}

// Check if the register numbeer is valid
export function isValidRegister(register: number): boolean {
    return register >= 0 && register < 32;
}

export function isLabel(str: string): boolean {
    const labelPattern = /^[a-zA-Z_]\w*$/;
    return labelPattern.test(str);
}


export function createBlankStageData(): StageData {
    return {
        IR: {
            opcode: 0,
            rs1: 0,
            rs2: 0,
            rd: 0,
        },
        OPC: -1,
        NPC: 0,
        A: 0,
        B: 0,
        I: 0,
        ALUOutput: 0,
        LMD: 0,
        cond: false,
    };
}



/**
 * Checks if the given string is a memory address.
 * @param str - The string to check.
 * @returns True if the string is a memory address, false otherwise.
 */
export function isMemory(str: string): boolean {
    const memoryPattern = /^0x[0-9A-Fa-f]+$/;
    return memoryPattern.test(str);
}

/**
 * Checks if the given string is a numeric value.
 * @param str - The string to check.
 * @returns True if the string is a numeric value, false otherwise.
 */
export function isValue(str: string): boolean {
    if (str.trim() === '') return false;
    return !isNaN(Number(str));
}

export function isXBit(value: number, x: number): boolean {
    return value < 0 || value >= 2 ** x;
}

export function isEffectiveAddress(value: string): boolean {
    // imm(reg) or imm
    const effectiveAddressPattern = /^-?\d+\(R\d+\)$|^(-?\d+)$/;
    return effectiveAddressPattern.test(value);
}

export function getEffectiveAddressRegister(value: string): number {
    return parseInt(value.split('(')[1].split(')')[0].slice(1));
}

export function getEffectiveAddressImm(value: string): number {
    return parseInt(value.split('(')[0]);
}

export function isRType(instruction: InstructionR | InstructionI | InstructionJ): instruction is InstructionR {
    return (instruction as InstructionR).rs1 !== undefined;
}

export function isIType(instruction: InstructionR | InstructionI | InstructionJ): instruction is InstructionI {
    return (instruction as InstructionI).rs !== undefined;
}

export function isJType(instruction: InstructionR | InstructionI | InstructionJ): instruction is InstructionJ {
    return (instruction as InstructionJ).address !== undefined;
}

export function getInstructionType(instruction: InstructionR | InstructionI | InstructionJ): InstructionType {
    if (isRType(instruction)) {
        return InstructionType.R;
    } else if (isIType(instruction)) {
        return InstructionType.I;
    } else if (isJType(instruction)) {
        return InstructionType.J;
    } else {
        return InstructionType.INVALID;
    }
}

export function getInstructionSyntax(instruction: InstructionDef) {
    switch (instruction.type) {
        case InstructionType.R:
            return `${instruction.mnemonic} Rd, Rs1, Rs2`;
        case InstructionType.I:
            if (instruction.memOp == MemOp.LOAD || instruction.memOp == MemOp.STORE)
                return `${instruction.mnemonic} Rd, imm(Rn)`;
            return `${instruction.mnemonic} Rd, Rs, imm`;
        case InstructionType.J:
            return `${instruction.mnemonic} label`;
    }
}


// dec to binary, hex
export function decToBinary(dec: number, bits: number): string {
    return dec.toString(2).padStart(bits, '0');
}

export function decToHex(dec: number, bits: number): string {
    return dec.toString(16).padStart(bits / 4, '0');
}


export function getStageName(stage: number): string {
    switch (stage) {
        case 0:
            return "IF";
        case 1:
            return "ID";
        case 2:
            return "EX";
        case 3:
            return "MEM";
        case 4:
            return "WB";
        default:
            return "INVALID";
    }
}


export function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}