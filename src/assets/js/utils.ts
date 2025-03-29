

// utils.ts

import { baseInstructionConfig } from "./core/config/instructions";


const mnemonics = new Set(baseInstructionConfig.map((instruction) => instruction.mnemonic));

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

export function isXBitSigned(value: number, x: number): boolean {
    return value < -(2 ** (x - 1)) || value >= 2 ** (x - 1);
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


export function isMnemonic(mnemonic: string): boolean {
    return mnemonics.has(mnemonic.trim());
}


export function getInstructionSyntax(instruction: InstructionConfig) {
    const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
    const operandExamples = operands.map((operand) => {
        switch (operand) {
            case 'REG_DESTINATION':
                return 'Rd';
            case 'REG_SOURCE':
                return 'Rs';
            case 'REG_TARGET':
                return 'Rt';
            case 'IMMEDIATE':
                return 'imm';
            case 'MEM_ADDRESS':
                return 'imm(Rs)';
            case 'LABEL':
                return 'label';
            default:
                return '';
        }
    });
    return `${instruction.mnemonic} ${operandExamples.join(', ')}`;

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

export function formatDate(date: Date, format: string): string {
    const map: { [key: string]: number } = {
        'Y': date.getFullYear(),
        'M': date.getMonth() + 1,
        'D': date.getDate(),
        'h': date.getHours(),
        'm': date.getMinutes(),
        's': date.getSeconds(),
    };

    return format.replace(/Y+|M+|D+|h+|m+|s+/g, (match) => {
        return map[match[0]]?.toString().padStart(match.length, '0') || '';
    });
}

export function formatDateRecent(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'Just now';
    } else if (minutes < 60) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (days < 7) {
        return `${days} day${days > 1 ? 's' : ''} ago`;
    } else {
        return formatDate(date, 'YYYY/MM/DD');
    }
}

export function formatSize(size: number): string {
    if (size < 1024) {
        return size + ' B';
    } else if (size < 1024 * 1024) {
        return (size / 1024).toFixed(2) + ' KB';
    } else if (size < 1024 * 1024 * 1024) {
        return (size / 1024 / 1024).toFixed(2) + ' MB';
    } else {
        return (size / 1024 / 1024 / 1024).toFixed(2) + ' GB';
    }
}


export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// Function to only extract the first x bits of a number
export function extractBits(num: number, x: number): number {
    return num & ((1 << x) - 1);
}


export function getDefaultInstructionDefOperands(instruction: InstructionConfig): OperandType[] {
    switch (instruction.type) {
        case 'R':
            return ['REG_DESTINATION', 'REG_SOURCE', 'REG_TARGET'];
        case 'I':
            return ['REG_DESTINATION', 'REG_SOURCE', 'IMMEDIATE'];
        case 'J':
            return ['LABEL'];
        default:
            throw new Error(`Invalid instruction type: ${instruction.type}.`);
    }

}

export function getProgramLines(program: string): string[] {
    return program.replace(/\r/g, '').replace(/\r/g, '\n').split('\n').map(line => line.trim())
}