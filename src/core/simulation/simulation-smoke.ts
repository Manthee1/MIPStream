/** @format */

/**
 * Standalone simulation-session self-check — the Phase 2 exit criteria, run
 * headlessly through the public assembler → loader → session → engine stack
 * with the real MIPS preset (no UI dependencies). Execute via
 * `npm run simulation:check`.
 *
 * Two rigs:
 * - Rig A (no PC): image write-through, one-to-many mappings, `.data`
 *   packing, capacity/validation errors, the full control state machine,
 *   empty-program halt.
 * - Rig B (minimal executable datapath): a PC/imem/splitter/regfile/adder/
 *   dmem netlist that executes real preset-ISA `add` programs — per-cycle
 *   memory transitions, PC-past-end halt at the exact cycle, restart
 *   semantics and batched advance.
 */

import { MIPS_ASSEMBLER_CONFIG } from "@/config/isa-presets";
import type { ArchitectureDocument } from "@/core/engine/compile/compiler";
import { SimulationEngine } from "@/core/engine/engine";
import { registerManifest } from "@/shared/manifestRegistry";
import {
    createWordMemoryState,
    readWord,
    writeWord,
    type WordMemoryState,
} from "@/shared/manifests/word-memory";
import {
    createRegisterFileState,
    readRegister,
    writeRegister,
    type RegisterFileState,
} from "@/shared/manifests/register-file/logic";
import { registerTransfer } from "@/shared/manifests/register/logic";
import { resolveSplitterFields, type SplitterConfig } from "@/shared/manifests/splitter/logic";
import { clampWiringBits, contiguousField, remapFromBus } from "@/shared/manifests/wiring-logic";
import type {
    ModuleEvaluators,
    ModuleManifest,
    PortDefinition,
    SerializedModule,
} from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import type { ArchitectureConfiguration } from "@/shared/types/architecture";
import type { ProjectEditor } from "@/shared/types/project";
import { fitWidth, widthMask } from "@/shared/utils/bit-ops";
import { buildLoadPlan, packBytesToWords, scanSimulationTargets } from "./program-loader";
import { SimulationSession } from "./simulation-session";

/** Node process API — only the SSR-built smoke bundle actually executes it. */
declare const process: { exit(code?: number): void };

let failures = 0;

function report(pass: boolean, label: string, detail: string): void {
    if (!pass) failures++;
    console.log(`${pass ? "PASS" : "FAIL"}  ${label}${pass ? "" : `  ${detail}`}`);
}

function check(label: string, actual: unknown, expected: unknown): void {
    report(actual === expected, label, `(got ${String(actual)}, want ${String(expected)})`);
}

function checkHex(label: string, actual: number, expected: number): void {
    report(
        actual === expected,
        label,
        `(got 0x${(actual >>> 0).toString(16)}, want 0x${expected.toString(16)})`,
    );
}

function checkIncludes(label: string, haystack: string[], needle: string): void {
    report(
        haystack.some((item) => item.includes(needle)),
        label,
        `(no message containing "${needle}" in [${haystack.join(" | ")}])`,
    );
}

// ---------------------------------------------------------------- test rigs

function module(
    designator: string,
    typeId: string,
    config: Record<string, unknown> = {}
): SerializedModule {
    return { designator, typeId, position: { x: 0, y: 0 }, rotation: 0, config };
}

function net(
    id: string,
    source: [string, string],
    ...targets: [string, string][]
): SerializedNet {
    return {
        id,
        source: { designator: source[0], portId: source[1] },
        targets: targets.map(([designator, portId]) => ({ designator, portId })),
    };
}

function configuration(
    mappings: ArchitectureConfiguration["assembler"]["mappings"]
): ArchitectureConfiguration {
    return { pipeline: { enabled: false, stages: [] }, assembler: { mappings }, isa: MIPS_ASSEMBLER_CONFIG };
}

function editor(id: string, sourceCode: string): ProjectEditor {
    return { id, name: `${id}.s`, sourceCode };
}

