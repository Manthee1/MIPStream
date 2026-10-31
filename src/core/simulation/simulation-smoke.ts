/** @format */

/**
 * Standalone simulation-session self-check — the Phase 2 exit criteria, run
 * headlessly through the public assembler → loader → session → engine stack
 * with the real MIPS preset (no UI dependencies). Execute via
 * `npm run simulation:check`.
 *
 * Four rigs:
 * - Rig A (no PC): image write-through, one-to-many mappings, `.data`
 *   packing, capacity/validation errors, the full control state machine,
 *   empty-program halt.
 * - Rig B (minimal executable datapath): a PC/imem/splitter/regfile/adder/
 *   dmem netlist that executes real preset-ISA `add` programs — per-cycle
 *   memory transitions, PC-past-end halt at the exact cycle, restart
 *   semantics and batched advance.
 * - Rig C (golden single-cycle datapath): the shipped mips-basic template's
 *   own architecture + configuration, running golden programs over the whole
 *   preset ISA to exact final states and cycle counts.
 * - Rig D (Phase 5 cycle-level trace): a mixed program stepped ONE cycle at
 *   a time through the golden datapath — exact register/memory/PC state
 *   asserted after every cycle (one instruction per cycle, hybrid writeback
 *   timing, halt word consuming no cycle).
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
import {
    buildControlTable,
    CONTROL_ROWS,
    CONTROL_SIGNALS,
    type ControlConfig,
} from "@/shared/manifests/control/logic";
import { decodeAluControl } from "@/shared/manifests/alu-control/logic";
import { aluEvaluate } from "@/shared/manifests/alu/logic";
import { selectMuxInput } from "@/shared/manifests/mux/logic";
import { gateEvaluate } from "@/shared/manifests/logic/logic";
import { MIPS_SINGLE_CYCLE_MODULES, MIPS_SINGLE_CYCLE_NETS } from "@/config/mips-single-cycle-datapath";
import { PROJECT_TEMPLATES } from "@/config/templates";
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
            inputPorts: ["addr", "memRead"],
            outputPorts: ["rdata"],
            evaluate: (inputs) => new Uint32Array([inputs[1] & 1 ? readWord(state, inputs[0], mask) : 0]),
            clocked: {
                inputPorts: ["addr", "wd", "memWrite"],
                clockEdge: "rising",
                commit: (inputs) => {
                    if (inputs[2] & 1) writeWord(state, inputs[0], inputs[1], mask);
                },
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
            inputPorts: ["rs", "rt"],
            outputPorts: ["readA", "readB"],
            evaluate: (inputs) =>
                new Uint32Array([
                    readRegister(state, inputs[0], mask),
                    readRegister(state, inputs[1], mask),
                ]),
            clocked: {
                inputPorts: ["rd", "wd", "we"],
                clockEdge: "rising",
                commit: (inputs) => {
                    if (inputs[2] & 1) writeRegister(state, inputs[0], inputs[1], mask);
                },
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

// Rig C mirrors: the remaining real typeIds the single-cycle datapath uses.
// Same pattern as above — manifest metadata restated, evaluation delegated to
// the REAL pure logic modules (buildControlTable, decodeAluControl,
// aluEvaluate, selectMuxInput, gateEvaluate); the extender/shifter bodies
// are restated inline (their manifests embed them).

const mirrorControl: ModuleManifest<ControlConfig> = {
    typeId: "std.control",
    label: "Control Unit",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { opcodeBits: 6, signals: CONTROL_SIGNALS, rows: CONTROL_ROWS },
    generatePorts: (config) => {
        const outputs = config.signals.map((signal, index) => ({
            id: signal.id,
            direction: "output" as const,
            bits: signal.bits,
            label: signal.label ?? signal.id,
            position: { x: 50, y: (index - (config.signals.length - 1) / 2) * 18 },
        }));
        return [
            { id: "opcode", direction: "input" as const, bits: config.opcodeBits, label: "Opcode", position: { x: -50, y: 0 } },
            ...outputs,
        ];
    },
    createEvaluators: (config): ModuleEvaluators => {
        const table = buildControlTable(config);
        const signalCount = config.signals.length;
        const mask = widthMask(config.opcodeBits);
        return {
            inputPorts: ["opcode"],
            outputPorts: config.signals.map((signal) => signal.id),
            evaluate: (inputs) => {
                const base = (inputs[0] & mask) * signalCount;
                return table.slice(base, base + signalCount);
            },
        };
    },
};

const mirrorAluControl: ModuleManifest<Record<string, never>> = {
    typeId: "std.alu-control",
    label: "ALU Control",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: {},
    generatePorts: () => [
        { id: "aluop", direction: "input", bits: 2, label: "ALUOp", position: { x: -40, y: -10 } },
        { id: "funct", direction: "input", bits: 6, label: "Funct", position: { x: -40, y: 10 } },
        { id: "operation", direction: "output", bits: 4, label: "Op", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (): ModuleEvaluators => ({
        inputPorts: ["aluop", "funct"],
        outputPorts: ["operation"],
        evaluate: (inputs) => new Uint32Array([decodeAluControl(inputs[0], inputs[1])]),
    }),
};

const mirrorAlu: ModuleManifest<{ bitWidth: number }> = {
    typeId: "std.alu",
    label: "ALU",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { bitWidth: 32 },
    generatePorts: (config) => [
        { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -60, y: -20 } },
        { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -60, y: 20 } },
        { id: "op", direction: "input", bits: 4, label: "Op", position: { x: -25, y: 45 } },
        { id: "result", direction: "output", bits: config.bitWidth, label: "Result", position: { x: 60, y: 0 } },
        { id: "zero", direction: "output", bits: 1, label: "Zero", position: { x: 30, y: 45 } },
    ],
    createEvaluators: (config): ModuleEvaluators => ({
        inputPorts: ["a", "b", "op"],
        outputPorts: ["result", "zero"],
        evaluate: (inputs) => {
            const { result, zero } = aluEvaluate(inputs[0], inputs[1], inputs[2], config.bitWidth);
            return new Uint32Array([result, zero]);
        },
    }),
};

const mirrorMux2: ModuleManifest<{ bitWidth: number; numInputs: number }> = {
    typeId: "std.mux2",
    label: "Mux 2:1",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { bitWidth: 32, numInputs: 2 },
    generatePorts: (config) => [
        { id: "in0", direction: "input", bits: config.bitWidth, label: "In 0", position: { x: -40, y: -10 } },
        { id: "in1", direction: "input", bits: config.bitWidth, label: "In 1", position: { x: -40, y: 10 } },
        { id: "sel", direction: "input", bits: 1, label: "Sel", position: { x: 0, y: 40 } },
        { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => ({
        inputPorts: ["in0", "in1", "sel"],
        outputPorts: ["out"],
        evaluate: (inputs) => new Uint32Array([selectMuxInput(inputs, inputs[2], config.numInputs)]),
    }),
};

const mirrorExtender: ModuleManifest<{ inputBits: number; outputBits: number; isSigned: boolean }> = {
    typeId: "std.extender",
    label: "Bit Extender",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { inputBits: 16, outputBits: 32, isSigned: true },
    generatePorts: (config) => [
        { id: "in", direction: "input", bits: config.inputBits, label: "In", position: { x: -48, y: 0 } },
        { id: "out", direction: "output", bits: config.outputBits, label: "Out", position: { x: 48, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => {
        const hiMask = widthMask(config.outputBits);
        const loMask = widthMask(config.inputBits);
        return {
            inputPorts: ["in"],
            outputPorts: ["out"],
            evaluate: (inputs) => {
                const value = (inputs[0] >>> 0) & loMask;
                let out = value;
                if (config.isSigned && ((value >>> (config.inputBits - 1)) & 1) === 1) {
                    out = (value | (hiMask & ~loMask)) >>> 0;
                }
                return new Uint32Array([(out & hiMask) >>> 0]);
            },
        };
    },
};

const mirrorShifter: ModuleManifest<{
    bitWidth: number;
    mode: "logical_left" | "logical_right" | "arithmetic_right";
    shamt: number;
}> = {
    typeId: "std.shifter",
    label: "Shifter",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { bitWidth: 32, mode: "logical_left", shamt: 0 },
    generatePorts: (config) => [
        { id: "in", direction: "input", bits: config.bitWidth, label: "In", position: { x: -40, y: 0 } },
        { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => {
        const mask = widthMask(config.bitWidth);
        const shamt = config.shamt & 0x1f;
        return {
            inputPorts: ["in"],
            outputPorts: ["out"],
            evaluate: (inputs) => {
                const value = (inputs[0] >>> 0) & mask;
                let out: number;
                switch (config.mode) {
                    case "logical_left":
                        out = (value << shamt) & mask;
                        break;
                    case "logical_right":
                        out = value >>> shamt;
                        break;
                    case "arithmetic_right":
                        out = value >> shamt;
                        break;
                }
                return new Uint32Array([(out & mask) >>> 0]);
            },
        };
    },
};

const mirrorAnd: ModuleManifest<{ op: "and" }> = {
    typeId: "std.and",
    label: "AND Gate",
    description: "",
    icon: "",
    category: "logic",
    defaultConfig: { op: "and" },
    generatePorts: () => [
        { id: "a", direction: "input", bits: 1, label: "A", position: { x: -44, y: -10 } },
        { id: "b", direction: "input", bits: 1, label: "B", position: { x: -44, y: 10 } },
        { id: "out", direction: "output", bits: 1, label: "Out", position: { x: 44, y: 0 } },
    ],
    createEvaluators: (): ModuleEvaluators => ({
        inputPorts: ["a", "b"],
        outputPorts: ["out"],
        evaluate: (inputs) => new Uint32Array([gateEvaluate(inputs[0], inputs[1], "and", 1)]),
    }),
};

registerManifest(mirrorConstant);
registerManifest(mirrorAdder);
registerManifest(mirrorImem);
registerManifest(mirrorDmem);
registerManifest(mirrorPc);
registerManifest(mirrorRegfile);
registerManifest(mirrorSplitter);
registerManifest(mirrorControl);
registerManifest(mirrorAluControl);
registerManifest(mirrorAlu);
registerManifest(mirrorMux2);
registerManifest(mirrorExtender);
registerManifest(mirrorShifter);
registerManifest(mirrorAnd);

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

// Dedicated halt instruction: the session finishes just BEFORE executing
// the ISA's halt word (derived onto the plan by buildLoadPlan — no opcode
// constant lives in the session). PC-past-end remains the fallback halt.
const haltDoc: ArchitectureDocument = {
    modules: [
        module("pcH", "std.pc"),
        module("fourH", "std.constant", { value: 4, bitWidth: 32 }),
        module("pcAddH", "std.adder"),
        module("imemH", "std.imem", { wordCount: 8, bitWidth: 32 }),
    ],
    nets: [
        net("hA", ["pcH", "q"], ["imemH", "addr"], ["pcAddH", "a"]),
        net("hB", ["fourH", "out"], ["pcAddH", "b"]),
        net("hC", ["pcAddH", "sum"], ["pcH", "d"]),
    ],
};

const haltEngine = new SimulationEngine(haltDoc);
const haltSession = new SimulationSession(haltEngine, scanSimulationTargets(haltDoc));
const haltPlan = buildLoadPlan({
    configuration: configuration([{ editorId: "main", memoryModuleIds: ["imemH"] }]),
    editors: [editor("main", ".text\nnop\nnop\nhalt\n")],
    targets: haltSession.simulationTargets,
});
check("halt: plan carries the derived halt word", haltPlan.plan.haltWord, 0xfc000000);
check("halt: loads clean", haltSession.load(haltPlan.plan).ok, true);
check("halt: step 1 executes nop 1", haltSession.step(), "paused");
check("halt: step 2 executes nop 2", haltSession.step(), "paused");
check("halt: finishes before executing the halt word", haltSession.step(), "finished");
check("halt: halted at exactly 2 cycles", haltSession.cycleCount, 2);
check("halt: PC parked on the halt word", haltEngine.getPortValue("pcH", "q"), 8);
check("halt: step rejected while finished", haltSession.step(), null);
check("halt: restart → paused at 0", haltSession.restart(), true);
check("halt: start → running", haltSession.start(), true);
check("halt: advance stops at the halt word", haltSession.advance(16), 2);
check("halt: finished after batched run", haltSession.status, "finished");

// ---------------------------------------------------------------- Rig B
// Minimal executable datapath: PC + PC+4 adder loop + imem + splitter
// (rs/rt/rd + the add-funct bit) + regfile + ALU adder + dmem. Each cycle
// the instruction at the PC commits rs+rt into dmem word 0 at the rising
// clock edge (memWrite is the add funct bit, so the empty word past the
// program writes nothing) and commits a constant into the instruction's
// rd register. The register file and data memory are hybrid modules (async
// read + rising-clocked write), so the regfile → ALU → dmem.wd path is an
// edge boundary, not a combinational loop, and every write commits exactly
// once per cycle: the post-load settle stages instruction 0's datapath
// without committing it, and its side-effects land on the first clock edge.
// This rig still drives regfile.wd from a constant — the full datapath
// with a real writeback mux is the Phase 3 golden rig.

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

// Debugger-style preload + re-settle: hybrid commits happen at the rising
// edge, so preloaded operands must be in place before the post-load settle
// stages instruction 0's write data — its effects land on the first edge.
preloadRegisters();
rigBEngine.settle();
check("rig B: paused at instruction 0", sessionB.status, "paused");
check("rig B: PC at 0", rigBEngine.getPortValue("pc", "q"), 0);
// Hybrid semantics: the post-load settle computes instruction 0's datapath
// (write data staged on the wires) but commits nothing.
check("rig B: load settle commits nothing (dmem)", dmemWord(0), 0);
check("rig B: load settle commits nothing (regfile)", registerValue(8), 0);
check("rig B: instruction 0 write data staged (5+7)", rigBEngine.getPortValue("dmem", "wd"), 12);
check("rig B: instruction 0 write enables staged", rigBEngine.getPortValue("reg", "we"), 1);

// Per-cycle execution: one instruction per cycle, exact halt timing. The
// commit for instruction k lands on the rising edge entering cycle k+1.
check("rig B: step 1 → paused", sessionB.step(), "paused");
check("rig B: cycle 1", sessionB.cycleCount, 1);
check("rig B: PC 4", rigBEngine.getPortValue("pc", "q"), 4);
check("rig B: first add committed at edge 1 (5+7)", dmemWord(0), 12);
check("rig B: rd register written at edge 1 (constant)", registerValue(8), 0x2a);
check("rig B: step 2 → paused", sessionB.step(), "paused");
check("rig B: second add committed at edge 2 (7+9)", dmemWord(0), 16);
check("rig B: step 3 → finished (PC past end)", sessionB.step(), "finished");
check("rig B: third add committed at edge 3 (9+5)", dmemWord(0), 14);
check("rig B: halted at exactly 3 cycles", sessionB.cycleCount, 3);
check("rig B: PC 12", rigBEngine.getPortValue("pc", "q"), 12);
check("rig B: past-end word decodes to no-op (we deasserted)", rigBEngine.getPortValue("reg", "we"), 0);
check("rig B: past-end word decodes to no-op (memWrite deasserted)", rigBEngine.getPortValue("dmem", "memWrite"), 0);
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
check("rig B: restart settle commits nothing", dmemWord(0), 0);

// Run to completion through the batched advance() path.
preloadRegisters();
rigBEngine.settle();
check("rig B: start → running", sessionB.start(), true);
check("rig B: advance stops exactly at halt", sessionB.advance(16), 3);
check("rig B: finished after batched run", sessionB.status, "finished");
check("rig B: final memory state after re-run", dmemWord(0), 14);
check("rig B: final register state after re-run", registerValue(8), 0x2a);

// ---------------------------------------------------------------- Rig C
// The golden single-cycle datapath: THE shipped template — the mips-basic
// project template's own architecture (netlist + configuration) and starter
// program, compiled with the mirror manifests above. Proves the writeback
// path compiles (the Phase 2 blocker), then runs golden programs covering
// the whole preset ISA: arithmetic with adjacent read-after-write
// dependencies, slt, $zero write attempts, lw/sw with .data labels, beq
// taken/not-taken/backward, the halt word, and PC-past-end.

const mipsTemplate = PROJECT_TEMPLATES.find((template) => template.id === "mips-basic");
check("rig C: mips-basic template found", mipsTemplate !== undefined, true);
check(
    "rig C: template ships the golden datapath by reference",
    mipsTemplate?.architecture.modules === MIPS_SINGLE_CYCLE_MODULES &&
        mipsTemplate.architecture.nets === MIPS_SINGLE_CYCLE_NETS,
    true,
);

const rigCDoc: ArchitectureDocument = {
    modules: mipsTemplate?.architecture.modules ?? [],
    nets: mipsTemplate?.architecture.nets ?? [],
};
const rigCEngine = new SimulationEngine(rigCDoc);
check("rig C: compiles clean (writeback path is an edge boundary)", rigCEngine.hasErrors, false);
check("rig C: zero warnings", rigCEngine.warnings.length, 0);
const rigCSession = new SimulationSession(rigCEngine, scanSimulationTargets(rigCDoc));
check("rig C: PC designator found", rigCSession.simulationTargets.pcDesignator, "pc");
check("rig C: imem found", rigCSession.simulationTargets.instructionMemories.join(","), "imem");
check("rig C: dmem found", rigCSession.simulationTargets.dataMemories.join(","), "dmem");

/** Loads a program into the rig using the template's own configuration. */
function rigCLoad(source: string): void {
    const built = buildLoadPlan({
        configuration: mipsTemplate!.architecture.configuration,
        editors: [editor("main", source)],
        targets: rigCSession.simulationTargets,
    });
    if (built.loadErrors.length > 0 || built.plan.assemblerDiagnostics.length > 0) {
        report(
            false,
            "rig C: program assembles clean",
            `loadErrors: ${built.loadErrors.join("; ")} | diagnostics: ${built.plan.assemblerDiagnostics.map((d) => d.message).join("; ")}`,
        );
        return;
    }
    report(rigCSession.load(built.plan).ok, "rig C: program loads", "load refused");
}

