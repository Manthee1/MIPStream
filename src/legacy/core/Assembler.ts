/** @format */

import { extractOperands, getEffectiveAddressImm, getEffectiveAddressRegister, getProgramLines, getRegisterNumber, isEffectiveAddress, isLabel, isMnemonic, isRegister, isValidRegister, isValue, isXBit, isXBitSigned, toSigned } from "../assets/js/utils";
import { AssemblerError, AssemblerErrorList, ErrorType } from "../utils/errors";

interface AssemblerOptions {
	registerPrefix: string;
}

export class Assembler {
	config: AssemblerConfig;
	instruction_types: Record<string, InstructionTypeConfig> = {};
	fields_config: Record<string, AssemblerFieldConfig> = {};
	mnemonics: Set<string>;
	options: AssemblerOptions = {
		registerPrefix: "$",
	};
	errors: AssemblerErrorList = new AssemblerErrorList([]);

	public static dataDirectivesSizeMap: { [key: string]: number } = {
		".byte": 1,
		".half": 2,
		".word": 4,
	};

	constructor(ASSEMBLER_CONFIG: AssemblerConfig, options: Partial<AssemblerOptions> = {}) {
		this.config = ASSEMBLER_CONFIG;
		this.mnemonics = new Set(this.config.instruction_set_config.map((instruction) => instruction.mnemonic));
		this.options = { ...this.options, ...options };

		this.config.fields.forEach((fieldConfig) => {
			this.fields_config[fieldConfig.field] = fieldConfig;
		});

		this.config.instruction_types.forEach((instructionType) => {
			this.instruction_types[instructionType.type] = instructionType;
		});
	}

	private addError(type: ErrorType, lineNumber: number, message: string) {
		this.errors.push(new AssemblerError(type, lineNumber, message));
	}

	// Map the operands to their respective fields based on the instruction type and definition
	private mapOperandsToFields(instructionDef: InstructionConfig, operands: string[], labels: Map<string, number>, dataMemoryReferences: Map<string, number>, pc: number): { [field: string]: number } {
		const fieldValues: { [field: string]: number } = { ...instructionDef.field_values };
		for (let i = 0; i < operands.length; i++) {
			const operandValue = operands[i];
			const fieldName = instructionDef.operands[i][0]; // Get the field name from the instruction definition
			const defaultFieldType = this.fields_config[fieldName].def_type;
			const operandType = instructionDef.operands[i][1] || defaultFieldType;

			switch (operandType) {
				case "register":
					if (!isRegister(operandValue)) throw new Error(`Invalid register: ${operandValue}.`);
					const registerNumber = getRegisterNumber(operandValue);
					fieldValues[fieldName] = registerNumber;
					break;
				case "raw_value":
					if (!isValue(operandValue)) throw new Error(`Invalid raw value: ${operandValue}.`);
					let temp = parseInt(operandValue);
					if (operandValue.startsWith("0b")) temp = parseInt(operandValue.slice(2), 2);
					if (!isXBitSigned(temp, this.fields_config[fieldName].bits)) throw new Error(`Value must be a ${this.fields_config[fieldName].bits}-bit signed integer: ${temp}.`);
					fieldValues[fieldName] = temp;
					break;
				case "label_absolute":
					if (!isLabel(operandValue)) throw new Error(`Invalid label: ${operandValue}.`);
					if (!labels.has(operandValue)) throw new Error(`Undefined label: ${operandValue}.`);
					const absoluteAddress = labels.get(operandValue) as number;
					fieldValues[fieldName] = absoluteAddress;
					break;
				case "label_relative":
					if (!isLabel(operandValue)) throw new Error(`Invalid label: ${operandValue}.`);
					if (!labels.has(operandValue)) throw new Error(`Undefined label: ${operandValue}.`);
					const relativeAddress = labels.get(operandValue) as number;
					const offset = relativeAddress - pc - 1;

					// check if the relative address is within the range of the field
					if (!isXBitSigned(offset, this.fields_config[fieldName].bits)) throw new Error(`Label too far away from current instruction: ${operandValue}. Must be within ${Math.pow(2, this.fields_config[fieldName].bits - 1)} instructions.`);
					fieldValues[fieldName] = offset;
					break;
				case "memory_address":
					// Check if the operand is a variable in dataMemoryReferences or an effective address
					const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
					const isEffectiveAddressEvaluated = isEffectiveAddress(operandValue);

					if (!variableRegex.test(operandValue) && !isEffectiveAddressEvaluated) throw new Error(`Invalid address or data label: ${operandValue}.`);

					// If its a variable, get the address from dataMemoryReferences
					if (isEffectiveAddressEvaluated) {
						let [source, temp] = [getEffectiveAddressRegister(operandValue), getEffectiveAddressImm(operandValue)];
						if (operandValue.startsWith("0b")) temp = parseInt(operandValue.slice(2), 2);
						if (!isXBit(temp, this.fields_config[fieldName].bits)) throw new Error(`Value must be a ${this.fields_config[fieldName].bits}-bit signed integer: ${temp}.`);

						// Get the base register from the instruction definition
						const sourceField = instructionDef.operands[i][2];
						if (!sourceField) throw new Error(`Invalid instruction set config: Missing base register for memory address operand: ${operandValue}.`);

						// Check if the source register is valid
						fieldValues[sourceField] = source;
						fieldValues[fieldName] = temp;
						break;
					}
					// If its a data label, get the address from dataMemoryReferences
					if (!dataMemoryReferences.has(operandValue)) throw new Error(`Undefined data label: ${operandValue}.`);
					const address = dataMemoryReferences.get(operandValue) as number;
					fieldValues[fieldName] = address;
					break;
			}
		}
		return fieldValues;
	}

