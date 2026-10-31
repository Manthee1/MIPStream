/**
 * The single-cycle MIPS datapath — the netlist behind the
 * BASIC_MIPS_ARCHITECTURE template. Pure serialized data (no manifest
 * imports): the exact same object is consumed by the project template and
 * by the headless golden-datapath check (`npm run simulation:check`, Rig C),
 * so the shipped template IS the tested netlist.
 *
 * Layout: classic Patterson & Hennessy left-to-right flow — fetch (PC /
 * imem), decode (splitter / control / regfile), execute (ALU), memory
 * (dmem), writeback (wbMux → regfile), with the branch / next-PC logic in
 * the lower band. Nets carry no waypoints — orthogonal routing is editor
 * polish and never affects connectivity.
 *
 * Timing model (hybrid modules): the register file and data memory commit
 * their asserted writes at the rising clock edge, so the writeback path
 * (reg → alu → wbMux → reg.wd) is an edge boundary, not a combinational
 * loop. Instruction k's writeback commits on the edge entering cycle k+1 —
 * exact single-cycle semantics, one instruction per cycle.
 *
 * Designator stability contract: `imem` is the assembler mapping target
 * (main → imem) and `pc` is the first `std.pc` the halt detector samples —
 * these two designators must not be renamed.
 */

import type { SerializedModule } from "../shared/types/manifest";
import type { SerializedNet } from "../shared/types/netlist";
import { CONTROL_ROWS, CONTROL_SIGNALS } from "../shared/manifests/control/logic";
import { contiguousField } from "../shared/manifests/wiring-logic";

function m(
  designator: string,
  typeId: string,
  position: { x: number; y: number },
  config: Record<string, unknown> = {}
): SerializedModule {
  return { designator, typeId, position, rotation: 0, config };
}

function n(id: string, source: [string, string], ...targets: [string, string][]): SerializedNet {
  return {
    id,
    source: { designator: source[0], portId: source[1] },
    targets: targets.map(([designator, portId]) => ({ designator, portId })),
  };
}

/** The 18 datapath modules, laid out left-to-right (see file header). */
export const MIPS_SINGLE_CYCLE_MODULES: SerializedModule[] = [
  // -- Fetch ----------------------------------------------------------------
  m("pc", "std.pc", { x: -720, y: 0 }),
  m("four", "std.constant", { x: -720, y: 180 }, { value: 4, bitWidth: 32 }),
  m("pcPlus4", "std.adder", { x: -560, y: 90 }, { bitWidth: 32 }),
  m("imem", "std.imem", { x: -560, y: -180 }, { wordCount: 256, bitWidth: 32 }),
  // -- Decode ----------------------------------------------------------------
  // The splitter dissects the instruction word into every field the datapath
  // needs; the rd [15:11] and imm [15:0] fields deliberately overlap.
  m("split", "std.splitter", { x: -300, y: -180 }, {
    inputBits: 32,
    outputs: [
      contiguousField(31, 26, "opcode"),
      contiguousField(25, 21, "rs"),
      contiguousField(20, 16, "rt"),
      contiguousField(15, 11, "rd"),
      contiguousField(5, 0, "funct"),
      contiguousField(15, 0, "imm"),
    ],
  }),
  // Decode table: R-type (add/slt/nop ride the opcode-0 row), addi, lw, sw,
  // beq. Opcodes without a row (e.g. the assembler's halt) decode to
  // all-zero signals — datapath-safe no-ops.
  m("control", "std.control", { x: -300, y: -420 }, {
    opcodeBits: 6,
    signals: CONTROL_SIGNALS,
    rows: CONTROL_ROWS,
  }),
  m("aluControl", "std.alu-control", { x: -60, y: -420 }),
  m("reg", "std.regfile", { x: 0, y: 0 }, { registerCount: 32, bitWidth: 32 }),
  m("regDstMux", "std.mux2", { x: -160, y: 120 }, { bitWidth: 5, numInputs: 2 }),
  m("ext", "std.extender", { x: -300, y: 200 }, { inputBits: 16, outputBits: 32, isSigned: true }),
  // -- Execute ---------------------------------------------------------------
  m("aluSrcMux", "std.mux2", { x: 200, y: 160 }, { bitWidth: 32, numInputs: 2 }),
  m("alu", "std.alu", { x: 420, y: 60 }, { bitWidth: 32 }),
  // -- Memory / writeback ------------------------------------------------------
  m("dmem", "std.dmem", { x: 660, y: 60 }, { wordCount: 256, bitWidth: 32 }),
  m("wbMux", "std.mux2", { x: 900, y: 0 }, { bitWidth: 32, numInputs: 2 }),
  // -- Branch / next-PC -------------------------------------------------------
  m("shift2", "std.shifter", { x: 200, y: 320 }, { bitWidth: 32, mode: "logical_left", shamt: 2 }),
  m("branchAdder", "std.adder", { x: 400, y: 240 }, { bitWidth: 32 }),
  m("branchAnd", "std.and", { x: 660, y: -240 }),
  m("pcMux", "std.mux2", { x: -880, y: 240 }, { bitWidth: 32, numInputs: 2 }),
];