function rigCReg(index: number): number {
    return (rigCEngine.getModuleState("reg") as RegisterFileState).values[index];
}

function rigCDmem(index: number): number {
    return (rigCEngine.getModuleState("dmem") as WordMemoryState).words[index];
}

// Arithmetic + adjacent read-after-write + slt + $zero write attempt.
const RIG_C_ARITH =
    ".text\n" +
    "addi $t0, $zero, 5\n" +
    "addi $t1, $zero, 7\n" +
    "add $t2, $t0, $t1\n" +
    "slt $t3, $t0, $t1\n" +
    "slt $t4, $t1, $t0\n" +
    "add $zero, $t0, $t1\n" +
    "halt\n";
rigCLoad(RIG_C_ARITH);
checkHex(
    "rig C arith: imem word 0 golden (addi $t0, $zero, 5)",
    (rigCEngine.getModuleState("imem") as WordMemoryState).words[0],
    0x20080005,
);
checkHex(
    "rig C arith: imem word 2 golden (add $t2, $t0, $t1)",
    (rigCEngine.getModuleState("imem") as WordMemoryState).words[2],
    0x01095020,
);
check("rig C arith: paused at instruction 0", rigCSession.status, "paused");
check("rig C arith: load commits nothing ($t2)", rigCReg(10), 0);
rigCSession.start();
check("rig C arith: advance stops at the halt word", rigCSession.advance(64), 6);
check("rig C arith: finished", rigCSession.status, "finished");
check("rig C arith: $t0 = 5", rigCReg(8), 5);
check("rig C arith: $t1 = 7", rigCReg(9), 7);
check("rig C arith: $t2 = 12 (adjacent read-after-write)", rigCReg(10), 12);
check("rig C arith: $t3 = 1 (slt 5 < 7)", rigCReg(11), 1);
check("rig C arith: $t4 = 0 (slt 7 < 5)", rigCReg(12), 0);
check("rig C arith: $zero write absorbed", rigCReg(0), 0);
check("rig C arith: PC parked on the halt word", rigCEngine.getPortValue("pc", "q"), 24);