// ------------------------------------------------------- mirror manifests
//
// The real manifests import Vue panels and Konva draw code, which cannot be
// bundled for a headless Node run (the same reason engine-smoke uses inline
// manifests). These mirrors register the REAL typeIds and reuse the REAL
// pure logic modules (`word-memory`, `register-file/logic`, `register/logic`,
// `splitter/logic`, `wiring-logic`) — only the manifest metadata (ports,
// evaluator wiring) is restated, so the state shapes and semantics the
// loader and session must work against are the real ones.

const mirrorConstant: ModuleManifest<{ value: number; bitWidth: number }> = {
    typeId: "std.constant",
    label: "Constant",
    description: "",
    icon: "",
    category: "iO",
    defaultConfig: { value: 4, bitWidth: 32 },
    generatePorts: (config) => [
        { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => ({
        inputPorts: [],
        outputPorts: ["out"],
        evaluate: () => new Uint32Array([fitWidth(config.value, config.bitWidth)]),
    }),
};

const mirrorAdder: ModuleManifest<{ bitWidth: number }> = {
    typeId: "std.adder",
    label: "Adder",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { bitWidth: 32 },
    generatePorts: (config) => [
        { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -40, y: -10 } },
        { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -40, y: 10 } },
        { id: "cin", direction: "input", bits: 1, label: "Cin", position: { x: 0, y: -40 } },
        { id: "sum", direction: "output", bits: config.bitWidth, label: "Sum", position: { x: 40, y: 0 } },
        { id: "cout", direction: "output", bits: 1, label: "Cout", position: { x: 0, y: 40 } },
    ],
    createEvaluators: (config): ModuleEvaluators => {
        const mask = widthMask(config.bitWidth);
        return {
            inputPorts: ["a", "b", "cin"],
            outputPorts: ["sum", "cout"],
            evaluate: (inputs) => {
                const total = (inputs[0] >>> 0) + (inputs[1] >>> 0) + (inputs[2] & 1);
                const outputs = new Uint32Array(2);
                outputs[0] = (total & mask) >>> 0;
                outputs[1] = total > mask ? 1 : 0;
                return outputs;
            },
        };
    },
};

