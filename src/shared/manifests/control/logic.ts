/** @format */

import { widthMask } from "../../utils/bit-ops";

/**
 * Config-driven Control Unit decode table.
 *
 * The user defines the set of output control signals (id + width) and a
 * table mapping opcodes to their signal values; the manifest compiles the
 * table into a flattened lookup (`Uint32Array`) consumed by the evaluator.
 * The logic below is pure TypeScript — no Vue reactivity.
 */

/** One output control signal: a stable port id and its bit width. */
export interface ControlSignalDef {
  /** Port id used for wiring (stable, e.g. "regDst"). */
  id: string;
  /** Optional column header (defaults to the id). */
  label?: string;
  /** Signal width in bits (values are masked to it). */
  bits: number;
}

/** One table row: an opcode and its control signal values. */
export interface ControlRow {
  /** Opcode value (masked to the opcode width). */
  opcode: number;
  /** Optional row label (e.g. "lw"). */
  label?: string;
  /** Signal values keyed by signal id. */
  values: Record<string, number>;
}

/** Complete configuration of a control unit instance. */
export interface ControlConfig {
  /** Width of the opcode input bus (1..12 bits). */
  opcodeBits: number;
  /** Output control signals — these also drive the generated ports. */
  signals: ControlSignalDef[];
  /** Opcode decode table. */
  rows: ControlRow[];
}

/** Classic single-cycle MIPS control signals (the default set). */
export const CONTROL_SIGNALS: ControlSignalDef[] = [
  { id: "regDst", bits: 1 },
  { id: "aluSrc", bits: 1 },
  { id: "memToReg", bits: 1 },
  { id: "regWrite", bits: 1 },
  { id: "memRead", bits: 1 },
  { id: "memWrite", bits: 1 },
  { id: "branch", bits: 1 },
  { id: "aluOp", bits: 2 },
];

/** Classic single-cycle MIPS opcode decode table (the default rows). */
export const CONTROL_ROWS: ControlRow[] = [
  // `nop` (opcode 0, funct 0) rides this row too: regWrite 1 with rd = 0
  // is absorbed by the register file's hardwired $zero. Opcodes without a
  // row (e.g. the assembler's `halt`) decode to all-zero signals — no
  // writes, no branch — so unknown instructions are datapath-safe no-ops.
  {
    opcode: 0x00,
    label: "R-type",
    values: { regDst: 1, aluSrc: 0, memToReg: 0, regWrite: 1, memRead: 0, memWrite: 0, branch: 0, aluOp: 0b10 },
  },
  {
    opcode: 0x08,
    label: "addi",
    values: { regDst: 0, aluSrc: 1, memToReg: 0, regWrite: 1, memRead: 0, memWrite: 0, branch: 0, aluOp: 0b00 },
  },
  {
    opcode: 0x23,
    label: "lw",
    values: { regDst: 0, aluSrc: 1, memToReg: 1, regWrite: 1, memRead: 1, memWrite: 0, branch: 0, aluOp: 0b00 },
  },
  {
    opcode: 0x2b,
    label: "sw",
    values: { regDst: 0, aluSrc: 1, memToReg: 0, regWrite: 0, memRead: 0, memWrite: 1, branch: 0, aluOp: 0b00 },
  },
  {
    opcode: 0x04,
    label: "beq",
    values: { regDst: 0, aluSrc: 0, memToReg: 0, regWrite: 0, memRead: 0, memWrite: 0, branch: 1, aluOp: 0b01 },
  },
];

/** Mask covering the configured opcode width (clamped to 1..12 bits). */
export function opcodeMask(opcodeBits: number): number {
  return widthMask(Math.min(12, Math.max(1, opcodeBits)));
}

/** Config sanity warnings for the editor (duplicates, width overflows). */
export function controlConfigWarnings(config: ControlConfig): string[] {
  const warnings: string[] = [];

  const ids = new Set<string>();
  for (const signal of config.signals) {
    const id = signal.id.trim();
    if (!id) warnings.push("A signal is missing its id.");
    else if (ids.has(id)) warnings.push(`Duplicate signal id "${id}".`);
    else ids.add(id);
    if (signal.bits < 1 || signal.bits > 32) {
      warnings.push(`Signal "${id || "?"}" has an invalid width.`);
    }
  }

  const mask = opcodeMask(config.opcodeBits);
  const opcodes = new Set<number>();
  for (const row of config.rows) {
    const opcode = row.opcode & mask;
    if (opcodes.has(opcode)) warnings.push(`Duplicate opcode 0x${opcode.toString(16)}.`);
    else opcodes.add(opcode);
    for (const signal of config.signals) {
      const value = row.values[signal.id] ?? 0;
      if (value < 0 || value > widthMask(signal.bits)) {
        warnings.push(
          `Opcode 0x${opcode.toString(16)}: "${signal.id}" exceeds ${signal.bits} bits.`
        );
      }
    }
  }

  return warnings;
}

/**
 * Compiles the decode table into a flattened row-major lookup: entry
 * `opcode * signalCount + index` holds the signal's value. Opcodes without
 * a row decode to all-zero signals.
 */
export function buildControlTable(config: ControlConfig): Uint32Array {
  const signalCount = config.signals.length;
  const mask = opcodeMask(config.opcodeBits);
  const table = new Uint32Array((mask + 1) * signalCount);
  for (const row of config.rows) {
    const base = (row.opcode & mask) * signalCount;
    config.signals.forEach((signal, index) => {
      table[base + index] = (row.values[signal.id] ?? 0) & widthMask(signal.bits);
    });
  }
  return table;
}
