/** @format */

/** Classic single-cycle MIPS opcode classes. */
export const OPCODE_RTYPE = 0x00;
export const OPCODE_LW = 0x23;
export const OPCODE_SW = 0x2b;
export const OPCODE_BEQ = 0x04;

export interface ControlSignals {
  regDst: number;
  aluSrc: number;
  memToReg: number;
  regWrite: number;
  memRead: number;
  memWrite: number;
  branch: number;
  aluOp: number;
}

const NO_SIGNALS: ControlSignals = {
  regDst: 0,
  aluSrc: 0,
  memToReg: 0,
  regWrite: 0,
  memRead: 0,
  memWrite: 0,
  branch: 0,
  aluOp: 0,
};

/** Decodes the 6-bit opcode into the datapath's control signals. */
export function decodeControl(opcode: number): ControlSignals {
  switch (opcode & 0x3f) {
    case OPCODE_RTYPE:
      return {
        regDst: 1,
        aluSrc: 0,
        memToReg: 0,
        regWrite: 1,
        memRead: 0,
        memWrite: 0,
        branch: 0,
        aluOp: 0b10,
      };
    case OPCODE_LW:
      return {
        regDst: 0,
        aluSrc: 1,
        memToReg: 0,
        regWrite: 1,
        memRead: 1,
        memWrite: 0,
        branch: 0,
        aluOp: 0b00,
      };
    case OPCODE_SW:
      return {
        regDst: 0,
        aluSrc: 1,
        memToReg: 0,
        regWrite: 0,
        memRead: 0,
        memWrite: 1,
        branch: 0,
        aluOp: 0b00,
      };
    case OPCODE_BEQ:
      return {
        regDst: 0,
        aluSrc: 0,
        memToReg: 0,
        regWrite: 0,
        memRead: 0,
        memWrite: 0,
        branch: 1,
        aluOp: 0b01,
      };
    default:
      return { ...NO_SIGNALS };
  }
}