const mirrorImem: ModuleManifest<{ wordCount: number; bitWidth: number; state?: WordMemoryState }> = {
    typeId: "std.imem",
    label: "Instruction Memory",
    description: "",
    icon: "",
    category: "memory",
    defaultConfig: { wordCount: 64, bitWidth: 32 },
    createInitialState: (config) => createWordMemoryState(config.wordCount),
    generatePorts: (config) => [
        { id: "addr", direction: "input", bits: 32, label: "Address", position: { x: -50, y: 0 } },
        { id: "instruction", direction: "output", bits: config.bitWidth, label: "Instruction", position: { x: 50, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => {
        const state = config.state ?? createWordMemoryState(config.wordCount);
        const mask = widthMask(config.bitWidth);
        return {
            inputPorts: ["addr"],
            outputPorts: ["instruction"],
            evaluate: (inputs) => new Uint32Array([readWord(state, inputs[0], mask)]),
        };
    },
};

const mirrorDmem: ModuleManifest<{ wordCount: number; bitWidth: number; state?: WordMemoryState }> = {
    typeId: "std.dmem",
    label: "Data Memory",
    description: "",
    icon: "",
    category: "memory",
    defaultConfig: { wordCount: 64, bitWidth: 32 },
    createInitialState: (config) => createWordMemoryState(config.wordCount),
    generatePorts: (config) => [
        { id: "addr", direction: "input", bits: 32, label: "Address", position: { x: -50, y: -25 } },
        { id: "wd", direction: "input", bits: config.bitWidth, label: "Write Data", position: { x: -50, y: 25 } },
        { id: "rdata", direction: "output", bits: config.bitWidth, label: "Read Data", position: { x: 50, y: 0 } },
        { id: "memWrite", direction: "input", bits: 1, label: "MemWrite", position: { x: -25, y: 55 } },
        { id: "memRead", direction: "input", bits: 1, label: "MemRead", position: { x: 25, y: 55 } },
    ],
    createEvaluators: (config): ModuleEvaluators => {
        const state = config.state ?? createWordMemoryState(config.wordCount);
        const mask = widthMask(config.bitWidth);
        return {
            inputPorts: ["addr", "wd", "memWrite", "memRead"],
            outputPorts: ["rdata"],
            evaluate: (inputs) => {
                const rdata = inputs[3] & 1 ? readWord(state, inputs[0], mask) : 0;
                if (inputs[2] & 1) writeWord(state, inputs[0], inputs[1], mask);
                return new Uint32Array([rdata]);
            },
        };
    },
};

const mirrorPc: ModuleManifest<{ bitWidth: number }> = {
    typeId: "std.pc",
    label: "Program Counter",
    description: "",
    icon: "",
    category: "memory",
    defaultConfig: { bitWidth: 32 },
    generatePorts: (config) => [
        { id: "d", direction: "input", bits: config.bitWidth, label: "D", position: { x: -40, y: 0 } },
        { id: "q", direction: "output", bits: config.bitWidth, label: "PC", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => ({
        inputPorts: ["d"],
        outputPorts: ["q"],
        clockEdge: "rising",
        evaluate: (inputs) => new Uint32Array([registerTransfer(inputs[0], config.bitWidth)]),
    }),
};

const mirrorRegfile: ModuleManifest<{
    registerCount: number;
    bitWidth: number;
    state?: RegisterFileState;
}> = {
    typeId: "std.regfile",
    label: "Register File",
    description: "",
    icon: "",
    category: "memory",
    defaultConfig: { registerCount: 32, bitWidth: 32 },
    createInitialState: (config) => createRegisterFileState(config.registerCount),
    generatePorts: (config) => {
        const addressBits = Math.max(1, Math.ceil(Math.log2(config.registerCount)));
        return [
            { id: "rs", direction: "input", bits: addressBits, label: "Read Reg 1", position: { x: -50, y: -50 } },
            { id: "rt", direction: "input", bits: addressBits, label: "Read Reg 2", position: { x: -50, y: -30 } },
            { id: "rd", direction: "input", bits: addressBits, label: "Write Reg", position: { x: -50, y: 30 } },
            { id: "wd", direction: "input", bits: config.bitWidth, label: "Write Data", position: { x: 50, y: 30 } },
            { id: "we", direction: "input", bits: 1, label: "Write Enable", position: { x: 0, y: 60 } },
            { id: "readA", direction: "output", bits: config.bitWidth, label: "Read Data 1", position: { x: 50, y: -50 } },
            { id: "readB", direction: "output", bits: config.bitWidth, label: "Read Data 2", position: { x: 50, y: -30 } },
        ];
    },
    createEvaluators: (config): ModuleEvaluators => {
        const state = config.state ?? createRegisterFileState(config.registerCount);
        const mask = widthMask(config.bitWidth);
        return {
            inputPorts: ["rs", "rt", "rd", "wd", "we"],
            outputPorts: ["readA", "readB"],
            evaluate: (inputs) => {
                const readA = readRegister(state, inputs[0], mask);
                const readB = readRegister(state, inputs[1], mask);
                if (inputs[4] & 1) writeRegister(state, inputs[2], inputs[3], mask);
                return new Uint32Array([readA, readB]);
            },
        };
    },
};

const mirrorSplitter: ModuleManifest<SplitterConfig> = {
    typeId: "std.splitter",
    label: "Bit Splitter",
    description: "",
    icon: "",
    category: "wiring",
    defaultConfig: {
        inputBits: 32,
        outputs: [contiguousField(31, 16, "f1"), contiguousField(15, 0, "f2")],
    },
    generatePorts: (config) => {
        const busBits = clampWiringBits(config.inputBits);
        const fields = resolveSplitterFields(config);
        const ports: PortDefinition[] = [
            { id: "in", direction: "input", bits: busBits, label: "In", position: { x: -44, y: 0 } },
        ];
        fields.forEach((field, i) => {
            ports.push({
                id: `out_${field.id}`,
                direction: "output",
                bits: field.bits,
                label: field.label || `Out ${i + 1}`,
                position: { x: 44, y: (i - (fields.length - 1) / 2) * 20 },
            });
        });
        return ports;
    },
    createEvaluators: (config): ModuleEvaluators => {
        const busBits = clampWiringBits(config.inputBits);
        const fields = resolveSplitterFields(config);
        const mask = widthMask(busBits);
        return {
            inputPorts: ["in"],
            outputPorts: fields.map((field) => `out_${field.id}`),
            evaluate: (inputs) => {
                const bus = (inputs[0] >>> 0) & mask;
                const out = new Uint32Array(fields.length);
                for (let i = 0; i < fields.length; i++) out[i] = remapFromBus(bus, fields[i]);
                return out;
            },
        };
    },
};

registerManifest(mirrorConstant);
registerManifest(mirrorAdder);
registerManifest(mirrorImem);
registerManifest(mirrorDmem);
registerManifest(mirrorPc);
registerManifest(mirrorRegfile);
registerManifest(mirrorSplitter);

// ---------------------------------------------------------------- Rig A
// No PC: image write-through, one-to-many mappings, `.data` packing,
// validation errors, the full control state machine, empty-program halt.

const rigADoc: ArchitectureDocument = {
    modules: [
        module("imem1", "std.imem", { wordCount: 64, bitWidth: 32 }),
        module("imem2", "std.imem", { wordCount: 64, bitWidth: 32 }),
        module("dmem1", "std.dmem", { wordCount: 64, bitWidth: 32 }),
    ],
    nets: [],
};

{
    const targets = scanSimulationTargets(rigADoc);
    check("scan: both instruction memories found", targets.instructionMemories.join(","), "imem1,imem2");
    check("scan: data memory found", targets.dataMemories.join(","), "dmem1");
    check("scan: no PC → null (halt detection disabled)", targets.pcDesignator, null);
}

{
    const words = packBytesToWords([0x78, 0x56, 0x34, 0x12, 0xcd, 0xab]);
    check("pack: word 0 little-endian", words[0], 0x12345678);
    check("pack: partial trailing word zero-filled", words[1], 0x0000abcd);
    check("pack: empty image", packBytesToWords([]).length, 0);
}

const RIG_A_SOURCE =
    ".data\nx: .word 0x12345678\ny: .half 0xABCD\n.text\nadd $t0, $s1, $s2\naddi $t1, $t1, 5\n";
const rigAEngine = new SimulationEngine(rigADoc);
const sessionA = new SimulationSession(rigAEngine, scanSimulationTargets(rigADoc));

// Fresh-session guards: every control except a full load is rejected.
check("session: fresh status is unloaded", sessionA.status, "unloaded");
check("session: step rejected while unloaded", sessionA.step(), null);
check("session: pause rejected while unloaded", sessionA.pause(), false);
check("session: stop rejected while unloaded", sessionA.stop(), false);
check("session: restart rejected while unloaded", sessionA.restart(), false);
check("session: start rejected with no program", sessionA.start(), false);

const builtA = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imem1", "imem2"] }]),
    editors: [editor("main", RIG_A_SOURCE)],
    targets: sessionA.simulationTargets,
});
check("build: no load errors", builtA.loadErrors.length, 0);
check("build: no assembler diagnostics", builtA.plan.assemblerDiagnostics.length, 0);
check("build: instruction count", builtA.plan.instructionCount, 2);
check("load: ok", sessionA.load(builtA.plan).ok, true);
check("load: status paused at instruction 0", sessionA.status, "paused");
check("load: cycle count reset", sessionA.cycleCount, 0);

const imem1 = rigAEngine.getModuleState("imem1") as WordMemoryState;
const imem2 = rigAEngine.getModuleState("imem2") as WordMemoryState;
checkHex("load: imem1 word 0 = add encoding", imem1.words[0], 0x02324020);
checkHex("load: imem1 word 1 = addi encoding", imem1.words[1], 0x21290005);
checkHex("load: one-to-many — imem2 word 0 identical", imem2.words[0], 0x02324020);
checkHex("load: image stops at program length", imem1.words[2], 0);

const dmem1 = rigAEngine.getModuleState("dmem1") as WordMemoryState;
checkHex("load: .data word 0 packed LE", dmem1.words[0], 0x12345678);
checkHex("load: .data word 1 packed LE", dmem1.words[1], 0x0000abcd);
check("load: source snapshot kept for restart", sessionA.loadedSources.get("main"), RIG_A_SOURCE);

// Control state machine walk (no PC → the session never halts on its own).
check("start: paused → running (resume)", sessionA.start(), true);
check("start: idempotent while running", sessionA.start(), true);
check("advance: 3 cycles executed", sessionA.advance(3), 3);
check("advance: cycle count", sessionA.cycleCount, 3);
check("pause: running → paused", sessionA.pause(), true);
check("pause: rejected while paused", sessionA.pause(), false);
check("advance: rejected while paused", sessionA.advance(1), 0);
check("step: paused advances one cycle", sessionA.step(), "paused");
check("step: cycle count", sessionA.cycleCount, 4);
check("restart: paused → paused at 0", sessionA.restart(), true);
check("restart: cycle count reset", sessionA.cycleCount, 0);
checkHex(
    "restart: images re-applied after reset",
    (rigAEngine.getModuleState("imem1") as WordMemoryState).words[0],
    0x02324020
);
check("stop: paused → stopped", sessionA.stop(), true);
check("stop: rejected while stopped", sessionA.stop(), false);
check("step: rejected while stopped", sessionA.step(), null);
check("restart: rejected while stopped (spec: program must be loaded)", sessionA.restart(), false);
check("start: stopped → reload and run", sessionA.start(), true);
check("start: reload resets the cycle count", sessionA.cycleCount, 0);
check("start: running again", sessionA.status, "running");
check("advance: runs after start", sessionA.advance(2), 2);
check("stop: running → stopped", sessionA.stop(), true);
check("stop: state preserved for post-mortem inspection", sessionA.cycleCount, 2);

// Broken programs are refused without touching the loaded session.
const brokenA = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imem1", "imem2"] }]),
    editors: [editor("main", ".text\nbogus $t0\n")],
    targets: sessionA.simulationTargets,
});
check("diagnostics: build collects assembler diagnostics", brokenA.plan.assemblerDiagnostics.length > 0, true);
check("diagnostics: load refuses broken plan", sessionA.load(brokenA.plan).ok, false);
check("diagnostics: stopped status preserved", sessionA.status, "stopped");
check(
    "diagnostics: previous images intact",
    (rigAEngine.getModuleState("imem1") as WordMemoryState).words[0] === 0x02324020,
    true
);

// Unknown memory designator / unknown editor in the mapping matrix.
const ghostTarget = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["ghost"] }]),
    editors: [editor("main", RIG_A_SOURCE)],
    targets: sessionA.simulationTargets,
});
checkIncludes("mapping: unknown instruction memory reported", ghostTarget.loadErrors, "unknown instruction memory");