// lw/sw through .data labels: bare-label addressing (base register keeps
// its $zero default), the sw write path, and the lw→regfile writeback path.
const RIG_C_MEMORY =
    ".data\n" +
    "x: .word 0x12345678\n" +
    "y: .word 0\n" +
    ".text\n" +
    "lw $t0, x\n" +
    "sw $t0, y\n" +
    "lw $t1, y\n" +
    "halt\n";
rigCLoad(RIG_C_MEMORY);
rigCSession.start();
check("rig C memory: advance stops at the halt word", rigCSession.advance(64), 3);
check("rig C memory: $t0 = x after lw", rigCReg(8), 0x12345678);
check("rig C memory: y = x after sw", rigCDmem(1), 0x12345678);
check("rig C memory: $t1 = y after lw", rigCReg(9), 0x12345678);
check("rig C memory: x untouched", rigCDmem(0), 0x12345678);

// Branches: not-taken fall-through, taken forward, and taken backward
// (loop) — exercises the branch adder ((PC+4) + signext(imm)<<2), the
// zero-flag AND, and the next-PC mux from both directions.
const RIG_C_BRANCH =
    ".text\n" +
    "addi $t0, $zero, 3\n" +
    "addi $t1, $zero, 0\n" +
    "loop: add $t1, $t1, $t0\n" +
    "addi $t0, $t0, -1\n" +
    "beq $t0, $zero, done\n" +
    "beq $zero, $zero, loop\n" +
    "done: halt\n";
