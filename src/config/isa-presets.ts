/** @format */

import type { AssemblerConfig, InstructionOperandConfig } from "../shared/types/isa";

type LegacyFieldType = "register" | "constant" | "immediate" | "address";

function toFieldType(value: unknown): "register" | "raw_value" | "label_absolute" | "label_relative" | "memory_address" {
  if (value === "register") return "register";
  if (value === "label_absolute") return "label_absolute";
  if (value === "label_relative") return "label_relative";
  if (value === "memory_address") return "memory_address";
  if (value === "constant" || value === "immediate" || value === "address") return "raw_value";
  return "raw_value";
}

function normalizeRanges(ranges: unknown, bits: number, fallbackStart: number): [number, number][] {
  if (Array.isArray(ranges)) {
    const normalized = ranges
      .map((range) => {
        if (!Array.isArray(range) || range.length < 2) return null;
        const start = Number(range[0]);
        const end = Number(range[1]);
        if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
        return [Math.trunc(start), Math.trunc(end)] as [number, number];
      })
      .filter((range): range is [number, number] => !!range);
    if (normalized.length > 0) return normalized;
  }
  return [[fallbackStart, fallbackStart + Math.max(1, bits) - 1]];
}

/**
 * Migrates unknown/legacy ISA payloads into the shared AssemblerConfig shape.
 * Handles pre-range field definitions (`name` + `bits` + `type`) and old
 * `instructions` arrays.
 */
export function normalizeAssemblerConfig(raw: unknown): AssemblerConfig {
  const source = (raw ?? {}) as Record<string, unknown>;
  const rawFields = Array.isArray(source.fields) ? source.fields : [];

  let bitCursor = 0;
  const fields = rawFields.map((entry, index) => {
    const field = (entry ?? {}) as Record<string, unknown>;
    const name = String(field.field ?? field.name ?? `field${index + 1}`).trim() || `field${index + 1}`;
    const bitsValue = Number(field.bits);
    const bits = Number.isFinite(bitsValue) && bitsValue > 0 ? Math.trunc(bitsValue) : 1;
    const ranges = normalizeRanges(field.ranges, bits, bitCursor);
    bitCursor = Math.max(bitCursor + bits, ranges.reduce((max, [, end]) => Math.max(max, end + 1), bitCursor));
    const legacyType = field.type as LegacyFieldType | undefined;

    return {
      field: name,
      label: String(field.label ?? name),
      def_type: toFieldType(field.def_type ?? legacyType),
      bits,
      ranges,
    };
  });

  const rawTypes = Array.isArray(source.instruction_types) ? source.instruction_types : [];
  const instruction_types = rawTypes.map((entry, index) => {
    const type = (entry ?? {}) as Record<string, unknown>;
    const typeId = String(type.type ?? `T${index + 1}`).trim() || `T${index + 1}`;
    const typeFields = Array.isArray(type.fields) ? type.fields.map((x) => String(x)) : [];
    const defaultFieldValues =
      type.default_field_values && typeof type.default_field_values === "object"
        ? Object.fromEntries(
          Object.entries(type.default_field_values as Record<string, unknown>)
            .map(([key, value]) => [key, Number(value)])
            .filter(([, value]) => Number.isFinite(value))
        )
        : undefined;
    const defaultOperands = Array.isArray(type.default_operands)
      ? type.default_operands
        .map((operand) => (Array.isArray(operand) ? operand.slice(0, 3).map((x) => String(x)) : null))
        .filter((operand): operand is string[] => !!operand)
        .map((operand) => [operand[0], toFieldType(operand[1]), operand[2]] as InstructionOperandConfig)
      : undefined;

    return {
      type: typeId,
      description: String(type.description ?? ""),
      fields: typeFields,
      default_field_values: defaultFieldValues,
      default_operands: defaultOperands,
    };
  });

  const rawInstructions = Array.isArray(source.instruction_set_config)
    ? source.instruction_set_config
    : Array.isArray(source.instructions)
      ? source.instructions
      : [];
  const instruction_set_config = rawInstructions.map((entry, index) => {
    const instruction = (entry ?? {}) as Record<string, unknown>;
    const operands = Array.isArray(instruction.operands)
      ? instruction.operands
        .map((operand) => {
          if (Array.isArray(operand) && operand.length > 0) {
            return [
              String(operand[0]),
              operand[1] === undefined ? undefined : toFieldType(operand[1]),
              operand[2] === undefined ? undefined : String(operand[2]),
            ] as InstructionOperandConfig;
          }
          if (typeof operand === "string") return [operand] as [string];
          return null;
        })
        .filter((operand): operand is InstructionOperandConfig => !!operand)
      : [];
    const field_values =
      instruction.field_values && typeof instruction.field_values === "object"
        ? Object.fromEntries(
          Object.entries(instruction.field_values as Record<string, unknown>)
            .map(([key, value]) => [key, Number(value)])
            .filter(([, value]) => Number.isFinite(value))
        )
        : undefined;

    return {
      mnemonic: String(instruction.mnemonic ?? `op${index + 1}`),
      type: instruction.type === undefined ? undefined : String(instruction.type),
      description: instruction.description === undefined ? undefined : String(instruction.description),
      operands,
      field_values,
    };
  });

  return {
    format_name: source.format_name === undefined ? "Custom" : String(source.format_name),
    total_bits:
      source.total_bits === undefined || !Number.isFinite(Number(source.total_bits))
        ? 32
        : Math.max(1, Math.trunc(Number(source.total_bits))),
    fields,
    instruction_types,
    instruction_set_config,
  };
}

