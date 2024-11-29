import { ALUopcode, CPU, Memory } from "./interfaces/core"
import { InstructionR, InstructionI, InstructionJ, InstructionType, MemOp } from "./interfaces/instruction"
import INSTRUCTION_SET from "./config/instructionSet"
import { createBlankStageData, getEffectiveAddressImm, getEffectiveAddressRegister, getRegisterNumber, isEffectiveAddress, isIType, isJType, isLabel, isMnemonic, isRegister, isRType, isValidRegister, isValue, isXBit, } from "./utils"



/**
 * Maps a label to a instruction memory address. Essentially which PC the instruction after the label is at.
 * @param programLines 
 * @returns 
 */
function collectLabels(programLines: string[]): never[] | Map<string, number> {
    let labels = new Map<string, number>();
    let pc = 0;
    let errors: string[] = [];
    programLines.forEach((lineContent,line) => {
        if (isMnemonic(lineContent.split(" ")[0])) {
            pc++
            return;
        }
        if (!lineContent.trim().endsWith(':')) return;
        const label = lineContent.slice(0, -1);
        // Check if the label is valid
        if (!isLabel(label)) {
            errors.push(`Invalid label format: ${lineContent} on line ${line + 1}.`);
            return;
        }

        // if it is a duplicate label add to errors
        if (labels.has(label)) {
            errors.push(`Duplicate label: ${label} on line ${line + 1}.`);
            return;
        }

        labels.set(label, pc);
    });

    if (errors.length) throw errors;

    return labels;
}


export function encodeInstruction(instruction: string, labels: Map<string, number>): InstructionR | InstructionI | InstructionJ {
    const mnemonic = instruction.split(" ")[0];
    const operands = instruction.split(" ").slice(1).join('').split(",").map((operand) => operand.trim());
    // If the instruction NOP, return a NOP instruction
    if (mnemonic === "NOP")
        return { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI;

    const instructionOpcode = INSTRUCTION_SET.findIndex((instructionDef) => instructionDef.mnemonic === mnemonic);

    if (instructionOpcode == -1) throw new Error(`Invalid instruction: ${mnemonic}.`);

    const instructionDef = INSTRUCTION_SET[instructionOpcode];

    let encodedInstruction: InstructionR | InstructionI | InstructionJ;


    switch (instructionDef.type) {
        case InstructionType.R:

            if (operands.length !== 3) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);

            // Check if operands are registers
            if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}.`);
            if (!isRegister(operands[1])) throw new Error(`Invalid register: ${operands[1]}.`);
            if (!isRegister(operands[2])) throw new Error(`Invalid register: ${operands[2]}.`);
            const [rs1, rs2, rd] = [getRegisterNumber(operands[1]), getRegisterNumber(operands[2]), getRegisterNumber(operands[0])];
            // Check if registers are valid
            if (!isValidRegister(rs1)) throw new Error(`Invalid register: ${operands[1]}.`);
            if (!isValidRegister(rs2)) throw new Error(`Invalid register: ${operands[2]}.`);
            if (!isValidRegister(rd)) throw new Error(`Invalid register: ${operands[0]}.`);


            encodedInstruction = {
                opcode: instructionOpcode,
                rs1: rs1,
                rs2: rs2,
                rd: rd
            }

            break;
        case InstructionType.I: {
            let rd: number, rs: number, imm: number;
            if (instructionDef.memOp == MemOp.STORE || instructionDef.memOp == MemOp.LOAD) {
                if (operands.length !== 2) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);

                // Check if operands are valid
                if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}.`);
                if (!isEffectiveAddress(operands[1])) throw new Error(`Invalid effective address: ${operands[1]}.`);
                [rd, rs, imm] = [getRegisterNumber(operands[0]), getEffectiveAddressRegister(operands[1]), getEffectiveAddressImm(operands[1])];
            } else {

                if (operands.length !== 3) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);


                // Check if operands are valid
                if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}.`);
                if (!isRegister(operands[1])) throw new Error(`Invalid register: ${operands[1]}.`);
                if (operands[2].trim() == '') throw new Error(`Immediate value is empty.`);
                if (!isValue(operands[2])) throw new Error(`Invalid immediate value: ${operands[2]}.`);
                imm = parseInt(operands[2]);
                if (isXBit(imm, 16)) throw new Error(`Immediate value out of range: ${operands[2]}.`);
                [rd, rs] = [getRegisterNumber(operands[0]), getRegisterNumber(operands[1])];
            }

            // Check if registers are valid
            if (!isValidRegister(rd)) throw new Error(`Invalid register: ${operands[0]}.`);
            if (!isValidRegister(rs)) throw new Error(`Invalid register: ${operands[1]}.`);
            if (isXBit(imm, 16)) throw new Error(`Immediate value out of range: ${operands[1]}.`);

            encodedInstruction = {
                opcode: instructionOpcode,
                rs: rs,
                rd: rd,
                imm: imm
            }
        }

            break;
        case InstructionType.J:

            if (mnemonic === "HALT") return { opcode: instructionOpcode, address: 0 } as InstructionJ;

            if (operands.length !== 1) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);

            // Check if operand is a value or a label
            let address: number;
            if (isLabel(operands[0])) {
                if (!labels.has(operands[0])) throw new Error(`Invalid label: ${operands[0]}.`);
                address = labels.get(operands[0]) as number;
                console.log('Address', address);

            } else {
                if (!isValue(operands[0])) throw new Error(`Invalid address: ${operands[1]}.`);
                address = parseInt(operands[1]);
            }
            if (isXBit(address, 26)) throw new Error(`Address out of range: ${operands[1]}.`);

            encodedInstruction = {
                opcode: instructionOpcode,
                address: address
            }
            break;

        default:
            throw new Error(`Invalid instruction type: ${instructionDef.type}.`);
    }
    return encodedInstruction;
}


export function assemble(program: string): { memory: Memory, labels: Map<string, number> } | never[] {
    let errors: string[] = []
    let line = 0;

    const programLines = program.replace(/\r/g, '\n').split('\n').map(line => line.trim());
    let encodedInstructions: (InstructionR | InstructionI | InstructionJ)[] = [];

    // Collect labels
    let labels: Map<string, number> = new Map();
    try {
        labels = collectLabels(programLines) as Map<string, number>;
    } catch (error) {
        errors.push(error as string);
    }

    programLines.forEach((instruction) => {
        line++;
        if (instruction.trim().endsWith(':')) return;
        let encodedInstruction;
        try {
            encodedInstruction = encodeInstruction(instruction, labels);
            encodedInstructions.push(encodedInstruction);
        } catch (error: any) {
            errors.push("Syntax Error on line " + line + ": " + error.message);
        }


    });
    if (errors.length) {
        console.log('Errors', errors);
        throw errors;
    }
    // Add A HALT and 4 NOP instructions to the end of the program
    encodedInstructions.push(encodeInstruction("HALT", labels) as InstructionJ);
    encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
    encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
    encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
    encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
    encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);

    const memory: Memory = { instructions: encodedInstructions, data: [] };

    return { memory, labels: labels };
}