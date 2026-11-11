/**
 * The classic five-stage pipelined MIPS datapath — the netlist behind the
 * `mips-pipelined` template. Pure serialized data (no manifest imports):
 * the same object is consumed by the project template and by the headless
 * golden-pipeline check (`npm run simulation:check`, Rig E), so the shipped
 * template IS the tested netlist.
 *
 * Layout: classic Patterson & Hennessy left-to-right flow with the four
 * pipeline boundary registers drawn as vertical walls between the stage
 * columns (fetch / decode / execute / memory / writeback). Nets carry no
 * waypoints — orthogonal routing is editor polish and never affects
 * connectivity.
 *
 * Boundary registers: each stage boundary is ONE multi-pin `std.register`
 * (the settings reconciler keeps exactly one managed register per boundary
 * index) whose `main`-id pin is the 32-bit instruction word — port `q`. That
 * convention drives two features: the stage visualizer samples `q` for the
 * instruction bar, and the session's halt logic waits for every `q` to
 * read 0 before finishing (pipeline drain). IF/ID and ID/EX additionally
 * carry a synchronous `rst` input wired to the branch-taken signal — a
 * taken branch clears both young slots at the edge while the PC loads the
 * target (2-cycle penalty, the classic EX-resolved branch).
 *
 * Hazards: deliberately NONE — this is the base pipeline. The register
 * file commits writes at the rising edge and reads combinationally, so a
 * write becomes visible to ID reads the cycle after WB: dependent
 * instructions need 4 instructions of separation (WB→ID same cycle works,
 * distance 3 does not). No forwarding, no stall logic — starter programs
 * and the Rig E programs are written hazard-free with nops.
 *
 * Timing model (hybrid modules): the register file and data memory commit
 * their asserted writes at the rising clock edge. Instruction k fetched in
 * cycle k retires (writeback commit) on the edge entering cycle k+5.
 *
 * Designator stability contract: `imem` is the assembler mapping target
 * (main → imem) and `pc` is the first `std.pc` the halt detector samples —
 * these two designators must not be renamed. `ifId`/`idEx`/`exMem`/`memWb`
 * are the managed boundary registers the drain logic samples.
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

/**
 * The 24 datapath modules, laid out left-to-right (see file header). The
 * four `std.register` walls carry a pin id'd `main` (the instruction word —
 * it derives the classic `d`/`q` ports the visualizer and halt drain read)
 * plus pins whose ids match the control-signal ids, so their derived ports
 * read `d_regWrite` / `q_regWrite` and so on.
 */
