/**
 * The classic five-stage pipelined MIPS datapath behind the `mips-pipelined`
 * template — a faithful transcription of the hand-authored
 * `Pipelined-MIPS.miparch` schematic export (module positions, pin schemes,
 * wiring and hand-drawn routing preserved verbatim). Pure serialized data:
 * the same object is consumed by the project template and by the headless
 * golden-pipeline check (`npm run simulation:check`, Rig E), so the shipped
 * template IS the tested netlist.
 *
 * Layout: classic left-to-right fetch / decode / execute / memory /
 * writeback with the four managed boundary walls (`ifId`, `idEx`, `exMem`,
 * `memWb`) between the stage columns. The control unit decodes once in ID
 * and its signals ride the ID/EX wall as 1/2-bit pins; the writeback
 * results and the next-PC selection route back around the outside.
 *
 * Boundary registers: multi-pin `std.register` walls with field-oriented
 * pin ids (`p1`…`p14`). Unlike earlier templates there is NO `main`
 * instruction-word pin — only IF/ID carries the raw instruction (`instr`
 * pin); EX re-derives `funct` from the sign-extended immediate (bits [5:0]
 * of the imm field overlap the funct field), and rt/rd ride the ID/EX wall
 * as dedicated 5-bit pins (p12/p13 — their display labels are historical;
 * the wiring feeds p12 from the splitter's `rd` output and p13 from `rt`,
 * and u1 maps RegDst = 1 onto p12, the true destination field). With no
 * `q` port the session's pipeline-drain check is trivially satisfied: the
 * session finishes as soon as the PC reaches the halt word, so programs
 * must land register writes ≥ 5 and stores ≥ 4 instructions before it.
 *
 * Branch: resolved in MEM, not EX — the Branch signal and the ALU Zero
 * flag are latched into EX/MEM and ANDed there (`branchAnd`), driving the
 * next-PC mux (`u3`) between PC+4 and the pre-computed branch target
 * (computed in EX off PC+4 and imm<<2, also latched into EX/MEM). There
 * are no reset pins and nothing is flushed: the three instructions behind
 * a taken branch execute as delay slots (3-cycle penalty). The starter
 * program and the Rig E programs are written delay-slot-safe.
 *
 * Hazards: deliberately NONE — this is the base pipeline. The register
 * file commits writes at the rising clock edge and reads
 * combinationally, so a write becomes visible to an ID read from 4
 * instructions of separation on (WB→ID same cycle works, distance 3 does
 * not). No forwarding, no stall logic — starter programs pad with nops.
 *
 * Timing model (hybrid modules): the register file and data memory commit
 * their asserted writes at the rising clock edge. Instruction k fetched
 * in cycle k retires (writeback commit) on the edge entering cycle k+5.
 *
 * Designator stability contract: `imem` is the assembler mapping target
 * (main → imem) and `pc` is the first `std.pc` the halt detector samples —
 * these two designators must not be renamed. `ifId`/`idEx`/`exMem`/`memWb`
 * are the settings-managed boundary registers (exactly one per stage
 * boundary index) the settings reconciler and stage visualizer rely on.
 */

import type { Pos, SerializedModule } from "../shared/types/manifest";
import type { NetStyle, SerializedNet } from "../shared/types/netlist";
import { CONTROL_ROWS } from "../shared/manifests/control/logic";
import { contiguousField } from "../shared/manifests/wiring-logic";

function m(
    designator: string,
    typeId: string,
    position: { x: number; y: number },
    config: Record<string, unknown> = {}
): SerializedModule {
    return { designator, typeId, position, rotation: 0, config };
}

/** Scene point shorthand for the hand-drawn routing below. */
function w(x: number, y: number): Pos {
    return { x, y };
}

/** A fan-out branch: routes one of `targets[1..n]` off a trunk junction. */
interface NetBranchSpec {
    target: [string, string];
    junction: Pos;
    waypoints?: Pos[];
}

/** Optional routing/style extras appended after a net's target tuples. */
interface NetExtras {
    style?: NetStyle;
    waypoints?: Pos[];
    branches?: NetBranchSpec[];
}

