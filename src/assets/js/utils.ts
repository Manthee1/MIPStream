

// utils.ts

import { ALUOperationstoSigns, getAluControl } from "../../core/config/alu";
import { baseInstructionConfig } from "../../core/config/instructions";


const mnemonics = new Set(baseInstructionConfig.map((instruction) => instruction.mnemonic));
export const advanceRegisterNames = ['zero', 'at', 'v0', 'v1', 'a0', 'a1', 'a2', 'a3', 't0', 't1', 't2', 't3', 't4', 't5', 't6', 't7', 's0', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 't8', 't9', 'k0', 'k1', 'gp', 'sp', 'fp', 'ra'];

export const registerDescriptions: Array<{ label: string, description: string }> = [
    { label: 'Always 0', description: 'This register always holds the value 0 and cannot be modified.' },
    { label: 'Assembler', description: 'Typically reserved for assembler usage, mainly used for pseudo-instructions. - **Not used by the assembler in this simulator**' },
    { label: 'Value 0', description: 'Used to store the result of function calls or expressions.' },
    { label: 'Value 1', description: 'Used to store the second result of function calls or expressions.' },
    { label: 'Argument 0', description: 'Holds the first argument passed to a function.' },
    { label: 'Argument 1', description: 'Holds the second argument passed to a function.' },
    { label: 'Argument 2', description: 'Holds the third argument passed to a function.' },
    { label: 'Argument 3', description: 'Holds the fourth argument passed to a function.' },
    { label: 'Temporary 0', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 1', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 2', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 3', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 4', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 5', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 6', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 7', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Saved 0', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 1', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 2', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 3', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 4', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 5', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 6', description: 'Saved register, preserved across function calls.' },
    { label: 'Saved 7', description: 'Saved register, preserved across function calls.' },
    { label: 'Temporary 8', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Temporary 9', description: 'Temporary register used for intermediate calculations, not preserved across function calls.' },
    { label: 'Kernel 0', description: 'Reserved for operating system kernel usage.' },
    { label: 'Kernel 1', description: 'Reserved for operating system kernel usage.' },
    { label: 'Global Pointer', description: 'Points to the global data segment in memory.' },
    { label: 'Stack Pointer', description: 'Points to the top of the stack, used for function calls and local variables.' },
    { label: 'Frame Pointer', description: 'Points to the base of the current stack frame, used for accessing function parameters and local variables.' },
    { label: 'Return Address', description: 'Holds the return address for function calls.' },
];


/**
 * Checks if the given string is a register.
 * @param str - The string to check.
 * @returns True if the string is a register, false otherwise.
 */
export function isRegister(str: string): boolean {
    if (!str.startsWith('$') && !str.startsWith('R')) return false;
    const val = str.slice(1).trim();
    if (val.length == 0) return false
    return advanceRegisterNames.includes(val) || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) < 32);
}

