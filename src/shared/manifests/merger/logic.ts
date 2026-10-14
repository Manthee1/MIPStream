/** @format */

import {
  clampWiringBits,
  passThroughField,
  sanitizeWiringFields,
  wiringFieldWarnings,
  type WiringField,
} from "../wiring-logic";

/**
 * Jumper-mapped bit merger logic — the splitter's mirror. Each input field
 * drives individually-mapped output bus bits. Inputs should target
 * disjoint output bits; overlaps are allowed but warn (they resolve to a
 * wired-OR).
 */
export interface MergerConfig {
  /** Width of the output bus (1-32). */
  outputBits: number;
  /** Input fields; `map[i]` is the output bit driven by input bit `i`. */
  inputs: WiringField[];
}

export type MergerField = WiringField;

/**
 * Resolves the effective input fields, falling back to a full-width
 * pass-through when the config is invalid or empty.
 */
export function resolveMergerFields(config: MergerConfig): WiringField[] {
  const busBits = clampWiringBits(config.outputBits);
  if (Array.isArray(config.inputs) && config.inputs.length > 0) {
    const fields = sanitizeWiringFields(config.inputs, busBits);
    if (fields.length > 0) return fields;
  }
  return [passThroughField(busBits)];
}

/** Config sanity warnings for the editor (overlapping output targets). */
export function mergerWarnings(config: MergerConfig): string[] {
  return wiringFieldWarnings(resolveMergerFields(config), clampWiringBits(config.outputBits), false);
}