	encodeInstruction(instruction: string, labels: Map<string, number>, dataMemoryReferences: Map<string, number>, pc: number): number {
		const mnemonic = instruction.split(" ")[0];
		const operands = extractOperands(instruction);
		// If the instruction NOP, return a NOP instruction

		const instructionIndex = this.config.instruction_set_config.findIndex((instructionDef) => instructionDef.mnemonic === mnemonic);

		if (instructionIndex == -1) throw new Error(`Invalid instruction: ${mnemonic}.`);

		const instructionDef = this.config.instruction_set_config[instructionIndex];

		let encodedInstruction: number = 0;

		const expectedOperandsLength = instructionDef.operands.length;

		// Check if the number of operands is correct
		if (operands.length !== expectedOperandsLength) {
			throw new Error(`Invalid number of operands for instruction ${mnemonic}. Expected ${expectedOperandsLength}, got ${operands.length}.`);
		}

		const fieldValues = this.mapOperandsToFields(instructionDef, operands, labels, dataMemoryReferences, pc);

		// Encode the instruction based on the field values and their respective bit positions
		this.config.fields.forEach((fieldConfig) => {
			const fieldValue = fieldValues[fieldConfig.field] ?? 0;
			// Map bits from fieldValue to the correct ranges of the encoded instruction
			// If there are two ranges, the first range is the lower bits and the second range is the higher bits
			let fieldValueIndex = 0;
			fieldConfig.ranges.forEach((range, index) => {
				const [start, end] = range;
				const rangeLength = end - start + 1;
				const mask = (1 << rangeLength) - 1;
				const bitsToSet = (fieldValue >> fieldValueIndex) & mask;

				encodedInstruction |= bitsToSet << start;
				fieldValueIndex += rangeLength;
			});
		});

		return encodedInstruction >>> 0; // Ensure it's treated as an unsigned 32-bit integer
	}

	public sections(program: string): {
		dataSection: string[];
		textSection: string[];
		dataSectionLine: number;
		textSectionLine: number;
	} {
		// Determine the line numbers for the data and text sections
		let dataSectionLine = -1;
		let textSectionLine = -1;

		let programLines = getProgramLines(program);

		programLines.forEach((lineContent, index) => {
			if (lineContent.trim() === ".data" && dataSectionLine === -1) {
				dataSectionLine = index;
			}
			if (lineContent.trim() === ".text" && textSectionLine === -1) {
				textSectionLine = index;
			}
		});

		if (dataSectionLine !== -1) {
			// Make sure that the text section is defined if the data section is defined
			if (textSectionLine === -1) {
				this.addError(ErrorType.SYNTAX_ERROR, dataSectionLine, `Text section must be defined after data section.`);
			}

			// Make sure the data section is before the text section
			if (dataSectionLine > textSectionLine) {
				this.addError(ErrorType.SYNTAX_ERROR, dataSectionLine, `Data section must be defined before text section.`);
			}
		}

		// Split the program into data and text sections.
		let dataSection = programLines.slice(dataSectionLine + 1, textSectionLine);
		let textSection = programLines.slice(textSectionLine + 1);

		return { dataSection, textSection, dataSectionLine, textSectionLine };
	}