// Get the register number from a register string
export function getRegisterNumber(register: string): number {
    const registerName = register.slice(1).trim();
    // If register value is a number then return it, otherwise figure out which register number it is from the advanced register names
    if (!isNaN(Number(registerName))) {
        return Number(registerName);
    } else {
        const index = advanceRegisterNames.indexOf(registerName);
        if (index === -1) {
            throw new Error(`Invalid register name: ${register}`);
        }
        return index;
    }
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
 * Checks if the given string is hex.
 */
export function isHex(str: string): boolean {
    const hexPattern = /^[0-9A-Fa-f]+$/;
    return hexPattern.test(str);
}

export function isBin(str: string): boolean {
    const binPattern = /^[01]+$/;
    return binPattern.test(str);
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
    return value >= -(2 ** (x - 1)) && value < 2 ** x;
}

// Check if the value is signed
export function isXBitSigned(value: number, x: number): boolean {
    return value >= -(2 ** (x - 1)) && value < 2 ** (x - 1);
}

export function isXBitUnsigned(value: number, x: number): boolean {
    return value >= 0 && value < 2 ** x;
}

export function toSigned(value: number, x: number): number {
    if (value >= 2 ** (x - 1)) {
        // Convert to signed
        value -= 2 ** x;
    }
    return value;
}


export function toUnsigned(value: number): number {
    return value >>> 0; // Convert to 32 bit unsigned
}



export function isEffectiveAddress(value: string): boolean {

    // Validate that the value is in the form of imm(register) without regex
    //  register must have prefix $ or R. and after have either 0to31 numbers or advanced register names
    // imm must be a number, binary, hex or decimal
    const parts = value.split('(');
    if (parts.length !== 2) return false;
    const imm = parts[0].trim();
    const register = parts[1].split(')')[0].trim();
    if (register.length == 0) return false;
    if (!isRegister(register)) return false;
    if (imm.length == 0) return false;
    if (!isValue(imm) && !isHex(imm) && !isBin(imm)) return false;
    return true;
}

export function getEffectiveAddressRegister(value: string): number {
    // if its a value return it otherwise check which register nname index it is
    const registerName = value.split('(')[1].split(')')[0].trim().slice(1);
    if (isValue(registerName)) {
        return parseInt(registerName);
    }
    if (advanceRegisterNames.indexOf(registerName) == -1) {
        throw new Error(`Invalid register name: ${registerName}`);
    }
    return advanceRegisterNames.indexOf(registerName);

}

export function getEffectiveAddressImm(value: string): number {
    return parseInt(value.split('(')[0]);
}


export function isMnemonic(mnemonic: string): boolean {
    return mnemonics.has(mnemonic.trim());
}

export function extractOperands(line: string): string[] {
    return line.split(';')[0].trim()
        // Replaec every space and comma with a single space
        .replace(/[\s,]+/g, ' ')
        // Split by space
        .split(' ')
        // Remove the first element (mnemonic)
        .slice(1)
        // Remove empty strings
        .map((operand) => operand.split(' ')[0]).filter((operand) => operand !== '');
}

export function getInstructionSyntax(instruction: InstructionConfig) {
    const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
    let operandExamples = '';
    for (let i = 0; i < operands.length; i++) {
        if (operands[i] == "NONE") continue;
        if (i > 0) operandExamples += ', ';
        operandExamples += getOperandSyntax(operands[i]);
    }

    return `${instruction.mnemonic} ${operandExamples}`;

}

export function getOperandSyntax(operand: OperandType) {
    switch (operand) {
        case 'REG_DESTINATION':
            return 'Rd';
        case 'REG_SOURCE':
            return 'Rs';
        case 'REG_TARGET':
            return 'Rt';
        case 'IMMEDIATE':
            return 'imm';
        case 'SHAMT':
            return 'shamt';
        case 'MEM_ADDRESS':
            return 'imm(Rs)';
        case 'LABEL':
            return 'label';
        case 'NONE':
            return '-';
        default:
            return '';
    }


}


// dec to binary, hex
export function decToBinary(dec: number, bits: number): string {
    const unsignedDec = dec >>> 0; // Convert to unsigned
    return unsignedDec.toString(2).padStart(bits, '0');
}

export function decToHex(dec: number, bits: number): string {
    const unsignedDec = dec >>> 0; // Convert to unsigned
    return unsignedDec.toString(16).padStart(bits / 4, '0');
}

export function decToUnsigned(value: number, bits: number): number {
    if (value < 0) {
        // Convert negative value to unsigned
        return (1 << bits) + value;
    }
    return value;
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

export function getPseudoCode(instructionConfig: InstructionConfig) {
    // Construct the pseudo code based on the instruction config
    if (instructionConfig.mnemonic == 'halt') return '-'
    if (instructionConfig.mnemonic == 'nop') return '-'

    let out = ''
    const cs = instructionConfig.controlSignals as Record<string, number>;
    const ALUControl = getAluControl(cs['ALUOp'] ?? 0, instructionConfig?.funct ?? 0)
    let ALUOPSign = ALUOperationstoSigns[ALUControl] ?? '???'
    const operands = instructionConfig.operands ?? getDefaultInstructionDefOperands(instructionConfig);

    const Rs = (operands.includes('REG_SOURCE') || operands.includes('MEM_ADDRESS')) ? 'Rs' : '0'
    const Rt = (operands.includes('REG_TARGET')) ? 'Rt' : '0'
    const imm = (operands.includes('IMMEDIATE')) ? 'imm' : '0'

    const ALUIn2 = cs['ALUSrc'] ? imm : Rt;

    if (cs['RegWrite']) {
        const memOut = cs['MemRead'] ? `MEM[${Rs} ${ALUOPSign} ${ALUIn2}];\n` : '0'
        out += `Rd = `
        out += (cs['MemtoReg']) ? memOut : `${Rs} ${ALUOPSign} ${ALUIn2};\n`;
    }

    if (cs['MemWrite']) {
        out += `MEM[${Rs} ${ALUOPSign} ${ALUIn2}] = Rd;\n`
    }

    if (cs['Branch']) {
        out += `if (${Rs} ${ALUOPSign} ${ALUIn2} == 0) PC = label;\n`
    }
    return out;

}

export function getProgramLines(program: string): string[] {
    return program.replace(/\r/g, '').replace(/\r/g, '\n').split('\n').map(line => line.split(';')[0].trim())
}