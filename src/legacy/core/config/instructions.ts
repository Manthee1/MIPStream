/** @format */

/**
 * Kept as a compatibility shim: the canonical definitions now live in the
 * shared layer and are re-exported here for the legacy codebase.
 */
export type {
  AssemblerConfig,
  AssemblerFieldConfig,
  InstructionConfig,
  InstructionOperandConfig,
  InstructionTypeConfig,
  field_types,
} from "../../../shared/types/isa";

import { MIPS_ASSEMBLER_CONFIG } from "../../../config/isa-presets";

export const baseInstructionConfig = MIPS_ASSEMBLER_CONFIG.instruction_set_config;

export const defaultInstructionConfig: AssemblerConfig = MIPS_ASSEMBLER_CONFIG;
