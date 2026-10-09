/** @format */

/**
 * Generic bit-field splitter logic. Field widths are listed MSB-first; if
 * the widths sum to less than the input width, the remaining low bits are
 * simply not output.
 */
export interface FieldRange {
  hi: number;
  lo: number;
}

/**
 * Parses a comma-separated field-width spec (e.g. "6,5,5,5,5,6") into
 * MSB-first widths. Returns null when any width is not a positive integer or
 * the total exceeds `inputBits`.
 */
export function parseFieldSpec(text: string, inputBits: number): number[] | null {
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

/** Bit range covered by each field, MSB-first. */
export function fieldRanges(widths: number[], inputBits: number): FieldRange[] {
  const ranges: FieldRange[] = [];
  let hi = inputBits - 1;
  for (const width of widths) {
    const lo = hi - width + 1;
    ranges.push({ hi, lo });
    hi = lo - 1;
  }
  return ranges;
}

/** Extracts each MSB-first field from an unsigned word. */
export function splitFields(value: number, widths: number[], inputBits: number): number[] {
  const v = value >>> 0;
  const out: number[] = []
  let hi = inputBits - 1;
  for (const width of widths) {
    const lo = hi - width + 1;
    const mask = width >= 32 ? 0xffffffff : 2 ** width - 1;
    out.push(((v >>> lo) & mask) >>> 0);
    hi = lo - 1;
  }
  return out;
}
