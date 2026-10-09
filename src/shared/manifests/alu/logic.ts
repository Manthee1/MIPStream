/** @format */

/**
 * Pure ALU operation set + evaluation, following the classic MIPS ALU control
 * encoding. Self-contained (no imports) so it stays trivially testable.
 */

/** Classic MIPS ALU operation encodings (4-bit control). */
export const ALU_AND = 0b0000;
export const ALU_OR = 0b0001;
export const ALU_ADD = 0b0010;
export const ALU_SUB = 0b0110;
export const ALU_SLT = 0b0111;
export const ALU_NOR = 0b1100;

export interface AluResult {
  result: number;
  zero: number;
}

function widthMask(bits: number): number {
  if (bits >= 32) return 0xffffffff;
  if (bits <= 0) return 0;
  return (2 ** bits - 1) >>> 0;
}

/** Reinterprets an unsigned word as two's complement within `bits`. */
export function toSigned(value: number, bits: number): number {
  if (bits >= 32) return value | 0;
  const sign = 1 << (bits - 1);
  const masked = (value >>> 0) & widthMask(bits);
  return (masked & sign) !== 0 ? masked - 2 ** bits : masked;
}

/** Evaluates one ALU operation on unsigned operands. */
export function aluEvaluate(a: number, b: number, op: number, bitWidth: number): AluResult {
  const mask = widthMask(bitWidth);
  const x = (a >>> 0) & mask;
  const y = (b >>> 0) & mask;

  let result = 0;
  switch (op & 0xf) {
    case ALU_AND:
      result = x & y;
      break;
    case ALU_OR:
      result = x | y;
      break;
    case ALU_ADD:
      result = x + y;
      break;
    case ALU_SUB:
      result = x - y;
      break;
    case ALU_SLT:
      result = toSigned(x, bitWidth) < toSigned(y, bitWidth) ? 1 : 0;
      break;
    case ALU_NOR:
      result = ~(x | y);
      break;
    default:
      result = 0;
      break;
  }

  result = (result & mask) >>> 0;
  return { result, zero: result === 0 ? 1 : 0 };
}
