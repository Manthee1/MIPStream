/** @format */

import { widthMask } from "../../utils/bit-ops.ts";

export type LogicOp = "and" | "or" | "xor" | "nor";

export interface LogicGateConfig {
  bitWidth: number;
  op: LogicOp;
}

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
