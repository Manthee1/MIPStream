/** @format */

import { ALUOperationstoSigns, getAluControl } from "../../core/config/alu";
import { baseInstructionConfig } from "../../core/config/instructions";

const mnemonics = new Set(baseInstructionConfig.map((instruction) => instruction.mnemonic));

export function isMnemonic(mnemonic: string): boolean {
	return mnemonics.has(mnemonic.trim());
}

export function isLabel(str: string): boolean {
	const labelPattern = /^[a-zA-Z_]\w*$/;
	return labelPattern.test(str);
}

export function extractOperands(line: string): string[] {
	return (
		line
			.split(";")[0]
			.trim()
			// Replaec every space and comma with a single space
			.replace(/[\s,]+/g, " ")
			// Split by space
			.split(" ")
			// Remove the first element (mnemonic)
			.slice(1)
			// Remove empty strings
			.map((operand) => operand.split(" ")[0])
			.filter((operand) => operand !== "")
	);
}

export function getOperandSyntax(operand: OperandType) {
	switch (operand) {
		case "REG_DESTINATION":
			return "Rd";
		case "REG_SOURCE":
			return "Rs";
		case "REG_TARGET":
			return "Rt";
		case "IMMEDIATE":
			return "imm";
		case "SHAMT":
			return "shamt";
		case "MEM_ADDRESS":
			return "imm(Rs)";
		case "LABEL":
			return "label";
		case "NONE":
			return "-";
		default:
			return "";
	}
}

export function getInstructionSyntax(instruction: InstructionSetConfig) {
	const operands = instruction.operands ?? getDefaultInstructionDefOperands(instruction);
	let operandExamples = "";
	for (let i = 0; i < operands.length; i++) {
		if (operands[i] == "NONE") continue;
		if (i > 0) operandExamples += ", ";
		operandExamples += getOperandSyntax(operands[i]);
	}

	return `${instruction.mnemonic} ${operandExamples}`;
}

export function getPseudoCode(instructionConfig: InstructionSetConfig) {
	// Construct the pseudo code based on the instruction config
	if (instructionConfig.mnemonic == "halt") return "-";
	if (instructionConfig.mnemonic == "nop") return "-";

	let out = "";
	const cs = instructionConfig.controlSignals as Record<string, number>;
	const ALUControl = getAluControl(cs["ALUOp"] ?? 0, instructionConfig?.funct ?? 0);
	let ALUOPSign = ALUOperationstoSigns[ALUControl] ?? "???";
	const operands = instructionConfig.operands ?? getDefaultInstructionDefOperands(instructionConfig);

	const Rs = operands.includes("REG_SOURCE") || operands.includes("MEM_ADDRESS") ? "Rs" : "0";
	const Rt = operands.includes("REG_TARGET") ? "Rt" : "0";
	const imm = operands.includes("IMMEDIATE") ? "imm" : "0";

	const ALUIn2 = cs["ALUSrc"] ? imm : Rt;

	if (cs["RegWrite"]) {
		const memOut = cs["MemRead"] ? `MEM[${Rs} ${ALUOPSign} ${ALUIn2}];\n` : "0";
		out += `Rd = `;
		out += cs["MemtoReg"] ? memOut : `${Rs} ${ALUOPSign} ${ALUIn2};\n`;
	}

	if (cs["MemWrite"]) {
		out += `MEM[${Rs} ${ALUOPSign} ${ALUIn2}] = Rd;\n`;
	}

	if (cs["Branch"]) {
		out += `if (${Rs} ${ALUOPSign} ${ALUIn2} == 0) PC = label;\n`;
	}
	return out;
}

export function getProgramLines(program: string): string[] {
	return program
		.replace(/\r/g, "")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((line) => line.split(";")[0].trim());
}