rigCLoad(RIG_C_BRANCH);
rigCSession.start();
check("rig C branch: advance stops at the halt word (13 cycles)", rigCSession.advance(64), 13);
check("rig C branch: finished", rigCSession.status, "finished");
check("rig C branch: $t0 = 0 (loop exit condition)", rigCReg(8), 0);
check("rig C branch: $t1 = 6 (3+2+1 accumulation)", rigCReg(9), 6);
check("rig C branch: PC parked on the halt word", rigCEngine.getPortValue("pc", "q"), 24);

// PC-past-end without a halt word: the fallback halt, plus proof that the
// zero word past the program decodes to a datapath-safe no-op.
const RIG_C_PAST_END = ".text\naddi $t0, $zero, 1\nnop\n";
rigCLoad(RIG_C_PAST_END);
rigCSession.start();
check("rig C past-end: advance stops at PC-past-end", rigCSession.advance(64), 2);
check("rig C past-end: finished", rigCSession.status, "finished");
check("rig C past-end: $t0 = 1", rigCReg(8), 1);
check("rig C past-end: PC 8", rigCEngine.getPortValue("pc", "q"), 8);
check("rig C past-end: no past-end side effects ($zero intact)", rigCReg(0), 0);

// Reload the arithmetic program onto the dirty state — the load must fully
// rewind registers and memory (engine reset + images + settle).
rigCLoad(RIG_C_ARITH);
check("rig C reload: paused at 0", rigCSession.status, "paused");
check("rig C reload: PC 0", rigCEngine.getPortValue("pc", "q"), 0);
check("rig C reload: registers cleared", rigCReg(8), 0);
check("rig C reload: dmem cleared", rigCDmem(0), 0);
rigCSession.start();
check("rig C reload: runs to the halt word again", rigCSession.advance(64), 6);
check("rig C reload: $t2 = 12 again", rigCReg(10), 12);

