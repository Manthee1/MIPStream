/** @format */

import {
  clampWiringBits,
  overlappingBusBits,
  passThroughField,
  sanitizeWiringFields,
  wiringFieldWarnings,
  type WiringField,
} from "../wiring-logic";

/**
 * Jumper-mapped bit merger logic — the splitter's mirror. Each input field
 * drives individually-mapped output bus bits. Every output bit accepts
 * exactly one driver: overlapping input mappings are a hard error
 * (`mergerErrors`) and are blocked from ever being committed.
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

/** Config sanity warnings for the editor (widths and unmapped fields). */
export function mergerWarnings(config: MergerConfig): string[] {
  return wiringFieldWarnings(resolveMergerFields(config), clampWiringBits(config.outputBits));
}

/**
 * Blocking config errors: output bits driven by more than one input. The
 * config editor refuses to commit a config while any of these exist — a
 * merger must never silently resolve contested bits.
 */
export function mergerErrors(config: MergerConfig): string[] {
  const contested = overlappingBusBits(resolveMergerFields(config));
  if (contested.length === 0) return [];
  return [
    `Output bits [${contested.join(", ")}] are driven by more than one input — each output bit accepts exactly one driver. Re-map the overlapping inputs.`,
  ];
}