	public parseDataSection(dataSection: string[], dataSectionLine: number): { memory: Array<number>; dataMemoryReferences: Map<string, number> } {
		// parse all the values in the data section
		let memory: Array<number> = [];
		const dataMemoryReferences: Map<string, number> = new Map<string, number>();

		if (dataSection.length === 0) return { memory, dataMemoryReferences };

		dataSection.forEach((lineContent, line) => {
			// Syntax: variableName: .directive value
			// Diresctives: .word, .byte, .half
			// Ignore comments
			if (lineContent.trim() === "") return;
			if (lineContent.trim().startsWith(";")) return;

			// The line must start with a valid unique data label
			const variableRegex = /^[a-zA-Z_][a-zA-Z0-9_]*:/;
			if (!variableRegex.test(lineContent)) {
				this.addError(ErrorType.SYNTAX_ERROR, line, `Invalid data label: ${lineContent} on line ${line + 1}.`);
				return;
			}

			const dataLabel = lineContent.split(":")[0].trim();
			if (dataMemoryReferences.has(dataLabel)) {
				this.addError(ErrorType.SYNTAX_ERROR, line, `Duplicate data label: ${dataLabel} on line ${line + 1}.`);
				return;
			}

			dataMemoryReferences.set(dataLabel, 0);
			const directive = lineContent.split(":")[1].trim().split(" ")[0];
			const value = lineContent.split(":")[1].trim().split(" ")[1];

			if (!Assembler.dataDirectivesSizeMap[directive]) {
				this.addError(ErrorType.SYNTAX_ERROR, line, `Invalid driective: ${directive} on line ${line + 1}.`);
				return;
			}
			if (!isValue(value)) {
				this.addError(ErrorType.SYNTAX_ERROR, line, `Invalid value: ${value} on line ${line + 1}.`);
				return;
			}

			let temp = parseInt(value);
			if (value.startsWith("0b")) temp = parseInt(value.slice(2), 2);
			if (!isXBit(temp, Assembler.dataDirectivesSizeMap[directive] * 8)) {
				this.addError(ErrorType.SYNTAX_ERROR, line, `Value must be a ${Assembler.dataDirectivesSizeMap[directive] * 8}-bit signed integer: ${value} on line ${line + 1}.`);
				return;
			}

			// Split value into bytes and add to the data section values
			let bytes = [];
			for (let i = 0; i < Assembler.dataDirectivesSizeMap[directive]; i++) {
				bytes.push((temp >> (i * 8)) & 0xff);
			}

			// Add the bytes to the data section values
			memory.push(...bytes);
			// Add the variable name to the data memory references
			dataMemoryReferences.set(dataLabel, memory.length - Assembler.dataDirectivesSizeMap[directive]);
		});

		return { memory, dataMemoryReferences };
	}

	public extractLabels(textSection: string[], textSectionLine: number): Map<string, number> {
		// Handle labels first because they are used in the encoding of instructions
		let labels = new Map<string, number>();
		let pc = 0;
		for (let i = 0; i < textSection.length; i++) {
			const lineContent = textSection[i].trim();
			if (this.mnemonics.has(lineContent.split(" ")[0])) {
				pc++;
				continue;
			}
			if (!lineContent.trim().endsWith(":")) continue;
			const label = lineContent.slice(0, -1);
			// Check if the label is valid
			if (!isLabel(label)) {
				this.addError(ErrorType.SYNTAX_ERROR, textSectionLine + i, `Invalid label format: ${lineContent} on line ${i + 1}.`);
				continue;
			}

			// if it is a duplicate label add to errors
			if (labels.has(label)) {
				this.addError(ErrorType.SYNTAX_ERROR, i, `Duplicate label: ${label} on line ${i + 1}.`);
				continue;
			}

			labels.set(label, pc);
		}

		return labels;
	}

	public encodeInstructions(textSection: string[], textSectionLine: number, labels: Map<string, number>, dataMemoryReferences: Map<string, number>): { encodedInstructions: Uint32Array; pcLineMap: number[] } {
		let encodedInstructions: Uint32Array = new Uint32Array(textSection.length);
		let pcLineMap: number[] = [];
		let line = textSectionLine + 1;
		let pc = 0;
		for (let i = 0; i < textSection.length; i++) {
			const instruction = textSection[i].trim();
			line++;
			if (instruction.trim() === "") continue;
			if (instruction.trim().startsWith(";")) continue;
			if (instruction.trim().endsWith(":")) continue;
			let encodedInstruction;
			try {
				encodedInstruction = this.encodeInstruction(instruction, labels, dataMemoryReferences, pc);
				encodedInstructions[pc] = encodedInstruction;
			} catch (error: any) {
				this.addError(ErrorType.SYNTAX_ERROR, line, error.message);
			}
			pcLineMap[pc] = line;
			pc++;
		}

		// Resize the array to the number of instructions
		encodedInstructions = encodedInstructions.slice(0, pc);

		return { encodedInstructions, pcLineMap };
	}

	public assemble(program: string) {
		const { dataSection, textSection, dataSectionLine, textSectionLine } = this.sections(program);

		const { memory, dataMemoryReferences } = this.parseDataSection(dataSection, dataSectionLine);

		const labels: Map<string, number> = this.extractLabels(textSection, textSectionLine);

		// Encode instructions
		const { encodedInstructions, pcLineMap } = this.encodeInstructions(textSection, textSectionLine, labels, dataMemoryReferences);

		if (this.errors.length) {
			console.log("Errors", this.errors);
			throw this.errors;
		}

		return { instructions: encodedInstructions, pcLineMap, labels: labels, memory: memory, dataMemoryReferences: dataMemoryReferences };
	}
}
