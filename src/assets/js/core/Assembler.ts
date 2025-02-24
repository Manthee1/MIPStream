import { Memory } from "../interfaces/core"
import { getEffectiveAddressImm, getEffectiveAddressRegister, getRegisterNumber, isEffectiveAddress, isLabel, isMnemonic, isRegister, isValidRegister, isValue, isXBit, } from "../utils"
import { AssemblerError, AssemblerErrorList, ErrorType } from "../errors";
import { OperandRole, OperandType } from "../types/enums";

export class Assembler {
    INSTRUCTION_SET: InstructionConfig[];

    constructor(INSTRUCTION_SET: InstructionConfig[]) {
        this.INSTRUCTION_SET = INSTRUCTION_SET;
    }

    getOperands(instruction: string): string[] {
        // split the string on a comma or space
        return instruction.split(/,|\s/).slice(1).filter((operand) => operand !== '');
    }


    encodeInstruction(instruction: string, labels: Map<string, number>, pc: number): InstructionR | InstructionI | InstructionJ {
        const mnemonic = instruction.split(" ")[0];
        const operands = this.getOperands(instruction);
        // If the instruction NOP, return a NOP instruction
        if (mnemonic === "NOP")
            return { opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI;

        const instructionOpcode = this.INSTRUCTION_SET.findIndex((instructionDef) => instructionDef.mnemonic === mnemonic);

        if (instructionOpcode == -1) throw new Error(`Invalid instruction: ${mnemonic}.`);

        const instructionDef = this.INSTRUCTION_SET[instructionOpcode];

        let encodedInstruction: InstructionR | InstructionI | InstructionJ = {} as InstructionR | InstructionI | InstructionJ;
        if (!this.INSTRUCTION_SET[instructionOpcode].operands) throw new Error(`Instruction ${mnemonic} is not configured correctly.`);


        // IF the instruction is a LOAD or STORE instruction, the operands are different so convert them to the standard operands
        if (false) {
            if (operands.length !== 2) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);

            // Check if operands are valid
            if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}.`);
            if (!isEffectiveAddress(operands[1])) throw new Error(`Invalid effective address: ${operands[1]}.`);
            const [rs, imm] = [getEffectiveAddressRegister(operands[1]), getEffectiveAddressImm(operands[1])];

            operands[1] = rs.toString();
            operands.push(imm.toString());
        }

        // Check if the number of operands is correct
        const expectedOperandCount = this.INSTRUCTION_SET[instructionOpcode].operands.filter((operand) => operand.type !== OperandType.UNUSED).length;
        if (operands.length !== expectedOperandCount) {
            throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);
        }


        let decodedValues = [0, 0, 0]
        let isFirstSourceOperand = true;

        console.log('operands', operands);


        let index = 0;
        this.INSTRUCTION_SET[instructionOpcode].operands.forEach((operand) => {
            if (operand.type === OperandType.UNUSED) return;

            let value = 0;
            if (operand.type === OperandType.REGISTER) {
                if (!isRegister(operands[index])) throw new Error(`Invalid register: ${operands[index]}.`);
                if (!isValidRegister(getRegisterNumber(operands[index]))) throw new Error(`Invalid register: ${operands[index]}.`);
                value = getRegisterNumber(operands[index]);
            }
            else if (operand.type === OperandType.IMMEDIATE) {
                if (!isValue(operands[index])) throw new Error(`Invalid immediate value: ${operands[index]}.`);
                if (isXBit(parseInt(operands[index]), 16)) throw new Error(`Immediate value out of range: ${operands[index]}.`);
                value = parseInt(operands[index]);
            } else if (operand.type === OperandType.LABEL) {
                console.log('Label index', index);

                if (!isLabel(operands[index])) throw new Error(`Invalid label: ${operands[index]}.`);
                if (!labels.has(operands[index])) throw new Error(`Invalid label: ${operands[index]}.`);
                value = labels.get(operands[index]) as number;
                value = value - pc - 3;
            } else throw new Error(`Invalid operand type: ${operand.type}.`);

            index++;


            if (operand.role === OperandRole.DESTINATION) {
                decodedValues[0] = value;
                return;
            }
            if (operand.role === OperandRole.SOURCE) {
                if (isFirstSourceOperand == true) {
                    isFirstSourceOperand = false;
                    decodedValues[1] = value;
                    return;
                }
                decodedValues[2] = value;
                return;
            }
            if (operand.role === OperandRole.IMMEDIATE) {
                decodedValues[2] = value;
            }
        });

        console.log('Decoded values', decodedValues);



        switch (instructionDef.type) {
            case 'R':
                encodedInstruction = {
                    opcode: instructionOpcode,
                    rd: decodedValues[0],
                    rs1: decodedValues[1],
                    rs2: decodedValues[2],
                } as InstructionR;
                break;
            case 'I':
                encodedInstruction = {
                    opcode: instructionOpcode,
                    rd: decodedValues[0],
                    rs: decodedValues[1],
                    imm: decodedValues[2],
                } as InstructionI;
                break;
            case 'J':
                encodedInstruction = {
                    opcode: instructionOpcode,
                    offset: decodedValues[0],
                } as InstructionJ;
                break;
        }

        return encodedInstruction;
    }


    public assemble(program: string): { memory: Memory, labels: Map<string, number> } | never {
        let errors: AssemblerErrorList = new AssemblerErrorList([]);

        const programLines = program.replace(/\r/g, '').replace(/\r/g, '\n').split('\n').map(line => line.trim());
        let encodedInstructions: (InstructionR | InstructionI | InstructionJ)[] = [];


        // Handle labels first because they are used in the encoding of instructions
        let labels = new Map<string, number>();
        let pc = 0;
        programLines.forEach((lineContent, line) => {
            if (isMnemonic(lineContent.split(" ")[0])) {
                pc++
                return;
            }
            if (!lineContent.trim().endsWith(':')) return;
            const label = lineContent.slice(0, -1);
            // Check if the label is valid
            if (!isLabel(label)) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Invalid label format: ${lineContent} on line ${line + 1}.`));
                return;
            }

            // if it is a duplicate label add to errors
            if (labels.has(label)) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Duplicate label: ${label} on line ${line + 1}.`));
                return;
            }

            labels.set(label, pc);
        });


        // Encode instructions
        let line = 0;
        pc = 0;
        programLines.forEach((instruction) => {
            line++;
            if (instruction.trim() === '') return;
            if (instruction.trim().startsWith(';')) return;
            if (instruction.trim().endsWith(':')) return;
            let encodedInstruction;
            try {
                encodedInstruction = this.encodeInstruction(instruction, labels, pc);
                encodedInstructions.push(encodedInstruction);
            } catch (error: any) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, error.message));
            }
            pc++;
        });
        if (errors.length) {
            console.log('Errors', errors);
            throw errors;
        }
        // Add A HALT and 4 NOP instructions to the end of the program
        encodedInstructions.push(this.encodeInstruction("HALT", labels, pc) as InstructionJ);
        encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);
        encodedInstructions.push({ opcode: 0, rs: 0, rd: 0, imm: 0 } as InstructionI);

        const memory: Memory = { instructions: encodedInstructions, data: [] };

        return { memory, labels: labels };
    }

}