/**
 * The complete netlist: fetch path, decode/control fan-out, execute path,
 * memory path, writeback path, and next-PC selection.
 *
 * Cycle audit (why this compiles): the only feedback paths into a module's
 * own combinational cone are the writeback nets (`wbMux.out → reg.wd`,
 * `regDstMux.out → reg.rd`, `alu.result → dmem.addr`, `reg.readB → dmem.wd`)
 * — all of them target hybrid clocked inputs, which are edge-sampled
 * boundaries. The next-PC loop closes through the sequential `pc`.
 */
export const MIPS_SINGLE_CYCLE_NETS: SerializedNet[] = [
  // Fetch: PC → imem, PC + 4.
  n("n1", ["pc", "q"], ["imem", "addr"]),
  n("n2", ["pc", "q"], ["pcPlus4", "a"]),
  n("n3", ["four", "out"], ["pcPlus4", "b"]),
  n("n4", ["pcPlus4", "sum"], ["pcMux", "in0"], ["branchAdder", "a"]),
  // Decode: instruction field dissection and control fan-out.
  n("n5", ["imem", "instruction"], ["split", "in"]),
  n("n6", ["split", "out_opcode"], ["control", "opcode"]),
  n("n7", ["split", "out_rs"], ["reg", "rs"]),
  n("n8", ["split", "out_rt"], ["reg", "rt"], ["regDstMux", "in0"]),
  n("n9", ["split", "out_rd"], ["regDstMux", "in1"]),
  n("n10", ["split", "out_funct"], ["aluControl", "funct"]),
  n("n11", ["split", "out_imm"], ["ext", "in"]),
  n("n12", ["control", "regDst"], ["regDstMux", "sel"]),
  n("n13", ["control", "aluSrc"], ["aluSrcMux", "sel"]),
  n("n14", ["control", "memToReg"], ["wbMux", "sel"]),
  n("n15", ["control", "regWrite"], ["reg", "we"]),
  n("n16", ["control", "memRead"], ["dmem", "memRead"]),
  n("n17", ["control", "memWrite"], ["dmem", "memWrite"]),
  n("n18", ["control", "branch"], ["branchAnd", "a"]),
  n("n19", ["control", "aluOp"], ["aluControl", "aluop"]),
  n("n20", ["aluControl", "operation"], ["alu", "op"]),
  // Register file reads and the destination-register mux (write address).
  n("n21", ["reg", "readA"], ["alu", "a"]),
  n("n22", ["reg", "readB"], ["aluSrcMux", "in0"], ["dmem", "wd"]),
  n("n23", ["regDstMux", "out"], ["reg", "rd"]),
  // Execute: ALU source selection, ALU, sign extension.
  n("n24", ["ext", "out"], ["aluSrcMux", "in1"], ["shift2", "in"]),
  n("n25", ["aluSrcMux", "out"], ["alu", "b"]),
  // Memory: effective address from the ALU result.
  n("n26", ["alu", "result"], ["dmem", "addr"], ["wbMux", "in0"]),
  n("n27", ["dmem", "rdata"], ["wbMux", "in1"]),
  // Writeback: the net that used to be the compile error — now an
  // edge-sampled clock boundary into the hybrid register file.
  n("n28", ["wbMux", "out"], ["reg", "wd"]),
  // Branch: (rs - rt) == 0 AND branch → take the shifted target.
  n("n29", ["alu", "zero"], ["branchAnd", "b"]),
  n("n30", ["shift2", "out"], ["branchAdder", "b"]),
  n("n31", ["branchAdder", "sum"], ["pcMux", "in1"]),
  n("n32", ["branchAnd", "out"], ["pcMux", "sel"]),
  // Next PC.
  n("n33", ["pcMux", "out"], ["pc", "d"]),
];
