/** @format */

import {
  clampWiringBits,
  contiguousField,
  passThroughField,
  sanitizeWiringFields,
  wiringFieldWarnings,
  type WiringField,
} from "../wiring-logic";

/**
 * Jumper-mapped bit splitter logic. Each output field taps arbitrary,
 * individually-mapped input bus bits — overlaps and reordering are both
 * legal (e.g. one field carrying [31:16] while another mirrors [15:0],
 * or two fields both tapping [11:0]).
 */
export interface SplitterConfig {
  /** Width of the input bus (1-32). */
  inputBits: number;
  /** Output fields; `map[o]` is the input bit feeding output bit `o`. */
  outputs: WiringField[];
}

export type SplitterField = WiringField;

/**
 * Parses the legacy comma-separated field-width spec ("6,5,5,5,5,6",
 * MSB-first). Returns null when any width is not a positive integer or
 * the total exceeds the bus width.
 */
export function parseLegacyFieldSpec(text: string, inputBits: number): number[] | null {
  const parts = text.split(",");
  const widths: number[] = [];
  let total = 0;

  for (const part of parts) {
    const trimmed = part.trim();
    if (!/^\d+$/.test(trimmed)) return null;
    const width = parseInt(trimmed, 10);
    if (width < 1) return null;
    widths.push(width);
    total += width;
  }

  if (widths.length === 0 || total > inputBits) return null;
  return widths;
}

/**
 * Resolves the effective output fields from a config, migrating the
 * legacy `fields: "16,16"` width-spec configs into contiguous
 * jumper-mapped fields (MSB-first) and falling back to a full-width
 * pass-through when the config is invalid or empty. The legacy spec
 * takes precedence when present: it only ever comes from pre-jumper
 * instances, and the first edit through the new config editor replaces
 * the whole config (dropping the key).
 */
export function resolveSplitterFields(config: SplitterConfig): WiringField[] {
  const busBits = clampWiringBits(config.inputBits);

  const legacyText = (config as { fields?: unknown }).fields;
  if (typeof legacyText === "string") {
    const widths = parseLegacyFieldSpec(legacyText, busBits);
    if (widths) {
      const fields: WiringField[] = [];
      let hi = busBits - 1;
      widths.forEach((width, i) => {
        fields.push(contiguousField(hi, hi - width + 1, `f${i + 1}`));
        hi -= width;
      });
      return fields;
    }
  }

  if (Array.isArray(config.outputs) && config.outputs.length > 0) {
    const fields = sanitizeWiringFields(config.outputs, busBits);
    if (fields.length > 0) return fields;
  }

  return [passThroughField(busBits)];
}

/** Config sanity warnings for the editor. */
export function splitterWarnings(config: SplitterConfig): string[] {
  return wiringFieldWarnings(
    resolveSplitterFields(config),
    clampWiringBits(config.inputBits),
    true
  );
}
