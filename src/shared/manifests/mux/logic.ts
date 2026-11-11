/** @format */

/**
 * Pure multiplexer logic shared by every mux variant manifest: selection
 * mapping (which data input is forwarded for a given selector value) and
 * the selector-code labels drawn beside the input pins. No Vue / Konva
 * runtime imports — the headless engine check rig consumes this file
 * directly.
 */

/**
 * Complete configuration of a multiplexer instance (serialized, JSON-safe).
 * The input count is fixed per variant; everything else is configurable.
 */
export interface MuxConfig {
  /** Width of the data buses (1-32). */
  bitWidth: number;
  /** Number of data inputs — fixed per mux variant. */
  numInputs: number;
  /**
   * Selection assignment: `selMap[i]` is the selector value that forwards
   * data input `i`. Must be a permutation of 0..numInputs-1; absent or
   * invalid maps resolve to the identity (input i forwards on Sel = i).
   */
  selMap?: number[];
  /** Vertical edge the selector pin hangs from (default: bottom). */
  selPosition?: "top" | "bottom";
}

/** Selector width of a mux with `numInputs` data inputs. */
export function muxSelBits(numInputs: number): number {
  return Math.ceil(Math.log2(numInputs)) || 1;
}

/**
 * Default multiplexer selection shared by every mux variant manifest.
 * `values` is ordered data-input first; the selector index is last.
 */
export function selectMuxInput(
  values: ArrayLike<number>,
  sel: number,
  numInputs: number
): number {
  const index = sel >>> 0;
  return index < numInputs ? values[index] >>> 0 : 0;
}

/** Identity permutation of 0..count-1. */
function identityMap(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i);
}

/**
 * Validates a raw permutation of 0..count-1 (exact length, integer entries,
 * no duplicates). Returns null when the raw value is not a valid
 * permutation.
 */
function validPermutation(raw: unknown, count: number): number[] | null {
  if (!Array.isArray(raw) || raw.length !== count) return null;
  const seen = new Set<number>();
  const map: number[] = [];
  for (const entry of raw) {
    const value = Number(entry);
    if (!Number.isInteger(value) || value < 0 || value >= count || seen.has(value)) return null;
    seen.add(value);
    map.push(value);
  }
  return map;
}

/**
 * Resolves the per-instance selector assignment: `selMap[i]` is the
 * selector value that forwards data input `i`. Absent or invalid maps fall
 * back to the identity — legacy configs behave exactly as before.
 */
export function resolveMuxSelMap(raw: unknown, numInputs: number): number[] {
  return validPermutation(raw, numInputs) ?? identityMap(numInputs);
}

/**
 * Flattens a selector assignment into the evaluator's lookup: entry
 * `selValue` holds the index of the data input forwarded for that selector
 * value (the mirror of `selMap`).
 */
export function buildMuxLut(selMap: number[]): Uint32Array {
  const lut = new Uint32Array(selMap.length);
  selMap.forEach((inputIndex, selValue) => {
    lut[selValue] = inputIndex;
  });
  return lut;
}

/**
 * Mapped multiplexer selection: `values` is ordered data-input first; the
 * selector value is looked up through the flattened map. Selector values
 * beyond the table read 0.
 */
export function selectMappedMuxInput(
  values: ArrayLike<number>,
  sel: number,
  lut: Uint32Array
): number {
  const code = sel >>> 0;
  if (code >= lut.length) return 0;
  return values[lut[code]] >>> 0;
}

/** Binary selector code drawn beside an input pin (e.g. "0", "01", "0110"). */
export function muxSelCode(selValue: number, selBits: number): string {
  return selValue.toString(2).padStart(selBits, "0");
}