// The shipped starter program (the template's own initialSoftware): the
// square-by-repeated-addition demo, run to its halt with exact final state.
const starterSource = mipsTemplate?.initialSoftware?.find((e) => e.id === "main")?.sourceCode ?? "";
rigCLoad(starterSource);
rigCSession.start();
check("rig C starter: advance stops at the halt word (38 cycles)", rigCSession.advance(256), 38);
check("rig C starter: finished", rigCSession.status, "finished");
check("rig C starter: $t0 = 7 (value)", rigCReg(8), 7);
check("rig C starter: $t1 = 49 (7 × 7 by repeated addition)", rigCReg(9), 49);
check("rig C starter: $t2 = 7 (loop counter)", rigCReg(10), 7);
check("rig C starter: result word = 49", rigCDmem(1), 49);
check("rig C starter: value word untouched", rigCDmem(0), 7);

// ---------------------------------------------------------------- Rig D
// Phase 5 cycle-level golden trace on the golden datapath itself: a mixed
// program (arithmetic, lw/sw, not-taken and taken-forward branches, a
// deliberately skipped instruction) stepped ONE cycle at a time, asserting
// the exact register / memory / PC state after EVERY cycle — one
// instruction per cycle, every writeback committing on the edge entering
// the next cycle (hybrid regfile/dmem), and the halt word finishing
// without consuming a cycle.