const ghostEditor = buildLoadPlan({
    configuration: configuration([{ editorId: "ghost", memoryModuleIds: ["imem1"] }]),
    editors: [editor("main", RIG_A_SOURCE)],
    targets: sessionA.simulationTargets,
});
checkIncludes("mapping: unknown editor reported", ghostEditor.loadErrors, "unknown editor");

// Capacity: a 3-word program does not fit a 2-word instruction memory.
const smallDoc: ArchitectureDocument = {
    modules: [module("imemS", "std.imem", { wordCount: 2, bitWidth: 32 })],
    nets: [],
};
const smallEngine = new SimulationEngine(smallDoc);
const sessionS = new SimulationSession(smallEngine, scanSimulationTargets(smallDoc));
const bigProgram = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imemS"] }]),
    editors: [editor("main", ".text\nnop\nnop\nnop\n")],
    targets: sessionS.simulationTargets,
});
const smallReport = sessionS.load(bigProgram.plan);
check("capacity: load fails", smallReport.ok, false);
checkIncludes("capacity: overflow reported", smallReport.loadErrors, "exceeds");
check("capacity: no program loaded after failure", sessionS.status, "unloaded");

// Empty program (no .text): loads clean, halts on the first step.
const emptyPlan = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imemS"] }]),
    editors: [editor("main", ".data\nx: .word 1\n")],
    targets: sessionS.simulationTargets,
});
check("empty: loads clean", sessionS.load(emptyPlan.plan).ok, true);
check("empty: instruction count is 0", emptyPlan.plan.instructionCount, 0);
check("empty: halts on first step", sessionS.step(), "finished");
check("empty: one cycle executed", sessionS.cycleCount, 1);

