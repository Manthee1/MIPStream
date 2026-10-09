/** @format */

/**
 * Unsigned bitmask covering exactly `bits` lowest bits
 * (`bits >= 32` yields the full 32-bit word mask).
 */
export function widthMask(bits: number): number {
  if (bits >= 32) return 0xffffffff;
  if (bits <= 0) return 0;
  return (2 ** bits - 1) >>> 0;
}

/** Clamps an unsigned value into `bits` width. */
export function fitWidth(value: number, bits: number): number {
  return ((value >>> 0) & widthMask(bits)) >>> 0;
}

/**
 * Parses a user-entered value ("0x1f", "0b101", "31", "-1", bare hex
 * "ff") into an unsigned `bits`-wide word. Returns null when unparsable.
 */
export function parseMaskedValue(input: string, bits: number): number | null {
  const text = input.trim().toLowerCase();
  if (text.length === 0) return null;

  let parsed: number;
  if (text.startsWith("0x")) {
    const digits = text.slice(2);
    if (digits.length === 0 || !/^[0-9a-f]+$/.test(digits)) return null;
    parsed = parseInt(digits, 16);
  } else if (text.startsWith("0b")) {
    const digits = text.slice(2);
    if (digits.length === 0 || !/^[01]+$/.test(digits)) return null;
    parsed = parseInt(digits, 2);
  } else if (/^-?\d+$/.test(text)) {
    parsed = parseInt(text, 10);
  } else if (/^[0-9a-f]+$/.test(text)) {
    // Bare hexadecimal fallback (common in memory/register editors).
    parsed = parseInt(text, 16);
  } else {
    return null;
  }

  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0) parsed += 2 ** 32; // two's complement for negatives
  return ((parsed >>> 0) & widthMask(bits)) >>> 0;
}
