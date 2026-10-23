/** @format */

import type {
  AssemblerConfig,
  AssemblerFieldConfig,
  InstructionConfig,
  InstructionTypeConfig,
  field_types,
} from "../types/isa";
import { effectiveTotalBits } from "../types/isa";
import { widthMask } from "./bit-ops";

/** All legal operand interpretation types. */
const FIELD_TYPES: field_types[] = [
  "register",
  "raw_value",
  "label_absolute",
  "label_relative",
  "memory_address",
];

/**
 * Pure validators for the ISA definition section of the architecture
 * configuration (AssemblerConfig-shaped). Returns human-readable warnings
 * for the settings UI. Overlapping fields across the word are legal — that
 * is how R/I/J formats coexist in one word — but each field's own ranges
 * must be well-formed.
 */
export function isaWarnings(isa: AssemblerConfig): string[] {
  const warnings: string[] = [];
  const totalBits = effectiveTotalBits(isa);

  // Format header
  if (!isa.format_name?.trim()) warnings.push("Instruction format needs a name.");
  if (totalBits < 1 || totalBits > 64) warnings.push("Instruction word width must be between 1 and 64 bits.");

  // Fields
  const fieldNames = isa.fields.map((field) => field.field?.trim() ?? "");
  if (isa.fields.length === 0) warnings.push("Define at least one instruction format field.");
  const duplicateFields = fieldNames.filter((name, i) => name && fieldNames.indexOf(name) !== i);
  if (duplicateFields.length > 0) {
    warnings.push(`Duplicate field name: ${[...new Set(duplicateFields)].join(", ")}.`);
  }
  if (isa.fields.some((field) => !field.field?.trim())) warnings.push("Every field needs a name.");
  for (const field of isa.fields) {
    warnings.push(...fieldWarnings(field, totalBits));
  }

  // Instruction types
  const typeNames = isa.instruction_types.map((type) => type.type?.trim() ?? "");
  const duplicateTypes = typeNames.filter((name, i) => name && typeNames.indexOf(name) !== i);
  if (duplicateTypes.length > 0) {
    warnings.push(`Duplicate instruction type: ${[...new Set(duplicateTypes)].join(", ")}.`);
  }
  for (const type of isa.instruction_types) {
    for (const fieldName of type.fields ?? []) {
      if (!fieldNames.includes(fieldName)) {
        warnings.push(`Instruction type "${type.type}" references unknown field "${fieldName}".`);
      }
    }
  }

  // Instructions
  const mnemonics = isa.instruction_set_config.map((instruction) => instruction.mnemonic?.trim().toLowerCase() ?? "");
  const duplicateMnemonics = mnemonics.filter((mnemonic, i) => mnemonic && mnemonics.indexOf(mnemonic) !== i);
  if (duplicateMnemonics.length > 0) {
    warnings.push(`Duplicate mnemonic: ${[...new Set(duplicateMnemonics)].join(", ")}.`);
  }
  const types = new Map<string, InstructionTypeConfig>(
    isa.instruction_types.map((type) => [type.type ?? "", type])
  );
  for (const instruction of isa.instruction_set_config) {
    warnings.push(...instructionWarnings(instruction, isa, types));
  }

  return warnings;
}

/** Well-formedness of one field's bit ranges. */
function fieldWarnings(field: AssemblerFieldConfig, totalBits: number): string[] {
  const warnings: string[] = [];
  if ((field.ranges ?? []).length === 0) {
    warnings.push(`Field "${field.field}" has no bit ranges.`);
  }
  const sorted = [...(field.ranges ?? [])].sort((a, b) => a[0] - b[0]);
  const covered = sorted.reduce((sum, [start, end]) => sum + (end - start + 1), 0);
  if (covered !== field.bits) {
    warnings.push(`Field "${field.field}": ranges cover ${covered} bits but the field is ${field.bits} bits wide.`);
  }
  for (const [start, end] of field.ranges ?? []) {
    if (start > end) warnings.push(`Field "${field.field}": range [${start}, ${end}] is inverted.`);
    if (start < 0 || end >= totalBits) {
      warnings.push(`Field "${field.field}": range [${start}, ${end}] exceeds the ${totalBits}-bit word.`);
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i][0] <= sorted[i - 1][1]) {
      warnings.push(
        `Field "${field.field}": ranges [${sorted[i - 1][0]}, ${sorted[i - 1][1]}] and [${sorted[i][0]}, ${sorted[i][1]}] overlap.`
      );
    }
  }
  return warnings;
}

/** Consistency of one instruction against fields, types and its operands. */
function instructionWarnings(
  instruction: InstructionConfig,
  isa: AssemblerConfig,
  types: Map<string, InstructionTypeConfig>
): string[] {
  const warnings: string[] = [];
  const mnemonic = instruction.mnemonic || "(unnamed)";
  if (!instruction.mnemonic?.trim()) warnings.push("Every instruction needs a mnemonic.");

  if (instruction.type !== undefined) {
    const type = types.get(instruction.type);
    if (!type) {
      warnings.push(`Instruction "${mnemonic}" references unknown type "${instruction.type}".`);
    } else {
      // Fields not listed by the type must be zero — flag conflicting values.
      for (const [key, value] of Object.entries(instruction.field_values ?? {})) {
        if (!type.fields.includes(key) && value !== 0) {
          warnings.push(`Instruction "${mnemonic}": field "${key}" is not part of type "${instruction.type}".`);
        }
      }
    }
  }

  const fields = new Map<string, AssemblerFieldConfig>(isa.fields.map((field) => [field.field ?? "", field]));
  for (const [key, value] of Object.entries(instruction.field_values ?? {})) {
    const field = fields.get(key);
    if (!field) {
      warnings.push(`Instruction "${mnemonic}" references unknown field "${key}".`);
    } else if ((value & widthMask(field.bits)) !== value) {
      warnings.push(`Instruction "${mnemonic}": field "${key}" value exceeds ${field.bits} bits.`);
    }
  }

  for (const operand of instruction.operands ?? []) {
    const [fieldName, defType, extra] = operand;
    if (!fields.has(fieldName)) {
      warnings.push(`Instruction "${mnemonic}" operand "${fieldName}" is not a defined field.`);
    }
    if (defType !== undefined && !FIELD_TYPES.includes(defType)) {
      warnings.push(`Instruction "${mnemonic}" operand "${fieldName}" has unknown type "${defType}".`);
    }
    if (defType === "memory_address" && extra !== undefined && !fields.has(extra)) {
      warnings.push(
        `Instruction "${mnemonic}" memory_address operand must reference a base register field, got "${extra}".`
      );
    }
  }

  return warnings;
}

