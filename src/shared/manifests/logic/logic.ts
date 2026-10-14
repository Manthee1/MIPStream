/** @format */

import { widthMask } from "../../utils/bit-ops.ts";

export type LogicOp = "and" | "or" | "xor" | "nor";

/**
 * Logic gates are bit-level primitives: the width is fixed at 1 bit and
 * intentionally NOT user-configurable (the PC-manifest pattern) — wide
 * bitwise logic belongs to dedicated bus components (splitter/merger/ALU).
 */
export interface LogicGateConfig {
  op: LogicOp;
}

/** Fixed gate width — always 1 bit. */
export const GATE_BIT_WIDTH = 1;

/** Pure bitwise gate evaluation shared by every gate variant manifest. */
export function gateEvaluate(a: number, b: number, op: LogicOp, bitWidth: number): number {
  const mask = widthMask(bitWidth);
  const x = (a >>> 0) & mask;
  const y = (b >>> 0) & mask;

  let result: number;
  switch (op) {
    case "and":
      result = x & y;
      break;
    case "or":
      result = x | y;
      break;
    case "xor":
      result = x ^ y;
      break;
    case "nor":
      result = ~(x | y);
      break;
  }

  return (result & mask) >>> 0;
}