// Mapping-less netlists (generic circuits): a trivial load enables stepping
// and continuous runs, and never halts on its own.
const noMapping = buildLoadPlan({
    configuration: configuration([]),
    editors: [editor("main", RIG_A_SOURCE)],
    targets: sessionA.simulationTargets,
});
check("no-mapping: trivial load ok", sessionA.load(noMapping.plan).ok, true);
check("no-mapping: plan has no entries", noMapping.plan.entries.length, 0);
check("no-mapping: step does not halt", sessionA.step(), "paused");
check("no-mapping: start → running", sessionA.start(), true);
check("no-mapping: advance runs freely", sessionA.advance(5), 5);

// ---------------------------------------------------------------- Rig B
// Minimal executable datapath: PC + PC+4 adder loop + imem + splitter
// (rs/rt/rd + the add-funct bit) + regfile + ALU adder + dmem. Each cycle
// the instruction at the PC writes rs+rt into dmem word 0 (memWrite is the
// add funct bit, so the empty word past the program writes nothing) and
// writes a constant into the instruction's rd register.
//
// NOTE (Phase 3 handoff): the classic single-cycle writeback wiring
// (regfile → ALU → regfile.wd) is a module-granularity combinational cycle
// under the engine's topological sort and will NOT compile — the real
// datapath design must resolve this (e.g. an edge-triggered write path).
// This rig therefore drives the regfile's write inputs from constants.

