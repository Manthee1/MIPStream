/** @format */

/**
 * Shared ISA / assembler definition model (moved out of the legacy tree).
 * A single `AssemblerConfig` describes the instruction encoding (fields with
 * explicit bit ranges — overlapping and multi-range fields are legal), the
 * instruction format types, and the concrete instruction set.
 */

export interface InstructionTypeConfig {
  type: string;
  description: string;
  fields: string[];
  default_field_values?: { [field: string]: number };
  default_operands?: InstructionOperandConfig[];
}

/** How an operand token in assembly source is interpreted. */
export type field_types = "register" | "raw_value" | "label_absolute" | "label_relative" | "memory_address";

export interface AssemblerFieldConfig {
  field: string;
  label: string;
  def_type: field_types;
  bits: number;
  /** Inclusive [start, end] bit segments within the instruction word. */
  ranges: [number, number][];
}

export interface AssemblerConfig {
  /** Human-readable format name (e.g. "MIPS32 R/I/J"). */
  format_name?: string;
  /** Word width. Derived from the widest field range when absent. */
  total_bits?: number;
  fields: AssemblerFieldConfig[];
  instruction_types: InstructionTypeConfig[];
  instruction_set_config: InstructionConfig[];
}

/** Effective instruction word width (explicit or widest range end + 1). */
export function effectiveTotalBits(config: AssemblerConfig): number {
  if (config.total_bits !== undefined) return config.total_bits;
  return config.fields.reduce(
    (max, field) => Math.max(max, ...field.ranges.map(([, end]) => end + 1)),
    0
  );
}


// First string is the field name, second is the type of the field (optional),
// third is additional info (optional, e.g. the base register for memory_address).
export type InstructionOperandConfig = [string, field_types?, string?];

export interface InstructionConfig {
  mnemonic: string;
  type?: string;
  description?: string;
  operands: InstructionOperandConfig[];
  field_values?: { [field: string]: number };
}
