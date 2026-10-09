/** @format */

import { ALU_ADD, ALU_AND, ALU_OR, ALU_SLT, ALU_SUB } from "../alu/logic.ts";

/**
 * Classic MIPS ALU control decode: the main control unit's 2-bit ALUOp plus
 * the instruction's 6-bit funct field produce the 4-bit ALU operation.
 */
export function decodeAluControl(aluOp: number, funct: number): number {
  switch (aluOp & 0x3) {
    case 0b00:
      return ALU_ADD; // lw/sw address arithmetic
    case 0b01:
      return ALU_SUB; // beq comparison
    case 0b10:
      switch (funct & 0x3f) {
        case 0x20:
          return ALU_ADD;
        case 0x22:
          return ALU_SUB;
        case 0x24:
          return ALU_AND;
        case 0x25:
          return ALU_OR;
        case 0x2a:
          return ALU_SLT;
        default:
          return 0;
      }
    default:
      return 0;
  }
}