/** Canonical MIPS32 preset for the Architecture Settings ISA section. */
export const MIPS_ASSEMBLER_CONFIG: AssemblerConfig = {
  fields: [
    { field: "opcode", label: "Operation Code", def_type: "raw_value", bits: 6, ranges: [[0, 5]] },
    { field: "rs", label: "Source Register", def_type: "register", bits: 5, ranges: [[6, 10]] },
    { field: "rt", label: "Target Register", def_type: "register", bits: 5, ranges: [[11, 15]] },
    { field: "rd", label: "Destination Register", def_type: "register", bits: 5, ranges: [[16, 20]] },
    { field: "imm", label: "Immediate Value", def_type: "raw_value", bits: 16, ranges: [[16, 31]] },
    { field: "shamt", label: "Shift Amount", def_type: "raw_value", bits: 5, ranges: [[21, 25]] },
    { field: "funct", label: "Function Code", def_type: "raw_value", bits: 6, ranges: [[26, 31]] },
    { field: "address", label: "Jump Address", def_type: "raw_value", bits: 26, ranges: [[6, 31]] },
  ],
  instruction_types: [
    {
      type: "R",
      description: "Register-type instruction",
      fields: ["opcode", "rs", "rt", "rd", "shamt", "funct"],
      default_field_values: { opcode: 0 },
      default_operands: [["rs"], ["rt"], ["rd"]],
    },
    { type: "I", description: "Immediate-type instruction", fields: ["opcode", "rs", "rt", "imm"] },
    { type: "J", description: "Jump-type instruction", fields: ["opcode", "address"] },
  ],
  instruction_set_config: [
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
      operands: [["rt"], ["imm", "memory_address", "rs"]],
      description: "Load a word from memory into a register.",
      field_values: { opcode: 0x23 },
    },
    {
      mnemonic: "sw",
      type: "I",
      operands: [["rt"], ["imm", "memory_address", "rs"]],
      description: "Store a word from a register into memory.",
      field_values: { opcode: 0x2B },
    },
    {
      field_values: { opcode: 0x00, funct: 0x00 },
      mnemonic: "nop",
      type: "R",
      operands: [["rs"], ["rt"], ["rd"]],
      description:
        "No operation. This instruction does nothing and is often used for timing or alignment purposes.",
    },
  ],
};

/** Structural deep copy of an assembler/ISA configuration. */
export function cloneAssemblerConfig(config: AssemblerConfig): AssemblerConfig {
  const normalized = normalizeAssemblerConfig(config);
  return {
    fields: normalized.fields.map((field) => ({ ...field, ranges: field.ranges.map((range) => [...range] as [number, number]) })),
    instruction_types: normalized.instruction_types.map((type) => ({
      ...type,
      default_field_values: type.default_field_values ? { ...type.default_field_values } : undefined,
      default_operands: type.default_operands
        ? type.default_operands.map((operand) => [...operand] as (typeof operand))
        : undefined,
    })),
    instruction_set_config: normalized.instruction_set_config.map((instruction) => ({
      ...instruction,
      field_values: instruction.field_values ? { ...instruction.field_values } : undefined,
      operands: instruction.operands.map((operand) => [...operand] as (typeof operand)),
    })),
  };
}