export const MIPS_PIPELINED_MODULES: SerializedModule[] = [
    // -- Fetch ----------------------------------------------------------------
    m("pcMux", "std.mux2", { x: -1180, y: 160 }, { bitWidth: 32, numInputs: 2 }),
    m("pc", "std.pc", { x: -1000, y: 0 }),
    m("four", "std.constant", { x: -1000, y: 240 }, { value: 4, bitWidth: 32 }),
    m("pcPlus4", "std.adder", { x: -820, y: 120 }, { bitWidth: 32 }),
    m("imem", "std.imem", { x: -820, y: -220 }, { wordCount: 256, bitWidth: 32 }),
    // -- IF/ID boundary: instruction + PC+4, flushable ------------------------
    m("ifId", "std.register", { x: -580, y: -80 }, {
        managed: true,
        stageIndex: 0,
        stageId: "IF/ID",
        bitWidth: 32,
        reset: true,
        pins: [
            { id: "main", bits: 32, label: "Instr" },
            { id: "pc4", bits: 32, label: "PC+4" },
        ],
    }),
    // -- Decode ----------------------------------------------------------------
    // The splitter dissects the instruction word into every field the
    // datapath needs; the rd [15:11] and imm [15:0] fields deliberately
    // overlap.
    m("split", "std.splitter", { x: -420, y: -220 }, {
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
    // all-zero signals — datapath-safe no-ops (which is what makes a flushed
    // slot and the halt word itself inert while it rides the pipe).
    m("control", "std.control", { x: -420, y: -520 }, {
        opcodeBits: 6,
        signals: CONTROL_SIGNALS,
        rows: CONTROL_ROWS,
    }),
    m("reg", "std.regfile", { x: -180, y: 0 }, { registerCount: 32, bitWidth: 32 }),
    m("ext", "std.extender", { x: -180, y: 320 }, { inputBits: 16, outputBits: 32, isSigned: true }),
    // -- ID/EX boundary: operands, extended immediate, PC+4, control ----------
    m("idEx", "std.register", { x: -20, y: 0 }, {
        managed: true,
        stageIndex: 1,
        stageId: "ID/EX",
        bitWidth: 32,
        reset: true,
        pins: [
            { id: "main", bits: 32, label: "Instr" },
            { id: "rd1", bits: 32, label: "RD1" },
            { id: "rd2", bits: 32, label: "RD2" },
            { id: "imm", bits: 32, label: "Imm" },
            { id: "pc4", bits: 32, label: "PC+4" },
            { id: "regDst", bits: 1, label: "RdDst" },
            { id: "aluSrc", bits: 1, label: "ALUSrc" },
            { id: "regWrite", bits: 1, label: "RegWr" },
            { id: "memToReg", bits: 1, label: "M2R" },
            { id: "memRead", bits: 1, label: "MemRd" },
            { id: "memWrite", bits: 1, label: "MemWr" },
            { id: "branch", bits: 1, label: "Br" },
            { id: "aluOp", bits: 2, label: "ALUOp" },
        ],
    }),
    // -- Execute ----------------------------------------------------------------
    // The stage splitter re-derives the fields the EX stage needs from the
    // pipelined instruction word (rt/rd for the destination mux, funct for
    // the ALU control).
    m("splitEx", "std.splitter", { x: 220, y: -220 }, {
        inputBits: 32,
        outputs: [
            contiguousField(20, 16, "rt"),
            contiguousField(15, 11, "rd"),
            contiguousField(5, 0, "funct"),
        ],
    }),
    m("aluControl", "std.alu-control", { x: 380, y: -520 }),
    m("regDstMux", "std.mux2", { x: 440, y: 160 }, { bitWidth: 5, numInputs: 2 }),
    m("aluSrcMux", "std.mux2", { x: 660, y: 80 }, { bitWidth: 32, numInputs: 2 }),
    m("shift2", "std.shifter", { x: 660, y: 360 }, { bitWidth: 32, mode: "logical_left", shamt: 2 }),
    m("alu", "std.alu", { x: 900, y: 0 }, { bitWidth: 32 }),
    m("branchAdder", "std.adder", { x: 900, y: 480 }, { bitWidth: 32 }),
    m("branchAnd", "std.and", { x: 1160, y: -140 }),
    // -- EX/MEM boundary: ALU result, store data, destination, control --------
    m("exMem", "std.register", { x: 1300, y: 0 }, {
        managed: true,
        stageIndex: 2,
        stageId: "EX/MEM",
        bitWidth: 32,
        pins: [
            { id: "main", bits: 32, label: "Instr" },
            { id: "aluResult", bits: 32, label: "ALU" },
            { id: "storeData", bits: 32, label: "Store" },
            { id: "rd", bits: 5, label: "Dest" },
            { id: "regWrite", bits: 1, label: "RegWr" },
            { id: "memToReg", bits: 1, label: "M2R" },
            { id: "memRead", bits: 1, label: "MemRd" },
            { id: "memWrite", bits: 1, label: "MemWr" },
        ],
    }),
    // -- Memory ----------------------------------------------------------------
    m("dmem", "std.dmem", { x: 1500, y: 0 }, { wordCount: 256, bitWidth: 32 }),
    // -- MEM/WB boundary: result, loaded data, destination, control ------------
    m("memWb", "std.register", { x: 1700, y: 0 }, {
        managed: true,
        stageIndex: 3,
        stageId: "MEM/WB",
        bitWidth: 32,
        pins: [
            { id: "main", bits: 32, label: "Instr" },
            { id: "aluResult", bits: 32, label: "ALU" },
            { id: "memData", bits: 32, label: "Mem" },
            { id: "rd", bits: 5, label: "Dest" },
            { id: "regWrite", bits: 1, label: "RegWr" },
            { id: "memToReg", bits: 1, label: "M2R" },
        ],
    }),
    // -- Write back --------------------------------------------------------------
    m("wbMux", "std.mux2", { x: 1920, y: 0 }, { bitWidth: 32, numInputs: 2 }),
];

/**
 * The complete netlist: fetch path, IF/ID latch, decode/control fan-out,
 * ID/EX latch, execute + branch/flush, EX/MEM latch, memory path, MEM/WB
 * latch, and writeback.
 *
 * Cycle audit (why this compiles): every combinational cone is bounded by
 * an edge-sampled input. The next-PC loop closes through the sequential
 * `pc`; the writeback loop (memWb → wbMux → reg.wd) targets the hybrid
 * register file's clocked write port; the dmem inputs come from the EX/MEM
 * register; and the flush nets target the boundary registers' `rst` clocked
 * inputs. Instruction k fetched in cycle k retires on the edge entering
 * cycle k+5; a taken beq redirects the PC and clears IF/ID + ID/EX in the
 * same edge (2-cycle penalty).
 */
export const MIPS_PIPELINED_NETS: SerializedNet[] = [
    // Fetch: PC → imem, PC + 4, next-PC selection.
    n("n01", ["pc", "q"], ["imem", "addr"]),
    n("n02", ["pc", "q"], ["pcPlus4", "a"]),
    n("n03", ["four", "out"], ["pcPlus4", "b"]),
    n("n04", ["pcPlus4", "sum"], ["pcMux", "in0"], ["ifId", "d_pc4"]),
    n("n05", ["imem", "instruction"], ["ifId", "d"]),
    n("n06", ["pcMux", "out"], ["pc", "d"]),
    // Decode: the IF/ID word is dissected; control decodes once, in ID.
    // (out_rd/out_funct are deliberately unused here — the EX stage
    // re-derives them from the pipelined instruction word.)
    n("n07", ["ifId", "q"], ["split", "in"], ["idEx", "d"]),
    n("n08", ["split", "out_opcode"], ["control", "opcode"]),
    n("n09", ["split", "out_rs"], ["reg", "rs"]),
    n("n10", ["split", "out_rt"], ["reg", "rt"]),
    n("n11", ["split", "out_imm"], ["ext", "in"]),
    // Register-file reads and the sign-extended immediate latch into the
    // ID/EX boundary, alongside PC+4 for the EX branch-target adder.
    n("n12", ["reg", "readA"], ["idEx", "d_rd1"]),
    n("n13", ["reg", "readB"], ["idEx", "d_rd2"]),
    n("n14", ["ext", "out"], ["idEx", "d_imm"]),
    n("n15", ["ifId", "q_pc4"], ["idEx", "d_pc4"]),
    // Control fan-out into the ID/EX boundary (the pipelined control wires).
    n("n16", ["control", "regDst"], ["idEx", "d_regDst"]),
    n("n17", ["control", "aluSrc"], ["idEx", "d_aluSrc"]),
    n("n18", ["control", "memToReg"], ["idEx", "d_memToReg"]),
    n("n19", ["control", "regWrite"], ["idEx", "d_regWrite"]),
    n("n20", ["control", "memRead"], ["idEx", "d_memRead"]),
    n("n21", ["control", "memWrite"], ["idEx", "d_memWrite"]),
    n("n22", ["control", "branch"], ["idEx", "d_branch"]),
    n("n23", ["control", "aluOp"], ["idEx", "d_aluOp"]),
    // Execute: fields re-derived from the pipelined instruction word.
    n("n24", ["idEx", "q"], ["splitEx", "in"]),
    n("n25", ["splitEx", "out_rt"], ["regDstMux", "in0"]),
    n("n26", ["splitEx", "out_rd"], ["regDstMux", "in1"]),
    n("n27", ["splitEx", "out_funct"], ["aluControl", "funct"]),
    n("n28", ["idEx", "q_regDst"], ["regDstMux", "sel"]),
    n("n29", ["idEx", "q_aluSrc"], ["aluSrcMux", "sel"]),
    n("n30", ["idEx", "q_aluOp"], ["aluControl", "aluop"]),
    n("n31", ["aluControl", "operation"], ["alu", "op"]),
    // ALU operand selection: register operand + (register | immediate).
    n("n32", ["idEx", "q_rd1"], ["alu", "a"]),
    n("n33", ["idEx", "q_rd2"], ["aluSrcMux", "in0"]),
    n("n34", ["idEx", "q_imm"], ["aluSrcMux", "in1"], ["shift2", "in"]),
    n("n35", ["idEx", "q_pc4"], ["branchAdder", "a"]),
    n("n36", ["aluSrcMux", "out"], ["alu", "b"]),
    n("n37", ["shift2", "out"], ["branchAdder", "b"]),
    n("n38", ["branchAdder", "sum"], ["pcMux", "in1"]),
    // EX → EX/MEM boundary.
    n("n39", ["regDstMux", "out"], ["exMem", "d_rd"]),
    n("n40", ["alu", "result"], ["exMem", "d_aluResult"]),
    n("n41", ["idEx", "q_rd2"], ["exMem", "d_storeData"]),
    n("n42", ["idEx", "q"], ["exMem", "d"]),
    n("n43", ["idEx", "q_regWrite"], ["exMem", "d_regWrite"]),
    n("n44", ["idEx", "q_memToReg"], ["exMem", "d_memToReg"]),
    n("n45", ["idEx", "q_memRead"], ["exMem", "d_memRead"]),
    n("n46", ["idEx", "q_memWrite"], ["exMem", "d_memWrite"]),
    // Branch (resolved in EX) and flush: pipelined branch control AND the
    // ALU zero flag drives the next-PC mux AND clears the two young slots.
    n("n47", ["alu", "zero"], ["branchAnd", "b"]),
    n("n48", ["idEx", "q_branch"], ["branchAnd", "a"]),
    n("n49", ["branchAnd", "out"], ["pcMux", "sel"]),
    n("n50", ["branchAnd", "out"], ["ifId", "rst"]),
    n("n51", ["branchAnd", "out"], ["idEx", "rst"]),
    // Memory: effective address, store data and control from EX/MEM.
    n("n52", ["exMem", "q_aluResult"], ["dmem", "addr"]),
    n("n53", ["exMem", "q_storeData"], ["dmem", "wd"]),
    n("n54", ["exMem", "q_memRead"], ["dmem", "memRead"]),
    n("n55", ["exMem", "q_memWrite"], ["dmem", "memWrite"]),
    // EX/MEM → MEM/WB boundary.
    n("n56", ["dmem", "rdata"], ["memWb", "d_memData"]),
    n("n57", ["exMem", "q"], ["memWb", "d"]),
    n("n58", ["exMem", "q_aluResult"], ["memWb", "d_aluResult"]),
    n("n59", ["exMem", "q_rd"], ["memWb", "d_rd"]),
    n("n60", ["exMem", "q_regWrite"], ["memWb", "d_regWrite"]),
    n("n61", ["exMem", "q_memToReg"], ["memWb", "d_memToReg"]),
    // Writeback: result mux and the hybrid register file's write port.
    n("n62", ["memWb", "q_aluResult"], ["wbMux", "in0"]),
    n("n63", ["memWb", "q_memData"], ["wbMux", "in1"]),
    n("n64", ["memWb", "q_memToReg"], ["wbMux", "sel"]),
    n("n65", ["wbMux", "out"], ["reg", "wd"]),
    n("n66", ["memWb", "q_rd"], ["reg", "rd"]),
    n("n67", ["memWb", "q_regWrite"], ["reg", "we"]),
];