const RIG_D_TRACE =
    ".data\n" +
    "x: .word 16\n" +
    "y: .word 0\n" +
    ".text\n" +
    "addi $t0, $zero, 5\n" + // 0: $t0 = 5
    "lw $t1, x\n" + // 1: $t1 = 16
    "add $t2, $t0, $t1\n" + // 2: $t2 = 21
    "sw $t2, y\n" + // 3: y = 21
    "addi $t0, $t0, 1\n" + // 4: $t0 = 6
    "beq $t0, $t2, skip\n" + // 5: 6 != 21 → not taken
    "beq $zero, $zero, skip\n" + // 6: taken, forward
    "addi $t0, $zero, 99\n" + // 7: skipped by the branch
    "skip: halt\n"; // 8
rigCLoad(RIG_D_TRACE);
check("rig D trace: paused at instruction 0", rigCSession.status, "paused");
check("rig D trace: load presents cycle 0", rigCSession.cycleCount, 0);
check("rig D trace: load PC 0", rigCEngine.getPortValue("pc", "q"), 0);
check("rig D trace: instruction 0 computed but NOT executed ($t0)", rigCReg(8), 0);
check("rig D trace: load commits no memory (y)", rigCDmem(1), 0);

// Cycle 1 — addi $t0 commits on the edge entering cycle 1; lw computes.
check("rig D trace: step 1 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 1 of 7 (one instruction per cycle)", rigCSession.cycleCount, 1);
check("rig D trace: cycle 1 PC 4", rigCEngine.getPortValue("pc", "q"), 4);
check("rig D trace: cycle 1 $t0 = 5", rigCReg(8), 5);
check("rig D trace: cycle 1 $t1 not yet written", rigCReg(9), 0);