const rigBDoc: ArchitectureDocument = {
    modules: [
        module("pc", "std.pc"),
        module("four", "std.constant", { value: 4, bitWidth: 32 }),
        module("addPC", "std.adder"),
        module("imem", "std.imem", { wordCount: 64, bitWidth: 32 }),
        module("split", "std.splitter", {
            inputBits: 32,
            outputs: [
                contiguousField(25, 21, "rs"),
                contiguousField(20, 16, "rt"),
                contiguousField(15, 11, "rd"),
                contiguousField(5, 5, "f5"),
            ],
        }),
        module("reg", "std.regfile"),
        module("addAlu", "std.adder"),
        module("cWd", "std.constant", { value: 0x2a, bitWidth: 32 }),
        module("dmem", "std.dmem", { wordCount: 64, bitWidth: 32 }),
        module("cAddr", "std.constant", { value: 0, bitWidth: 32 }),
    ],
    nets: [
        net("n1", ["pc", "q"], ["imem", "addr"]),
        net("n2", ["pc", "q"], ["addPC", "a"]),
        net("n3", ["four", "out"], ["addPC", "b"]),
        net("n4", ["addPC", "sum"], ["pc", "d"]),
        net("n5", ["imem", "instruction"], ["split", "in"]),
        net("n6", ["split", "out_rs"], ["reg", "rs"]),
        net("n7", ["split", "out_rt"], ["reg", "rt"]),
        net("n8", ["split", "out_rd"], ["reg", "rd"]),
        net("n9", ["split", "out_f5"], ["reg", "we"]),
        net("n10", ["split", "out_f5"], ["dmem", "memWrite"]),
        net("n11", ["reg", "readA"], ["addAlu", "a"]),
        net("n12", ["reg", "readB"], ["addAlu", "b"]),
        net("n13", ["addAlu", "sum"], ["dmem", "wd"]),
        net("n14", ["cAddr", "out"], ["dmem", "addr"]),
        net("n15", ["cWd", "out"], ["reg", "wd"]),
    ],
};

const RIG_B_SOURCE = ".text\nadd $t0, $t1, $t2\nadd $t0, $t2, $t3\nadd $t0, $t3, $t1\n";

const rigBEngine = new SimulationEngine(rigBDoc);
check("rig B: compiles clean", rigBEngine.hasErrors, false);
const sessionB = new SimulationSession(rigBEngine, scanSimulationTargets(rigBDoc));
check("rig B: PC designator found", sessionB.simulationTargets.pcDesignator, "pc");