function n(
    id: string,
    source: [string, string],
    ...targets: Array<[string, string] | NetExtras>
): SerializedNet {
    const endpoints = targets.filter((entry): entry is [string, string] => Array.isArray(entry));
    const extras = targets.find((entry) => !Array.isArray(entry)) as NetExtras | undefined;
    const net: SerializedNet = {
        id,
        source: { designator: source[0], portId: source[1] },
        targets: endpoints.map(([designator, portId]) => ({ designator, portId })),
    };
    if (extras?.waypoints) net.waypoints = extras.waypoints;
    if (extras?.branches) {
        net.branches = extras.branches.map((branch) => ({
            target: { designator: branch.target[0], portId: branch.target[1] },
            junction: branch.junction,
            ...(branch.waypoints ? { waypoints: branch.waypoints } : {}),
        }));
    }
    if (extras?.style) net.style = extras.style;
    return net;
}

/**
 * The 23 datapath modules, laid out left-to-right (see file header). The
 * four `std.register` walls carry the hand-made field-oriented pin ids; the
 * four `std.mux2` instances keep their palette-assigned designators u1–u4
 * with explicit `selMap` assignments so each selector polarity matches the
 * classic datapath (RegDst/AluSrc/next-PC/MemToReg).
 */
export const MIPS_PIPELINED_MODULES: SerializedModule[] = [
    // -- Fetch -----------------------------------------------------------------
    // PC → imem; the +4 constant feeds the PC+4 adder whose sum latches
    // into the IF/ID wall (and fans out to the next-PC mux).
    m("pc", "std.pc", { x: -985, y: 30 }, { bitWidth: 32 }),
    m("four", "std.constant", { x: -965, y: -140 }, { value: 4, bitWidth: 32 }),
    m("pcPlus4", "std.adder", { x: -832, y: -130 }, { bitWidth: 32 }),
    m("imem", "std.imem", { x: -790, y: 25 }, { wordCount: 256, bitWidth: 32 }),

    // -- IF/ID boundary: PC+4 (for the branch target) + the instruction word.
    m("ifId", "std.register", { x: -635, y: 15 }, {
        bitWidth: 32,
        managed: true,
        stageIndex: 0,
        stageId: "IF/ID",
        pins: [
            { id: "pc4", bits: 32, label: "NextPC" },
            { id: "instr", bits: 32, label: "Instr" },
        ],
    }),

    // -- Decode ----------------------------------------------------------------
    // The splitter dissects the instruction word; the rd [15:11] and imm
    // [15:0] fields deliberately overlap.
    m("split", "std.splitter", { x: -485, y: 30 }, {
        inputBits: 32,
        outputs: [
            contiguousField(31, 26, "opcode"),
            contiguousField(25, 21, "rs"),
            contiguousField(20, 16, "rt"),
            contiguousField(15, 11, "rd"),
            contiguousField(15, 0, "imm"),
        ],
    }),
    // Decode table: R-type (add/slt/nop ride the opcode-0 row), addi, lw,
    // sw, beq — CONTROL_ROWS verbatim. The signal list repeats
    // CONTROL_SIGNALS in the hand-drawn stacking order (regWrite above
    // memToReg) so the routed control wires land where they were drawn.
    m("control", "std.control", { x: -220, y: -220 }, {
        opcodeBits: 6,
        signals: [
            { id: "regDst", bits: 1 },
            { id: "aluSrc", bits: 1 },
            { id: "regWrite", bits: 1 },
            { id: "memToReg", bits: 1 },
            { id: "memRead", bits: 1 },
            { id: "memWrite", bits: 1 },
            { id: "branch", bits: 1 },
            { id: "aluOp", bits: 2 },
        ],
        rows: CONTROL_ROWS,
    }),
    m("reg", "std.regfile", { x: -250, y: 50 }, { registerCount: 32, bitWidth: 32 }),
    m("ext", "std.extender", { x: -140, y: 205 }, { inputBits: 16, outputBits: 32, isSigned: true }),

    // -- ID/EX boundary: operands, extended immediate, PC+4, rt/rd, control.
    // NOTE: the p12/p13 display labels are historical — the wiring feeds
    // p12 from the splitter's `rd` output and p13 from `rt`, so u1's
    // RegDst = 1 lands on the true destination field.
    m("idEx", "std.register", { x: 35, y: -180 }, {
        bitWidth: 32,
        managed: true,
        stageIndex: 1,
        stageId: "ID/EX",
        pins: [
            { id: "p14", bits: 32, label: "NextPC" },
            { id: "p1", bits: 1, label: "RegDst" },
            { id: "p2", bits: 1, label: "AluSrc" },
            { id: "p4", bits: 1, label: "RegWrite" },
            { id: "p3", bits: 1, label: "MemToReg" },
            { id: "p5", bits: 1, label: "MemRead" },
            { id: "p6", bits: 1, label: "MemWrite" },
            { id: "p7", bits: 1, label: "Branch" },
            { id: "p8", bits: 2, label: "AluOp" },
            { id: "p9", bits: 32, label: "Reg1Data" },
            { id: "p10", bits: 32, label: "Reg2Data" },
            { id: "p11", bits: 32, label: "Imm" },
            { id: "p12", bits: 5, label: "Rt" },
            { id: "p13", bits: 5, label: "Rd" },
        ],
    }),

    // -- Execute ---------------------------------------------------------------
    // funct is re-derived in EX off the sign-extended immediate (imm bits
    // [5:0] overlap the funct field) — no instruction word rides past ID.
    m("splitEx", "std.splitter", { x: 350, y: 5 }, {
        inputBits: 32,
        outputs: [contiguousField(5, 0, "funct")],
    }),
    m("aluControl", "std.alu-control", { x: 480, y: -5 }),
    m("shift2", "std.shifter", { x: 255, y: -305 }, { bitWidth: 32, mode: "logical_left", shamt: 2 }),
    m("alu", "std.alu", { x: 495, y: -110 }, { bitWidth: 32 }),
    m("branchAdder", "std.adder", { x: 440, y: -315 }, { bitWidth: 32 }),
    m("branchAnd", "std.and", { x: 865, y: -285 }, { op: "and" }),
    // u1: destination register (RegDst = 1 forwards in0, the rd field).
    // u2: ALU second operand (AluSrc = 1 forwards in1, the immediate).
    m("u1", "std.mux2", { x: 210, y: 75 }, { bitWidth: 5, numInputs: 2, selMap: [1, 0], selPosition: "top" }),
    m("u2", "std.mux2", { x: 325, y: -80 }, { bitWidth: 32, numInputs: 2, selMap: [0, 1], selPosition: "top" }),

    // -- EX/MEM boundary: control, ALU result/zero, store data, target, dest.
    m("exMem", "std.register", { x: 685, y: -160 }, {
        bitWidth: 32,
        managed: true,
        stageIndex: 2,
        stageId: "EX/MEM",
        pins: [
            { id: "instr", bits: 1, label: "RegWrite" },
            { id: "p1", bits: 1, label: "MemToReg" },
            { id: "p2", bits: 1, label: "MemRead" },
            { id: "p3", bits: 1, label: "MemWrite" },
            { id: "p4", bits: 1, label: "Branch" },
            { id: "p5", bits: 32, label: "TargetPC" },
            { id: "aluResult", bits: 1, label: "Zero" },
            { id: "storeData", bits: 32, label: "ALUResult" },
            { id: "rd", bits: 32, label: "MemWrData" },
            { id: "p6", bits: 5, label: "DestReg" },
        ],
    }),

    // -- Memory ----------------------------------------------------------------
    m("dmem", "std.dmem", { x: 875, y: -50 }, { wordCount: 256, bitWidth: 32 }),

    // -- MEM/WB boundary: control, loaded data, ALU result, destination.
    m("memWb", "std.register", { x: 1045, y: 45 }, {
        bitWidth: 32,
        managed: true,
        stageIndex: 3,
        stageId: "MEM/WB",
        pins: [
            { id: "regWrite", bits: 1, label: "RegWrite" },
            { id: "memToReg", bits: 1, label: "MemToReg" },
            { id: "p1", bits: 32, label: "MemReadData" },
            { id: "p2", bits: 32, label: "ALUResult" },
            { id: "rd", bits: 5, label: "DestReg" },
        ],
    }),

    // -- Write back / next PC --------------------------------------------------
    // u3: next PC (in0 = PC+4, in1 = the branch target when Branch ∧ Zero
    // — asserted during the branch's MEM stage, so three delay slots
    // execute behind a taken branch and nothing is flushed).
    // u4: writeback result (MemToReg = 1 forwards in0, the loaded word).
    m("u3", "std.mux2", { x: 865, y: -365 }, { bitWidth: 32, numInputs: 2, selMap: [0, 1], selPosition: "bottom" }),
    m("u4", "std.mux2", { x: 1145, y: 55 }, { bitWidth: 32, numInputs: 2, selMap: [1, 0], selPosition: "top" }),
];

