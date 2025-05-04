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


    encodeInstruction(instruction: string, labels: Map<string, number>, dataMemoryReferences: Map<string, number>, pc: number): number {
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

        const expectedOperandsLength = instructionDef.operands.filter((operand) => operand !== 'NONE').length;

        // Check if the number of operands is correct
        if (operands.length !== expectedOperandsLength) {
            throw new Error(`Invalid number of operands for instruction ${mnemonic}. Expected ${expectedOperandsLength}, got ${operands.length}.`);
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

                // Check if the operand is a variable in dataMemoryReferences or an effective address
                const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
                console.log(operand);

                const isEffectiveAddressEvaluated = isEffectiveAddress(operand);
                console.log(isEffectiveAddressEvaluated, operand);

                if (!variableRegex.test(operand) && !isEffectiveAddressEvaluated)
                    throw new Error(`Invalid address: ${operand}.`);

                // If its a variable, get the address from dataMemoryReferences
                let temp;
                if (isEffectiveAddressEvaluated) {
                    [rs, temp] = [getEffectiveAddressRegister(operand), getEffectiveAddressImm(operand)];
                    if (operand.startsWith('0b')) temp = parseInt(operand.slice(2), 2);
                    if (isXBitSigned(temp, 16)) throw new Error(`Address immediate value must be a 16-bit signed integer: ${temp}.`);
                    else imm = temp;
                }
                if (!dataMemoryReferences.has(operand))
                    throw new Error(`Invalid address or variable: ${operand}.`);
                imm = dataMemoryReferences.get(operand) as number;
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



        // Determine the line numbers for the data and text sections
        let dataSectionLine = -1;
        let textSectionLine = -1;

        let programLines = getProgramLines(program);
        let encodedInstructions: Uint32Array = new Uint32Array(programLines.length);


        programLines.forEach((lineContent, index) => {
            if (lineContent.trim() === '.data' && dataSectionLine === -1) {
                dataSectionLine = index;
            }
            if (lineContent.trim() === '.text' && textSectionLine === -1) {
                textSectionLine = index;
            }
        });

        // Make sure the data section is before the text section
        if (dataSectionLine !== -1 && textSectionLine !== -1 && dataSectionLine > textSectionLine) {
            errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, dataSectionLine, `Data section must be defined before text section.`));
            throw errors;
        }

        // Split the program into data and text sections.
        let dataSection = programLines.slice(dataSectionLine + 1, textSectionLine);
        let textSection = programLines.slice(textSectionLine + 1);


        // parse all the values in the data section
        let memory: Array<number> = [];
        const dataMemoryReferences: Map<string, number> = new Map<string, number>();

        if (dataSectionLine !== -1)
            dataSection.forEach((lineContent, line) => {

                // Syntax: variableName: .dataType value
                // Data types: .word, .byte, .half
                // Ignore comments
                if (lineContent.trim() === '') return;
                if (lineContent.trim().startsWith(';')) return;

                // The line must start with a valid unique variable name
                const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*:/;
                if (!variableRegex.test(lineContent)) {
                    errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Invalid variable name: ${lineContent} on line ${line + 1}.`));
                    return;
                }

                const variableName = lineContent.split(':')[0].trim();
                if (dataMemoryReferences.has(variableName)) {
                    errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Duplicate variable name: ${variableName} on line ${line + 1}.`));
                    return;
                }

                dataMemoryReferences.set(variableName, 0);
                const dataType = lineContent.split(':')[1].trim().split(' ')[0];
                const value = lineContent.split(':')[1].trim().split(' ')[1];
                const dataTypeSizeMap: { [key: string]: number } = {
                    '.byte': 1,
                    '.half': 2,
                    '.word': 4,
                };
                if (!dataTypeSizeMap[dataType]) {
                    errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Invalid data type: ${dataType} on line ${line + 1}.`));
                    return;
                }
                if (!isValue(value)) {
                    errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Invalid value: ${value} on line ${line + 1}.`));
                    return;
                }

                let temp = parseInt(value);
                if (value.startsWith('0b')) temp = parseInt(value.slice(2), 2);
                if (isXBitSigned(temp, dataTypeSizeMap[dataType] * 8)) {
                    errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, `Value must be a ${dataTypeSizeMap[dataType] * 8}-bit signed integer: ${value} on line ${line + 1}.`));
                    return;
                }

                // Split value into bytes and add to the data section values
                let bytes = [];
                for (let i = 0; i < dataTypeSizeMap[dataType]; i++) {
                    bytes.push((temp >> (i * 8)) & 0xFF);
                }

                // Add the bytes to the data section values
                memory.push(...bytes);
                // Add the variable name to the data memory references
                dataMemoryReferences.set(variableName, memory.length - dataTypeSizeMap[dataType]);
            });

        console.log(memory, dataMemoryReferences);



        // Handle labels first because they are used in the encoding of instructions
        let labels = new Map<string, number>();
        let pc = 0;
        for (let i = 0; i < textSection.length; i++) {
            const lineContent = textSection[i];
            if (this.mnemonics.has(lineContent.split(" ")[0])) {
                pc++;
                continue;
            }
            if (!lineContent.trim().endsWith(':')) continue;
            const label = lineContent.slice(0, -1);
            // Check if the label is valid
            if (!isLabel(label)) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, textSectionLine + i, `Invalid label format: ${lineContent} on line ${i + 1}.`));
                continue;
            }

            // if it is a duplicate label add to errors
            if (labels.has(label)) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, i, `Duplicate label: ${label} on line ${i + 1}.`));
                continue;
            }

            labels.set(label, pc);
        }



        // Encode instructions
        let pcLineMap: number[] = [];
        let line = textSectionLine + 1;
        pc = 0;
        for (let i = 0; i < textSection.length; i++) {
            const instruction = textSection[i];
            line++;
            if (instruction.trim() === '') continue;
            if (instruction.trim().startsWith(';')) continue;
            if (instruction.trim().endsWith(':')) continue;
            let encodedInstruction;
            try {
                encodedInstruction = this.encodeInstruction(instruction, labels, dataMemoryReferences, pc);
                encodedInstructions[pc] = encodedInstruction;
            } catch (error: any) {
                errors.push(new AssemblerError(ErrorType.SYNTAX_ERROR, line, error.message));
            }
            pcLineMap[pc] = line;
            pc++;
        }
        if (errors.length) {
            console.log('Errors', errors);
            throw errors;
        }

        // Resize the array to the number of instructions
        encodedInstructions = encodedInstructions.slice(0, pc);

        return { instructions: encodedInstructions, pcLineMap, labels: labels, memory: memory, dataMemoryReferences: dataMemoryReferences };
    }

}