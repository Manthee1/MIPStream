/** @format */

export interface InstructionTypeConfig {
	type: string;
	description: string;
	fields: string[];
	default_field_values?: { [field: string]: number };
	default_operands?: InstructionOperandConfig[];
}

export type field_types = "register" | "raw_value" | "label_absolute" | "label_relative" | "memory_address";

export interface AssemblerFieldConfig {
	field: string;
	label: string;
	def_type: field_types;
	bits: number;
	ranges: [number, number][];
}

export interface AssemblerConfig {
	fields: AssemblerFieldConfig[];
	instruction_types: InstructionTypeConfig[];
	instruction_set_config: InstructionConfig[];
}

export const MIPS_ASSEMBLER_FIELDS_CONFIG: AssemblerConfig["fields"] = [
	{
		field: "opcode",
		label: "Operation Code",
		def_type: "raw_value",
		bits: 6,
		ranges: [[0, 5]],
	},
	{
		field: "rs",
		label: "Source Register",
		def_type: "register",
		bits: 5,
		ranges: [[6, 10]],
	},
	{
		field: "rt",
		def_type: "register",
		label: "Target Register",
		bits: 5,
		ranges: [[11, 15]],
	},
	{
		field: "rd",
		def_type: "register",
		label: "Destination Register",
		bits: 5,
		ranges: [[16, 20]],
	},
	{
		field: "imm",
		def_type: "raw_value",
		label: "Immediate Value",
		bits: 16,
		ranges: [[16, 31]],
	},
	{
		field: "shamt",
		def_type: "raw_value",
		label: "Shift Amount",
		bits: 5,
		ranges: [[21, 25]],
	},
	{
		field: "funct",
		def_type: "raw_value",
		label: "Function Code",
		bits: 6,
		ranges: [[26, 31]],
	},
	{
		field: "address",
		def_type: "raw_value",
		label: "Jump Address",
		bits: 26,
		ranges: [[6, 31]],
	},
];
// First string is the field name, second is the type of the field (optional), third is additional info (optional, e.g., for memory_address, it could be the base register)
export type InstructionOperandConfig = [string, field_types?, string?];

export interface InstructionConfig {
	mnemonic: string;
	type?: string;
	description?: string;
	operands: InstructionOperandConfig[];
	field_values?: { [field: string]: number };
}

export const baseInstructionConfig: InstructionConfig[] = [
    {
        field_values: { opcode: 0x00, funct: 0x20 },
        mnemonic: "add",
        type: "R",
        operands: [["rs"], ["rt"], ["rd"]],
        description: "Add two registers and store the result in a destination register.",
    },
    {
        mnemonic: "addi",
        type: "I",
        operands: [["rs"], ["rt"], ["imm"]],
        description: "Add an immediate value to a register and store the result in a destination register.",
        field_values: { opcode: 0x08 },
    },
    {
        field_values: { opcode: 0x23 },
        mnemonic: "beq",
        type: "I",
        operands: [["rs"], ["rt"], ["imm", "label_relative"]],
        description: "Branch to a label if two registers are equal.",
    },
    {
        mnemonic: "lw",
        type: "I",
        operands: [["rt"], ["imm", "memory_address","rs"]],
        description: "Load a word from memory into a register.",
        field_values: { opcode: 0x23 },
    },
    {
        mnemonic: "sw",
        type: "I",
        operands: [["rt"], ["imm", "memory_address","rs"]],
        description: "Store a word from a register into memory.",
        field_values: { opcode: 0x2B },
    },
    {
        field_values: { opcode: 0x00, funct: 0x00 },
        mnemonic: "nop",
        type: "R",
        operands: [["rs"], ["rt"], ["rd"]],
        description: "No operation. This instruction does nothing and is often used for timing or alignment purposes.",
    },
];

export const defaultInstructionConfig: AssemblerConfig = {
	fields: MIPS_ASSEMBLER_FIELDS_CONFIG,
	instruction_types: [
		{ type: "R", description: "Register-type instruction", fields: ["opcode", "rs", "rt", "rd", "shamt", "funct"], default_field_values: { opcode: 0 }, default_operands: [["rs"], ["rt"], ["rd"]] },
		{ type: "I", description: "Immediate-type instruction", fields: ["opcode", "rs", "rt", "imm"] },
		{ type: "J", description: "Jump-type instruction", fields: ["opcode", "address"] },
	],
	instruction_set_config: baseInstructionConfig,
};