/**
 * The complete netlist: fetch path, IF/ID latch, decode/control fan-out,
 * ID/EX latch, execute + branch-target computation, EX/MEM latch, memory
 * path + MEM-resolved branch, MEM/WB latch, and writeback — with the
 * hand-drawn orthogonal routing (trunk waypoints, junction branches and
 * dotted control styles) exactly as exported.
 *
 * Cycle audit (why this compiles): every combinational cone is bounded by
 * an edge-sampled input. The next-PC loop closes through the sequential
 * `pc` — the branch AND reads EX/MEM outputs, so it is asserted during
 * the branch's MEM stage; the writeback loop (memWb → u4 → reg.wd)
 * targets the hybrid register file's clocked write port; and the
 * data-memory inputs come from the EX/MEM register. Instruction k fetched
 * in cycle k retires on the edge entering cycle k+5; a taken beq
 * redirects the PC at the edge ending its MEM stage while the three
 * younger instructions keep executing (delay slots — nothing is flushed).
 */
export const MIPS_PIPELINED_NETS: SerializedNet[] = [
    // Fetch: PC → imem and the +4 adder; PC+4 latches into IF/ID and fans
    // out to the next-PC mux; the fetched word latches into IF/ID.
    n("n01", ["pc", "q"], ["imem", "addr"], ["pcPlus4", "b"], {
        branches: [
            { target: ["pcPlus4", "b"], junction: w(-910, 30), waypoints: [w(-900, -120), w(-880, -120)] },
        ],
    }),
    n("n68", ["four", "out"], ["pcPlus4", "a"]),
    n("n71", ["pcPlus4", "sum"], ["ifId", "d_pc4"], ["u3", "in0"], {
        waypoints: [w(-700, -130), w(-700, 5)],
        branches: [
            { target: ["u3", "in0"], junction: w(-700, -128.01610963535614), waypoints: [w(-700, -375), w(815, -375), w(815, -375)] },
        ],
    }),
    n("n110", ["imem", "instruction"], ["ifId", "d_instr"], {
        waypoints: [w(-740, 25), w(-700, 25)],
    }),

    // Decode: the IF/ID word is dissected; control decodes once, in ID.
    n("n111", ["ifId", "q_instr"], ["split", "in"]),
    n("n08", ["split", "out_opcode"], ["control", "opcode"], {
        waypoints: [w(-405, -15.5), w(-405, -220), w(-270, -220)],
    }),
    n("n77", ["split", "out_rs"], ["reg", "rs"]),
    n("n91", ["split", "out_rt"], ["reg", "rt"], ["idEx", "d_p13"], {
        branches: [
            { target: ["idEx", "d_p13"], junction: w(-385, 30), waypoints: [w(-385, 30), w(-385, 275), w(-25, 275), w(-25, -50)] },
        ],
    }),
    n("n90", ["split", "out_rd"], ["idEx", "d_p12"], {
        waypoints: [w(-400, 45), w(-400, 255), w(-50, 255), w(-50, -70)],
    }),
    n("n76", ["split", "out_imm"], ["ext", "in"], {
        waypoints: [w(-415, 60), w(-415, 205)],
    }),

    // Control fan-out + decode results latch into the ID/EX wall (the
    // pipelined control wires ride the pipe as 1/2-bit pins).
    n("n79", ["control", "regDst"], ["idEx", "d_p1"]),
    n("n80", ["control", "aluSrc"], ["idEx", "d_p2"]),
    n("n81", ["control", "memToReg"], ["idEx", "d_p3"]),
    n("n82", ["control", "regWrite"], ["idEx", "d_p4"]),
    n("n83", ["control", "memRead"], ["idEx", "d_p5"]),
    n("n84", ["control", "memWrite"], ["idEx", "d_p6"]),
    n("n85", ["control", "branch"], ["idEx", "d_p7"]),
    n("n86", ["control", "aluOp"], ["idEx", "d_p8"]),
    n("n87", ["reg", "readA"], ["idEx", "d_p9"], { waypoints: [w(-125, 0), w(-125, -130)] }),
    n("n88", ["reg", "readB"], ["idEx", "d_p10"], { waypoints: [w(-100, 30), w(-100, -110)] }),
    n("n89", ["ext", "out"], ["idEx", "d_p11"], { waypoints: [w(-75, 205), w(-75, -90)] }),
    n("n95", ["ifId", "q_pc4"], ["idEx", "d_p14"], {
        waypoints: [w(-575, 5), w(-575, -330), w(-35, -330), w(-35, -310)],
    }),

    // Execute: destination selection (u1), ALU operand selection (u2), the
    // branch-target adder, and the funct re-derivation off the immediate.
    n("n96", ["idEx", "q_p10"], ["exMem", "d_rd"], ["u2", "in0"], {
        waypoints: [w(75, -105), w(270, -105), w(270, 55), w(575, 55), w(575, -90)],
        branches: [
            { target: ["u2", "in0"], junction: w(270, -90), waypoints: [w(285.2954641661453, -90), w(310, -90)] },
        ],
    }),
    n("n97", ["idEx", "q_p9"], ["alu", "a"], { waypoints: [w(435, -130), w(435, -140), w(465, -140)] }),
    n("n99", ["splitEx", "out_funct"], ["aluControl", "funct"]),
    n("n101", ["idEx", "q_p11"], ["shift2", "in"], ["splitEx", "in"], ["u2", "in1"], {
        waypoints: [w(175, -90), w(175, -305)],
        branches: [
            { target: ["splitEx", "in"], junction: w(175, -90), waypoints: [w(175, -90), w(175, 5)] },
            { target: ["u2", "in1"], junction: w(175, -70), waypoints: [w(175, -70), w(310, -70)] },
        ],
    }),
    n("n102", ["idEx", "q_p14"], ["branchAdder", "a"], {
        waypoints: [w(120, -310), w(120, -350), w(380, -350), w(380, -325)],
    }),
    n("n103", ["shift2", "out"], ["branchAdder", "b"], { waypoints: [w(350, -305), w(395, -305)] }),
    n("n107", ["idEx", "q_p8"], ["aluControl", "aluop"], { style: "dotted", waypoints: [w(395, -150), w(395, -15)] }),
    n("n108", ["aluControl", "operation"], ["alu", "op"], { style: "dotted", waypoints: [w(530, -5), w(530, -71)] }),
    n("n141", ["idEx", "q_p12"], ["u1", "in0"], { waypoints: [w(100, -70), w(100, 65)] }),
    n("n142", ["idEx", "q_p13"], ["u1", "in1"], { waypoints: [w(90, -50), w(90, 85)] }),
    n("n144", ["idEx", "q_p1"], ["u1", "sel"], { style: "dotted", waypoints: [w(115, -290), w(115, 30), w(210, 30)] }),
    n("n145", ["u2", "out"], ["alu", "b"]),
    n("n146", ["idEx", "q_p2"], ["u2", "sel"], { style: "dotted" }),

    // EX → EX/MEM wall: control, ALU result/zero, store data, branch
    // target and the selected destination register.
    n("n112", ["idEx", "q_p3"], ["exMem", "d_p1"], { style: "dotted" }),
    n("n113", ["idEx", "q_p4"], ["exMem", "d_instr"], { style: "dotted" }),
    n("n114", ["idEx", "q_p5"], ["exMem", "d_p2"], { style: "dotted" }),
    n("n115", ["idEx", "q_p6"], ["exMem", "d_p3"], { style: "dotted" }),
    n("n116", ["idEx", "q_p7"], ["exMem", "d_p4"], { style: "dotted" }),
    n("n117", ["alu", "zero"], ["exMem", "d_aluResult"], { waypoints: [w(630, -120), w(630, -130)] }),
    n("n118", ["alu", "result"], ["exMem", "d_storeData"], { waypoints: [w(570, -110), w(645, -110)] }),
    n("n126", ["branchAdder", "sum"], ["exMem", "d_p5"], { waypoints: [w(610, -315), w(610, -150)] }),
    n("n143", ["u1", "out"], ["exMem", "d_p6"], { waypoints: [w(225, 75), w(610, 75), w(610, -70)] }),

    // Memory: effective address, store data and control from EX/MEM; the
    // branch resolves here (Branch ∧ Zero latched in EX/MEM gate the
    // next-PC mux; the target was pre-computed in EX and latched too).
    n("n123", ["exMem", "q_p4"], ["branchAnd", "a"], { style: "dotted", waypoints: [w(785, -170), w(785, -295)] }),
    n("n124", ["exMem", "q_aluResult"], ["branchAnd", "b"], { waypoints: [w(805, -130), w(805, -275)] }),
    n("n125", ["exMem", "q_storeData"], ["dmem", "addr"], ["memWb", "d_p2"], {
        waypoints: [w(775, -65)],
        branches: [
            { target: ["memWb", "d_p2"], junction: w(775.0929891729495, -65), waypoints: [w(775.0929891729495, 65), w(1005, 65)] },
        ],
    }),
    n("n128", ["exMem", "q_rd"], ["dmem", "wd"], { waypoints: [w(755, -90), w(755, -10)] }),
    n("n131", ["exMem", "q_p2"], ["dmem", "memRead"], { style: "dotted" }),
    n("n134", ["exMem", "q_p3"], ["dmem", "memWrite"]),
    n("n148", ["exMem", "q_p5"], ["u3", "in1"], { waypoints: [w(750, -150), w(750, -355)] }),
    n("n149", ["branchAnd", "out"], ["u3", "sel"], { style: "dotted", waypoints: [w(930, -285), w(930, -330), w(865, -330)] }),
    n("n147", ["u3", "out"], ["pc", "d"], {
        waypoints: [w(880, -365), w(905, -365), w(905, -400), w(-1110, -400), w(-1110, 25), w(-1025, 25)],
    }),

    // EX/MEM → MEM/WB wall, then writeback: the result mux (u4) and the
    // hybrid register file's write port, routed back along the bottom.
    n("n129", ["dmem", "rdata"], ["memWb", "d_p1"], { waypoints: [w(950, -10), w(950, 45), w(1005, 45)] }),
    n("n133", ["exMem", "q_p1"], ["memWb", "d_memToReg"], { style: "dotted", waypoints: [w(975, -230), w(975, 25)] }),
    n("n135", ["exMem", "q_instr"], ["memWb", "d_regWrite"], { style: "dotted", waypoints: [w(995, -250), w(995, 5)] }),
    n("n130", ["exMem", "q_p6"], ["memWb", "d_rd"], { waypoints: [w(740, -70), w(740, 85)] }),
    n("n150", ["memWb", "q_memToReg"], ["u4", "sel"], { style: "dotted" }),
    n("n151", ["memWb", "q_p1"], ["u4", "in0"]),
    n("n152", ["memWb", "q_p2"], ["u4", "in1"]),
    n("n153", ["u4", "out"], ["reg", "wd"], { waypoints: [w(1175, 55), w(1175, 295), w(-320, 295), w(-320, 100)] }),
    n("n140", ["memWb", "q_rd"], ["reg", "rd"], { style: "solid", waypoints: [w(1110, 85), w(1110, 310), w(-335, 310), w(-335, 70)] }),
    n("n137", ["memWb", "q_regWrite"], ["reg", "we"], { style: "dotted", waypoints: [w(1110, 5), w(1110, -425), w(-315, -425), w(-315, -65), w(-250, -65)] }),

];