/** Preloads $t1=5, $t2=7, $t3=9 through the write-back seam. */
function preloadRegisters(): void {
    rigBEngine.mutateModuleState<RegisterFileState>("reg", (state) => {
        state.values[9] = 5; // $t1
        state.values[10] = 7; // $t2
        state.values[11] = 9; // $t3
    });
}

function dmemWord(index: number): number {
    return (rigBEngine.getModuleState("dmem") as WordMemoryState).words[index];
}

function registerValue(index: number): number {
    return (rigBEngine.getModuleState("reg") as RegisterFileState).values[index];
}

const builtB = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imem"] }]),
    editors: [editor("main", RIG_B_SOURCE)],
    targets: sessionB.simulationTargets,
});
check("rig B: load ok", sessionB.load(builtB.plan).ok, true);
checkHex(
    "rig B: imem word 0 golden (add $t0, $t1, $t2)",
    (rigBEngine.getModuleState("imem") as WordMemoryState).words[0],
    0x012a4020
);
checkHex(
    "rig B: imem word 1 golden (add $t0, $t2, $t3)",
    (rigBEngine.getModuleState("imem") as WordMemoryState).words[1],
    0x014b4020
);
checkHex(
    "rig B: imem word 2 golden (add $t0, $t3, $t1)",
    (rigBEngine.getModuleState("imem") as WordMemoryState).words[2],
    0x01694020
);

// Debugger-style preload + re-settle: level-sensitive modules commit during
// every propagation pass, so instruction 0's effect needs its operands in
// place before the post-load settle to be observable.
preloadRegisters();
rigBEngine.settle();
check("rig B: paused at instruction 0", sessionB.status, "paused");
check("rig B: PC at 0", rigBEngine.getPortValue("pc", "q"), 0);
check("rig B: first add visible after settle (5+7)", dmemWord(0), 12);
check("rig B: rd register written (constant)", registerValue(8), 0x2a);

// Per-cycle execution: one instruction per cycle, exact halt timing.
check("rig B: step 1 → paused", sessionB.step(), "paused");
check("rig B: cycle 1", sessionB.cycleCount, 1);
check("rig B: PC 4", rigBEngine.getPortValue("pc", "q"), 4);
check("rig B: second add (7+9)", dmemWord(0), 16);
check("rig B: step 2 → paused", sessionB.step(), "paused");
check("rig B: third add (9+5)", dmemWord(0), 14);
check("rig B: step 3 → finished (PC past end)", sessionB.step(), "finished");
check("rig B: halted at exactly 3 cycles", sessionB.cycleCount, 3);
check("rig B: PC 12", rigBEngine.getPortValue("pc", "q"), 12);
check("rig B: empty word past the program writes nothing", dmemWord(0), 14);
check("rig B: source registers unchanged", registerValue(9), 5);
check("rig B: final register state ($t0)", registerValue(8), 0x2a);
check("rig B: step rejected while finished", sessionB.step(), null);
check("rig B: pause rejected while finished", sessionB.pause(), false);

// Restart: fresh registers and memory, images re-applied, paused at 0.
check("rig B: restart from finished", sessionB.restart(), true);
check("rig B: restart → paused", sessionB.status, "paused");
check("rig B: restart → cycle 0", sessionB.cycleCount, 0);
check("rig B: restart → PC 0", rigBEngine.getPortValue("pc", "q"), 0);
check("rig B: restart zeroes registers (preloads are not part of the loaded state)", registerValue(9), 0);
check(
    "rig B: restart re-applies the program image",
    (rigBEngine.getModuleState("imem") as WordMemoryState).words[0] === 0x012a4020,
    true
);
check("rig B: restart settle runs instruction 0 with zero registers", dmemWord(0), 0);

// Run to completion through the batched advance() path.
preloadRegisters();
rigBEngine.settle();
check("rig B: start → running", sessionB.start(), true);
check("rig B: advance stops exactly at halt", sessionB.advance(16), 3);
check("rig B: finished after batched run", sessionB.status, "finished");
check("rig B: final memory state after re-run", dmemWord(0), 14);
check("rig B: final register state after re-run", registerValue(8), 0x2a);

console.log("");
if (failures > 0) {
    console.error(`${failures} simulation check(s) FAILED.`);
    process.exit(1);
}
console.log("All simulation checks passed.");