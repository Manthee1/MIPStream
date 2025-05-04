import { getDefaultInstructionDefOperands, getEffectiveAddressImm, getEffectiveAddressRegister, getProgramLines, getRegisterNumber, isEffectiveAddress, isLabel, isMnemonic, isRegister, isValidRegister, isValue, isXBit, isXBitSigned, } from "../utils"
import { AssemblerError, AssemblerErrorList, ErrorType } from "../errors";

export class Assembler {
    INSTRUCTION_SET: InstructionConfig[];
    mnemonics: Set<string>;
    options: any = {
        registerPrefix: '$',
    };
    constructor(INSTRUCTION_SET: InstructionConfig[], options: any = {}) {
        this.INSTRUCTION_SET = INSTRUCTION_SET;
        this.mnemonics = new Set(INSTRUCTION_SET.map((instruction) => instruction.mnemonic));
        this.options = { ...this.options, ...options };
    }

    getOperands(instruction: string): string[] {
        // split the string on a comma or space
        return instruction.split(/,|\s/).slice(1).filter((operand) => operand !== '');
    }


    encodeInstruction(instruction: string, labels: Map<string, number>, pc: number): number {
        const mnemonic = instruction.split(" ")[0];
        const operands = this.getOperands(instruction);
        // If the instruction NOP, return a NOP instruction
        if (mnemonic === "NOP")
            return 0;

        const instructionIndex = this.INSTRUCTION_SET.findIndex((instructionDef) => instructionDef.mnemonic === mnemonic);

        if (instructionIndex == -1) throw new Error(`Invalid instruction: ${mnemonic}.`);


        const instructionDef = this.INSTRUCTION_SET[instructionIndex];
        const instructionOpcode = instructionDef.opcode;

        let encodedInstruction: number = 0;
        if (!instructionDef.operands) {
            // Add operand config if not present
            instructionDef.operands = getDefaultInstructionDefOperands(instructionDef);
        }


        // IF the instruction is a LOAD or STORE instruction, the operands are different so convert them to the standard operands
        // if (instructionDef.controlSignals.MemRead == 1 || instructionDef.controlSignals.MemWrite == 1) {
        //     if (operands.length !== 2) throw new Error(`Invalid number of operands for instruction ${mnemonic}.`);

        //     // Check if operands are valid
        //     if (!isRegister(operands[0])) throw new Error(`Invalid register: ${operands[0]}.`);
        //     if (!isEffectiveAddress(operands[1])) throw new Error(`Invalid effective address: ${operands[1]}.`);
        //     const [rs, imm] = [getEffectiveAddressRegister(operands[1]), getEffectiveAddressImm(operands[1])];

        //     operands[1] = rs.toString();
        //     operands.push(imm.toString());
        // }

        const expoectedOperandsLength = instructionDef.operands.filter((operand) => operand !== 'NONE').length;

        // Check if the number of operands is correct
        if (operands.length !== expoectedOperandsLength) {
            throw new Error(`Invalid number of operands for instruction ${mnemonic}. Expected ${expoectedOperandsLength}, got ${operands.length}.`);
        }


        let rs = 0;
        let rt = 0;
        let rd = 0;
        let imm = 0;
        let addr = 0;
        let shamt = 0;
        let funct = 0;


        let regSourceCount = 0;


        for (let i = 0; i < operands.length; i++) {
            const operand = operands[i];
            const operandType = instructionDef.operands[i];

            if (operandType === 'REG_SOURCE' || operandType === 'REG_DESTINATION' || operandType === 'REG_TARGET') {
                if (!isRegister(operand, this.options.registerPrefix)) throw new Error(`Invalid register: ${operand}.`);
                if (!isValidRegister(getRegisterNumber(operand))) throw new Error(`Invalid register: ${operand}.`);
                const value = getRegisterNumber(operand);
                switch (operandType) {
                    case 'REG_SOURCE': rs = value; break;
                    case 'REG_TARGET': rt = value; break;
                    case 'REG_DESTINATION': rd = value; break;
                    default: break;
                }
            }
            else if (operandType === 'IMMEDIATE') {
                if (!isValue(operand)) throw new Error(`Invalid immediate value: ${operand}.`);
                let temp = parseInt(operand);
                if (operand.startsWith('0b')) temp = parseInt(operand.slice(2), 2);
                if (isXBitSigned(temp, 16)) throw new Error(`Immediate value must be a 16-bit signed integer: ${operand}.`);
                // CHeck if the immediate value is binary
                // else if (operand.startsWith('0x')) imm = parseInt(operand.slice(2), 16);
                else imm = temp;
            } else if (operandType === "LABEL") {
                if (!isLabel(operand)) throw new Error(`Invalid label: ${operand}.`);
                if (!labels.has(operand)) throw new Error(`Invalid label: ${operand}.`);
                const value = labels.get(operand) as number;
                addr = value;
                imm = value - pc - 1;
            } else if (operandType === "MEM_ADDRESS") {
                if (!isEffectiveAddress(operand)) throw new Error(`Invalid effective address: ${operand}.`);
                let temp;
                [rs, temp] = [getEffectiveAddressRegister(operand), getEffectiveAddressImm(operand)];

                if (operand.startsWith('0b')) temp = parseInt(operand.slice(2), 2);
                if (isXBitSigned(temp, 16)) throw new Error(`Address immediate value must be a 16-bit signed integer: ${temp}.`);
                else imm = temp;

            } else throw new Error(`Invalid operand type: ${operandType}.`);
        }



        if (instructionDef.type === 'R') {
            funct = instructionDef.funct as number;
            encodedInstruction = (instructionOpcode << 26) | (rs << 21) | (rt << 16) | (rd << 11) | (shamt << 6) | funct;
        } else if (instructionDef.type === 'I') {
            if (instructionDef.controlSignals.RegWrite == 1) rt = rd;
            encodedInstruction = (instructionOpcode << 26) | (rs << 21) | (rt << 16) | (imm & 0xFFFF);
        } else if (instructionDef.type === 'J') {
            encodedInstruction = (instructionOpcode << 26) | (addr & 0x3FFFFFF);
        } else throw new Error(`Invalid instruction type: ${instructionDef.type}.`);


        return encodedInstruction;
    }


    public assemble(program: string) {
        let errors: AssemblerErrorList = new AssemblerErrorList([]);

        const programLines = getProgramLines(program);
        let encodedInstructions: Uint32Array = new Uint32Array(programLines.length);


        // Handle labels first because they are used in the encoding of instructions
        let labels = new Map<string, number>();
        let pc = 0;
        programLines.forEach((lineContent, line) => {
            if (this.mnemonics.has(lineContent.split(" ")[0])) {
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

        console.log(labels);



        // Encode instructions
        let pcLineMap: number[] = [];
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
                encodedInstructions[pc] = encodedInstruction;
            } catch (error: any) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, error.message));
            }
            pcLineMap[pc] = line;
            pc++;
        });
        if (errors.length) {
            console.log('Errors', errors);
            throw errors;
        }

        // Resize the array to the number of instructions
        encodedInstructions = encodedInstructions.slice(0, pc);

        return { instructions: encodedInstructions, pcLineMap, labels: labels };
    }

}