// Cycle 2 — lw writeback ($t1 = 16); add computes with adjacent RAW.
check("rig D trace: step 2 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 2 PC 8", rigCEngine.getPortValue("pc", "q"), 8);
check("rig D trace: cycle 2 $t1 = 16 (lw writeback)", rigCReg(9), 16);
check("rig D trace: cycle 2 $t2 not yet written", rigCReg(10), 0);

// Cycle 3 — add writeback ($t2 = 21); sw computes, store NOT yet visible.
check("rig D trace: step 3 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 3 PC 12", rigCEngine.getPortValue("pc", "q"), 12);
check("rig D trace: cycle 3 $t2 = 21 (adjacent read-after-write)", rigCReg(10), 21);
check("rig D trace: cycle 3 sw pending (y still 0)", rigCDmem(1), 0);

// Cycle 4 — sw commits on the edge entering cycle 4; addi computes.
check("rig D trace: step 4 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 4 PC 16", rigCEngine.getPortValue("pc", "q"), 16);
check("rig D trace: cycle 4 y = 21 (store landed exactly one cycle later)", rigCDmem(1), 21);
check("rig D trace: cycle 4 $t0 still 5 (addi pending)", rigCReg(8), 5);
check("rig D trace: cycle 4 x untouched by the load", rigCDmem(0), 16);

// Cycle 5 — addi writeback ($t0 = 6); the not-taken beq computes.
check("rig D trace: step 5 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 5 PC 20", rigCEngine.getPortValue("pc", "q"), 20);
check("rig D trace: cycle 5 $t0 = 6", rigCReg(8), 6);

// Cycle 6 — beq $t0, $t2 (6 != 21) falls through to PC 24.
check("rig D trace: step 6 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 6 PC 24 (not-taken fall-through)", rigCEngine.getPortValue("pc", "q"), 24);
check("rig D trace: cycle 6 $t2 unchanged", rigCReg(10), 21);

// Cycle 7 — beq $zero, $zero taken forward to skip (PC 32).
check("rig D trace: step 7 → paused", rigCSession.step(), "paused");
check("rig D trace: cycle 7 PC 32 (taken forward branch)", rigCEngine.getPortValue("pc", "q"), 32);
check("rig D trace: cycle 7 of 7", rigCSession.cycleCount, 7);

// The halt word finishes the session WITHOUT executing a cycle.
check("rig D trace: step 8 → finished on the halt word", rigCSession.step(), "finished");
check("rig D trace: halt word consumes no cycle", rigCSession.cycleCount, 7);
check("rig D trace: PC parked on the halt word", rigCEngine.getPortValue("pc", "q"), 32);
check("rig D trace: skipped instruction never executed ($t0 = 6, not 99)", rigCReg(8), 6);
check("rig D trace: final memory state (y = 21)", rigCDmem(1), 21);

console.log("");
if (failures > 0) {
    console.error(`${failures} simulation check(s) FAILED.`);
    process.exit(1);
}
console.log("All simulation checks passed.");