/** @format */

/**
 * Standalone engine self-check — the project has no test framework yet, so
 * this runs through the public compile + step + reset API with ad-hoc inline
 * manifests (no UI dependencies). Execute via `npm run engine:check`.
 */

import { registerManifest } from "@/shared/manifestRegistry";
import type {
  ModuleEvaluators,
  ModuleManifest,
  SerializedModule,
} from "@/shared/types/manifest";
import type { SerializedNet } from "@/shared/types/netlist";
import { widthMask } from "@/shared/utils/bit-ops";
import {
  clampWiringBits,
  contiguousField,
  remapFromBus,
} from "@/shared/manifests/wiring-logic";
import {
  resolveSplitterFields,
  type SplitterConfig,
} from "@/shared/manifests/splitter/logic";
import {
  createRegisterEvaluators,
  generateRegisterPorts,
  type RegisterConfig,
} from "@/shared/manifests/register/logic";
import {
  buildMuxLut,
  resolveMuxSelMap,
  selectMappedMuxInput,
  type MuxConfig,
} from "@/shared/manifests/mux/logic";
import type { ArchitectureDocument } from "./compile/compiler";
import { SimulationEngine } from "./engine";
import { lintArchitecture } from "./lint";

/** Node process API — only the SSR-built smoke bundle actually executes it. */
declare const process: { exit(code?: number): void };

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const pass = actual === expected;
  if (!pass) failures++;
  console.log(
    `${pass ? "PASS" : "FAIL"}  ${label}` +
      (pass ? "" : `  (got ${String(actual)}, want ${String(expected)})`)
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

const smokeConstant: ModuleManifest<{ value: number }> = {
  typeId: "smoke.constant",
  label: "Constant",
  description: "",
  icon: "",
  category: "iO",
  defaultConfig: { value: 4 },
  generatePorts: (config) => [
    { id: "out", direction: "output", bits: 32, label: "Out", position: { x: 40, y: 0 } },
  ],
  createEvaluators: (config): ModuleEvaluators => ({
    inputPorts: [],
    outputPorts: ["out"],
    evaluate: () => new Uint32Array([config.value >>> 0]),
  }),
};

const smokeAdder: ModuleManifest<{ bitWidth: number }> = {
  typeId: "smoke.adder",
  label: "Adder",
  description: "",
  icon: "",
  category: "logic",
  defaultConfig: { bitWidth: 32 },
  generatePorts: () => [
    { id: "a", direction: "input", bits: 32, label: "A", position: { x: -40, y: 0 } },
    { id: "b", direction: "input", bits: 32, label: "B", position: { x: -40, y: 20 } },
    { id: "cin", direction: "input", bits: 1, label: "Cin", position: { x: -40, y: 40 } },
    { id: "sum", direction: "output", bits: 32, label: "Sum", position: { x: 40, y: 0 } },
  ],
  createEvaluators: (config): ModuleEvaluators => ({
    inputPorts: ["a", "b", "cin"],
    outputPorts: ["sum"],
    evaluate: (inputs) =>
      new Uint32Array([
        ((inputs[0] + inputs[1] + (inputs[2] & 1)) & widthMask(config.bitWidth)) >>> 0,
      ]),
  }),
};

const smokeAnd: ModuleManifest<{ bitWidth: number }> = {
  typeId: "smoke.and",
  label: "AND",
  description: "",
  icon: "",
  category: "logic",
  defaultConfig: { bitWidth: 32 },
  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -40, y: -10 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -40, y: 10 } },
    { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: 40, y: 0 } },
  ],
  createEvaluators: (config): ModuleEvaluators => ({
    inputPorts: ["a", "b"],
    outputPorts: ["out"],
    evaluate: (inputs) =>
      new Uint32Array([(inputs[0] & inputs[1]) & widthMask(config.bitWidth)]),
  }),
};

function makeRegister(clockEdge: "rising" | "both"): ModuleManifest<{ bitWidth: number }> {
  return {
    typeId: clockEdge === "both" ? "smoke.bothreg" : "smoke.register",
    label: "Register",
    description: "",
    icon: "",
    category: "memory",
    defaultConfig: { bitWidth: 32 },
    generatePorts: () => [
      { id: "d", direction: "input", bits: 32, label: "D", position: { x: -40, y: 0 } },
      { id: "q", direction: "output", bits: 32, label: "Q", position: { x: 40, y: 0 } },
    ],
    createEvaluators: (config): ModuleEvaluators => ({
      inputPorts: ["d"],
      outputPorts: ["q"],
      clockEdge,
      evaluate: (inputs) => new Uint32Array([inputs[0] & widthMask(config.bitWidth)]),
    }),
  };
}

interface AccumulatorState {
  values: Uint32Array;
}

const smokeAccumulator: ModuleManifest<{ slots: number; state?: AccumulatorState }> = {
  typeId: "smoke.accumulator",
  label: "Accumulator",
  description: "",
  icon: "",
  category: "memory",
  defaultConfig: { slots: 4 },
  createInitialState: (config) => ({ values: new Uint32Array(config.slots) }),
  generatePorts: () => [
    { id: "inc", direction: "input", bits: 32, label: "Inc", position: { x: -40, y: 0 } },
    { id: "idx", direction: "input", bits: 32, label: "Idx", position: { x: -40, y: 20 } },
    { id: "out", direction: "output", bits: 32, label: "Out", position: { x: 40, y: 0 } },
  ],
  createEvaluators: (config): ModuleEvaluators => {
    const state = (config.state as AccumulatorState) ?? { values: new Uint32Array(4) };
    return {
      inputPorts: ["inc", "idx"],
      outputPorts: ["out"],
      clockEdge: "rising",
      evaluate: (inputs) => {
        const index = inputs[1] % state.values.length;
        state.values[index] = (state.values[index] + inputs[0]) >>> 0;
        return new Uint32Array([state.values[index]]);
      },
    };
  },
};

// Hybrid store manifests: asynchronous read + rising-edge-clocked write —
// the real register-file / data-memory pattern. The clocked-only inputs
// (write address / data / enable) are edge-sampled, so the classic
// single-cycle writeback loop (store → logic → store.wd) is NOT a
// combinational cycle.
interface HybridStoreState {
  values: Uint32Array;
}

function hybridStoreState(slots: number): HybridStoreState {
  return { values: new Uint32Array(slots) };
}

const smokeHybridReg: ModuleManifest<{ slots: number; state?: HybridStoreState }> = {
  typeId: "smoke.hybridreg",
  label: "Hybrid Register File",
  description: "",
  icon: "",
  category: "memory",
  defaultConfig: { slots: 4 },
  createInitialState: (config) => hybridStoreState(config.slots),
  generatePorts: () => [
    { id: "rs", direction: "input", bits: 32, label: "RS", position: { x: -40, y: -30 } },
    { id: "rt", direction: "input", bits: 32, label: "RT", position: { x: -40, y: -10 } },
    { id: "rd", direction: "input", bits: 32, label: "RD", position: { x: -40, y: 10 } },
    { id: "wd", direction: "input", bits: 32, label: "WD", position: { x: 40, y: 10 } },
    { id: "we", direction: "input", bits: 32, label: "WE", position: { x: 0, y: 40 } },
    { id: "readA", direction: "output", bits: 32, label: "Read A", position: { x: 40, y: -30 } },
    { id: "readB", direction: "output", bits: 32, label: "Read B", position: { x: 40, y: -10 } },
  ],
  createEvaluators: (config): ModuleEvaluators => {
    const state = (config.state as HybridStoreState) ?? hybridStoreState(config.slots);
    const slot = (address: number) => address % state.values.length;
    return {
      inputPorts: ["rs", "rt"],
      outputPorts: ["readA", "readB"],
      evaluate: (inputs) =>
        new Uint32Array([state.values[slot(inputs[0])], state.values[slot(inputs[1])]]),
      clocked: {
        inputPorts: ["rd", "wd", "we"],
        clockEdge: "rising",
        commit: (inputs) => {
          if (inputs[2] & 1) state.values[slot(inputs[0])] = inputs[1] >>> 0;
        },
      },
    };
  },
};

const smokeHybridMem: ModuleManifest<{ slots: number; state?: HybridStoreState }> = {
  typeId: "smoke.hybridmem",
  label: "Hybrid Memory",
  description: "",
  icon: "",
  category: "memory",
  defaultConfig: { slots: 4 },
  createInitialState: (config) => hybridStoreState(config.slots),
  generatePorts: () => [
    { id: "addr", direction: "input", bits: 32, label: "Addr", position: { x: -40, y: -20 } },
    { id: "wd", direction: "input", bits: 32, label: "WD", position: { x: -40, y: 20 } },
    { id: "memWrite", direction: "input", bits: 32, label: "Write", position: { x: 0, y: 40 } },
    { id: "memRead", direction: "input", bits: 32, label: "Read", position: { x: 20, y: 40 } },
    { id: "rdata", direction: "output", bits: 32, label: "RData", position: { x: 40, y: 0 } },
  ],
  // Control ports are 32-bit in this mirror so the 32-bit smoke constant
  // drives them without a width-mismatch warning (commits mask with & 1).
  createEvaluators: (config): ModuleEvaluators => {
    const state = (config.state as HybridStoreState) ?? hybridStoreState(config.slots);
    const slot = (address: number) => address % state.values.length;
    return {
      // `addr` feeds BOTH evaluators — the shared-port pattern.
      inputPorts: ["addr", "memRead"],
      outputPorts: ["rdata"],
      evaluate: (inputs) =>
        new Uint32Array([inputs[1] & 1 ? state.values[slot(inputs[0])] : 0]),
      clocked: {
        inputPorts: ["addr", "wd", "memWrite"],
        clockEdge: "rising",
        commit: (inputs) => {
          if (inputs[2] & 1) state.values[slot(inputs[0])] = inputs[1] >>> 0;
        },
      },
    };
  },
};

// Minimal stand-in for the real std.merger manifest: the lint pass reads the
// config (input field maps) directly, so only port shape matters here.
const smokeMerger: ModuleManifest<{ outputBits: number }> = {
  typeId: "std.merger",
  label: "Bit Merger",
  description: "",
  icon: "",
  category: "wiring",
  defaultConfig: { outputBits: 32 },
  generatePorts: (config) => [
    { id: "in_f1", direction: "input", bits: 16, label: "In 1", position: { x: -44, y: -10 } },
    { id: "in_f2", direction: "input", bits: 16, label: "In 2", position: { x: -44, y: 10 } },
    {
      id: "out",
      direction: "output",
      bits: Math.min(32, Math.max(1, Math.floor(Number(config.outputBits) || 32))),
      label: "Out",
      position: { x: 44, y: 0 },
    },
  ],
  createEvaluators: (): ModuleEvaluators => ({
    inputPorts: ["in_f1", "in_f2"],
    outputPorts: ["out"],
    evaluate: (inputs) => new Uint32Array([(inputs[0] | inputs[1]) >>> 0]),
  }),
};

// Stand-in for the real std.splitter manifest, but driven by the production
// jumper-mapped mapping logic (`splitter/logic` + `wiring-logic`): overlap —
// one input bit feeding several output fields — is legal for the splitter
// (the merger's one-driver-per-bit rule is merger-only).
const smokeSplitter: ModuleManifest<SplitterConfig> = {
  typeId: "std.splitter",
  label: "Bit Splitter",
  description: "",
  icon: "",
  category: "wiring",
  defaultConfig: { inputBits: 32, outputs: [contiguousField(31, 0, "f1")] },
  generatePorts: (config) => {
    const fields = resolveSplitterFields(config);
    return [
      {
        id: "in",
        direction: "input",
        bits: clampWiringBits(config.inputBits),
        label: "In",
        position: { x: -44, y: 0 },
      },
      ...fields.map((field, i) => ({
        id: `out_${field.id}`,
        direction: "output" as const,
        bits: field.bits,
        label: field.label || `Out ${i + 1}`,
        position: { x: 44, y: (i - (fields.length - 1) / 2) * 20 },
      })),
    ];
  },
  createEvaluators: (config): ModuleEvaluators => {
    const fields = resolveSplitterFields(config);
    const mask = widthMask(clampWiringBits(config.inputBits));
    return {
      inputPorts: ["in"],
      outputPorts: fields.map((field) => `out_${field.id}`),
      evaluate: (inputs) => {
        const bus = (inputs[0] >>> 0) & mask;
        return new Uint32Array(fields.map((field) => remapFromBus(bus, field)));
      },
    };
  },
};

// Stand-in for the real std.register manifest, but driven by the production
// port/evaluator factories (`register/logic`): multi-pin D/Q pairs with
// derived `d_<id>`/`q_<id>` port ids plus the optional synchronous reset.
const smokeStageRegister: ModuleManifest<RegisterConfig> = {
  typeId: "std.register",
  label: "Stage Register",
  description: "",
  icon: "",
  category: "memory",
  defaultConfig: { bitWidth: 32 },
  generatePorts: generateRegisterPorts,
  createEvaluators: createRegisterEvaluators,
};

// Stand-in for the real std.mux2 manifest, driven by the production
// selection logic (`mux/logic`): the configurable sel→input assignment is
// compiled into a flattened lookup; invalid maps fall back to the identity.
const smokeMux2: ModuleManifest<MuxConfig> = {
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
  createEvaluators: (config): ModuleEvaluators => {
    const lut = buildMuxLut(resolveMuxSelMap(config.selMap, config.numInputs));
    return {
      inputPorts: ["in0", "in1", "sel"],
      outputPorts: ["out"],
      evaluate: (inputs) =>
        new Uint32Array([selectMappedMuxInput(inputs, inputs[2], lut)]),
    };
  },
};

registerManifest(smokeConstant);
registerManifest(smokeAdder);
registerManifest(smokeAnd);
registerManifest(makeRegister("rising"));
registerManifest(makeRegister("both"));
registerManifest(smokeAccumulator);
registerManifest(smokeHybridReg);
registerManifest(smokeHybridMem);
registerManifest(smokeMerger);
registerManifest(smokeSplitter);
registerManifest(smokeStageRegister);
registerManifest(smokeMux2);

// ---------------------------------------------------------------- scenarios

// 1. Free-running counter: constant 4 → adder ← register feedback. Register
//    feedback must NOT trip cycle detection; the count must advance once per
//    cycle; undriven `cin` must read the constant-zero rail.
const counterDoc: ArchitectureDocument = {
  modules: [
    module("u1", "smoke.constant", { value: 4 }),
    module("u2", "smoke.adder"),
    module("u3", "smoke.register"),
  ],
  nets: [
    net("n1", ["u1", "out"], ["u2", "a"]),
    net("n2", ["u3", "q"], ["u2", "b"]),
    net("n3", ["u2", "sum"], ["u3", "d"]),
  ],
};

const counter = new SimulationEngine(counterDoc);
check("counter: compiles clean", counter.hasErrors, false);
check("counter: zero rail on undriven cin", counter.getPortValue("u2", "cin"), 0);
counter.step();
counter.step();
counter.step();
check("counter: q after 3 cycles", counter.getPortValue("u3", "q"), 12);
check("counter: net n2 mirrors q", counter.getNetValue("n2"), 12);
counter.reset();
check("counter: reset rewinds to 0", counter.getPortValue("u3", "q"), 0);

// 2. Shift chain: constant 7 → r1 → r2. Both registers are rising-edge, so a
//    single step may only advance the wave by one stage (simultaneous-edge
//    semantics — no same-edge ripple-through).
const chainDoc: ArchitectureDocument = {
  modules: [
    module("c1", "smoke.constant", { value: 7 }),
    module("r1", "smoke.register"),
    module("r2", "smoke.register"),
  ],
  nets: [net("n1", ["c1", "out"], ["r1", "d"]), net("n2", ["r1", "q"], ["r2", "d"])],
};

const chain = new SimulationEngine(chainDoc);
chain.step();
check("chain: r1 latches on cycle 1", chain.getPortValue("r1", "q"), 7);
check("chain: r2 still 0 on cycle 1 (no same-edge ripple)", chain.getPortValue("r2", "q"), 0);
chain.step();
check("chain: r2 latches on cycle 2", chain.getPortValue("r2", "q"), 7);

// 3. Unbuffered combinational loop: g1 → g2 → g1 must compile with an error.
const loopDoc: ArchitectureDocument = {
  modules: [module("g1", "smoke.and"), module("g2", "smoke.and")],
  nets: [net("n1", ["g1", "out"], ["g2", "a"]), net("n2", ["g2", "out"], ["g1", "b"])],
};

const loopEngine = new SimulationEngine(loopDoc);
check("loop: detected as compile error", loopEngine.hasErrors, true);

// 4. Unknown module type: compile error, unknown ports read null.
const badDoc: ArchitectureDocument = {
  modules: [module("x1", "smoke.nope")],
  nets: [],
};

const badEngine = new SimulationEngine(badDoc);
check("unknown type: compile error", badEngine.hasErrors, true);
check("unknown type: port reads null", badEngine.getPortValue("x1", "out"), null);

// 5. "both"-edge register in a counter loop: the engine must run it on the
//    rising AND falling edge, so the count advances twice per master cycle.
const bothDoc: ArchitectureDocument = {
  modules: [
    module("c1", "smoke.constant", { value: 1 }),
    module("a1", "smoke.adder"),
    module("b1", "smoke.bothreg"),
  ],
  nets: [
    net("n1", ["c1", "out"], ["a1", "a"]),
    net("n2", ["b1", "q"], ["a1", "b"]),
    net("n3", ["a1", "sum"], ["b1", "d"]),
  ],
};

const bothEngine = new SimulationEngine(bothDoc);
bothEngine.step();
check("both-edge: q advances 2 in one cycle", bothEngine.getPortValue("b1", "q"), 2);
bothEngine.step();
check("both-edge: q advances twice per cycle", bothEngine.getPortValue("b1", "q"), 4);

// 6. State injection + unconnected output probing: the accumulator's
//    `createInitialState` storage must be engine-owned and captured by the
//    evaluator closure; its unconnected `out` port must stay readable
//    through a private wire slot.
const accumDoc: ArchitectureDocument = {
  modules: [
    module("c1", "smoke.constant", { value: 5 }),
    module("acc", "smoke.accumulator", { slots: 4 }),
  ],
  nets: [net("n1", ["c1", "out"], ["acc", "inc"])],
};

const accumEngine = new SimulationEngine(accumDoc);
check("accumulator: compiles clean", accumEngine.hasErrors, false);
accumEngine.step();
accumEngine.step();
check("accumulator: unconnected out readable (private slot)", accumEngine.getPortValue("acc", "out"), 10);
const accumState = accumEngine.getModuleState("acc") as AccumulatorState | undefined;
check("accumulator: engine owns state", accumState?.values?.[0], 10);

// 6b. Write-back seam: `mutateModuleState` mutates engine-owned state in
//     place and reports unknown or stateless designators.
const seamApplied = accumEngine.mutateModuleState<AccumulatorState>("acc", (state) => {
    state.values[2] = 42;
});
check("seam: mutateModuleState applies in place", seamApplied, true);
check(
    "seam: mutated state visible through getModuleState",
    (accumEngine.getModuleState("acc") as AccumulatorState | undefined)?.values?.[2],
    42
);
check("seam: unknown designator returns false", accumEngine.mutateModuleState("ghost", () => {}), false);
check("seam: stateless module returns false", counter.mutateModuleState("u1", () => {}), false);

// 6c. Hybrid module (async read + rising-clocked write): the classic
//     single-cycle writeback loop (store → adder → store.wd) must compile,
//     commits must happen only at the rising edge (never during settle), and
//     a value written at edge k must be readable in the pass of cycle k.
const hybridDoc: ArchitectureDocument = {
  modules: [
    module("hAddr", "smoke.constant", { value: 0 }),
    module("hOne", "smoke.constant", { value: 1 }),
    module("hyb", "smoke.hybridreg", { slots: 4 }),
    module("inc", "smoke.adder"),
  ],
  nets: [
    net("h1", ["hAddr", "out"], ["hyb", "rs"], ["hyb", "rt"], ["hyb", "rd"]),
    net("h2", ["hyb", "readA"], ["inc", "a"]),
    net("h3", ["hOne", "out"], ["inc", "b"]),
    net("h4", ["inc", "sum"], ["hyb", "wd"]),
    net("h5", ["hOne", "out"], ["hyb", "we"]),
  ],
};

const hybridEngine = new SimulationEngine(hybridDoc);
check("hybrid: writeback loop compiles clean", hybridEngine.hasErrors, false);
check("hybrid: no warnings", hybridEngine.warnings.length, 0);
const hybridValue = () => (hybridEngine.getModuleState("hyb") as HybridStoreState).values[0];
check("hybrid: settle commits nothing", hybridValue(), 0);
check("hybrid: write data staged on wires", hybridEngine.getPortValue("hyb", "wd"), 1);
hybridEngine.step();
check("hybrid: commit at rising edge 1", hybridValue(), 1);
check("hybrid: pass of cycle 1 reads the new value", hybridEngine.getPortValue("hyb", "readA"), 1);
hybridEngine.step();
check("hybrid: adjacent read-after-write (state = 2)", hybridValue(), 2);
hybridEngine.reset();
check("hybrid: reset rewinds the store", hybridValue(), 0);

// 6d. Shared port: `addr` feeding BOTH the combinational read evaluator and
//     the clocked commit of one module (the data-memory pattern). Also
//     proves settle never commits an asserted clocked write, and that the
//     lint pass accepts the hybrid writeback loop (6c) without a false
//     combinational-loop error.
const hybridMemDoc: ArchitectureDocument = {
  modules: [
    module("mAddr", "smoke.constant", { value: 0 }),
    module("mVal", "smoke.constant", { value: 0x2a }),
    module("mWrite", "smoke.constant", { value: 1 }),
    module("mRead", "smoke.constant", { value: 1 }),
    module("mem", "smoke.hybridmem", { slots: 4 }),
  ],
  nets: [
    net("m1", ["mAddr", "out"], ["mem", "addr"]),
    net("m2", ["mVal", "out"], ["mem", "wd"]),
    net("m3", ["mWrite", "out"], ["mem", "memWrite"]),
    net("m4", ["mRead", "out"], ["mem", "memRead"]),
  ],
};

const hybridMemEngine = new SimulationEngine(hybridMemDoc);
check("hybrid-mem: compiles clean", hybridMemEngine.hasErrors, false);
hybridMemEngine.mutateModuleState<HybridStoreState>("mem", (state) => {
  state.values[0] = 5;
});
hybridMemEngine.settle();
check("hybrid-mem: combinational read reflects state", hybridMemEngine.getPortValue("mem", "rdata"), 5);
check(
  "hybrid-mem: settle does not commit the asserted write",
  (hybridMemEngine.getModuleState("mem") as HybridStoreState).values[0],
  5
);
hybridMemEngine.step();
check(
  "hybrid-mem: shared port committed at the edge",
  (hybridMemEngine.getModuleState("mem") as HybridStoreState).values[0],
  0x2a
);
check("hybrid-mem: rdata reads the committed value in the pass", hybridMemEngine.getPortValue("mem", "rdata"), 0x2a);
check(
  "lint: hybrid writeback loop not flagged",
  lintArchitecture(hybridDoc).some(
    (issue) => issue.severity === "error" && issue.message.includes("loop")
  ),
  false
);

// 7. Lint pass: width mismatches carry refs; unconnected ports report as
//    info; combinational loops report as errors.
const mismatchDoc: ArchitectureDocument = {
  modules: [
    module("w1", "smoke.and", { bitWidth: 32 }),
    module("w2", "smoke.and", { bitWidth: 16 }),
  ],
  nets: [net("n1", ["w1", "out"], ["w2", "a"])],
};

const lintIssues = lintArchitecture(mismatchDoc);
check(
  "lint: width mismatch flagged with refs",
  lintIssues.some(
    (issue) =>
      issue.severity === "warning" &&
      issue.message.includes("bit-width mismatch") &&
      (issue.refs ?? []).includes("n1")
  ),
  true
);
check(
  "lint: unconnected ports flagged as info",
  lintIssues.some((issue) => issue.severity === "info" && issue.message.includes("not connected")),
  true
);
check(
  "lint: loop flagged as error",
  lintArchitecture(loopDoc).some(
    (issue) => issue.severity === "error" && issue.message.includes("loop")
  ),
  true
);

// 8. Lint pass: bit merger configs must not drive an output bit from more
//    than one input — overlapping input mappings report as errors with the
//    module designator as ref; disjoint mappings stay clean.
const bits = (lo: number, width: number) => Array.from({ length: width }, (_, i) => lo + i);

const mergerOverlapDoc: ArchitectureDocument = {
  modules: [
    module("m1", "std.merger", {
      outputBits: 32,
      inputs: [
        { id: "f1", bits: 16, map: bits(0, 16) },
        { id: "f2", bits: 16, map: bits(0, 16) }, // both drive [15:0]
      ],
    }),
  ],
  nets: [],
};

check(
  "lint: merger multi-driven output bits flagged as error",
  lintArchitecture(mergerOverlapDoc).some(
    (issue) =>
      issue.severity === "error" &&
      issue.message.includes("more than one input") &&
      (issue.refs ?? []).includes("m1")
  ),
  true
);

const mergerCleanDoc: ArchitectureDocument = {
  modules: [
    module("m2", "std.merger", {
      outputBits: 32,
      inputs: [
        { id: "f1", bits: 16, map: bits(0, 16) },
        { id: "f2", bits: 16, map: bits(16, 16) }, // disjoint halves
      ],
    }),
  ],
  nets: [],
};

check(
  "lint: disjoint merger mapping not flagged",
  lintArchitecture(mergerCleanDoc).some((issue) =>
    issue.message.includes("more than one input")
  ),
  false
);

// 9. Splitter one-to-many (overlap): several output fields may tap the same
//    input bus bit — the jumper-mapped splitter treats overlaps as legal
//    (the merger's one-driver-per-bit rule is merger-only). Verified against
//    the production mapping logic: an overlapping/mirrored config compiles
//    clean, evaluates correctly, and the merger lint does not fire.
const splitterOverlapDoc: ArchitectureDocument = {
  modules: [
    module("c1", "smoke.constant", { value: 0xdeadbeef }),
    module("s1", "std.splitter", {
      inputBits: 32,
      outputs: [
        contiguousField(31, 0, "full"), // taps the whole bus
        contiguousField(7, 0, "low"), // overlaps `full` — one-to-many
      ],
    }),
  ],
  nets: [net("n1", ["c1", "out"], ["s1", "in"])],
};
const splitterEngine = new SimulationEngine(splitterOverlapDoc);
check("splitter: overlapping mirrored config compiles clean", splitterEngine.hasErrors, false);
splitterEngine.settle();
check(
  "splitter: mirrored field taps the full bus",
  splitterEngine.getPortValue("s1", "out_full"),
  0xdeadbeef
);
check(
  "splitter: overlapping low field mirrors the low byte",
  splitterEngine.getPortValue("s1", "out_low"),
  0xef
);
check(
  "lint: splitter overlap not flagged (merger one-driver rule is merger-only)",
  lintArchitecture(splitterOverlapDoc).some(
    (issue) => issue.message.includes("more than one input")
  ),
  false
);

// 10. Stage register pins + synchronous reset, through the production pin
//     logic (`register/logic.ts`): the main pair keeps the legacy `d`/`q`
//     port ids, extra pins derive `d_<id>`/`q_<id>`, every pin latches its
//     own width on the rising edge, an asserted reset overrides the data
//     inputs and clears all outputs, and an unconnected reset binds to the
//     zero rail (inert). The narrow pins trigger the expected 32-bit-constant
//     width-mismatch warnings — asserted below so the rigs stay honest.
const pinsRegisterDoc: ArchitectureDocument = {
  modules: [
    module("dMain", "smoke.constant", { value: 0xcafe }),
    module("dAux", "smoke.constant", { value: 0x1ff }),
    module("sr", "std.register", {
      bitWidth: 32,
      pins: [
        { id: "main", bits: 32 }, // main pair → ports d/q regardless of id
        { id: "aux", bits: 8, label: "Aux" }, // → ports d_aux/q_aux
      ],
    }),
  ],
  nets: [
    net("s1", ["dMain", "out"], ["sr", "d"]),
    net("s2", ["dAux", "out"], ["sr", "d_aux"]),
  ],
};
const pinsEngine = new SimulationEngine(pinsRegisterDoc);
check("stage-register: multi-pin compiles clean", pinsEngine.hasErrors, false);
check(
  "stage-register: only the expected narrow-pin width-mismatch warning",
  pinsEngine.warnings.length,
  1
);
check("stage-register: main q starts at 0", pinsEngine.getPortValue("sr", "q"), 0);
check("stage-register: extra q starts at 0 (private slot)", pinsEngine.getPortValue("sr", "q_aux"), 0);
pinsEngine.step();
check("stage-register: main pin latches at the edge", pinsEngine.getPortValue("sr", "q"), 0xcafe);
check(
  "stage-register: extra pin latches and masks to its width",
  pinsEngine.getPortValue("sr", "q_aux"),
  0xff
);

// Reset variant: `rst` is driven by a register so it deasserts on the first
// edge (simultaneous-edge semantics — the reset reads the PRE-edge value),
// proving latch-then-clear: q rises to 0xcafe with rst low, then a reset
// edge clears every pin despite the data inputs still being driven.
const resetRegisterDoc: ArchitectureDocument = {
  modules: [
    module("dMain", "smoke.constant", { value: 0xcafe }),
    module("dAux", "smoke.constant", { value: 0x2a }),
    module("dOne", "smoke.constant", { value: 1 }),
    module("rr", "smoke.register", { bitWidth: 32 }),
    module("sr", "std.register", {
      bitWidth: 32,
      reset: true,
      pins: [
        { id: "main", bits: 32 },
        { id: "aux", bits: 8 },
      ],
    }),
  ],
  nets: [
    net("s1", ["dMain", "out"], ["sr", "d"]),
    net("s2", ["dAux", "out"], ["sr", "d_aux"]),
    net("s3", ["dOne", "out"], ["rr", "d"]),
    net("s4", ["rr", "q"], ["sr", "rst"]),
  ],
};
const resetEngine = new SimulationEngine(resetRegisterDoc);
check("stage-register: reset variant compiles clean", resetEngine.hasErrors, false);
resetEngine.step();
check("stage-register: inactive reset latches the main pin", resetEngine.getPortValue("sr", "q"), 0xcafe);
check("stage-register: inactive reset latches the extra pin", resetEngine.getPortValue("sr", "q_aux"), 0x2a);
resetEngine.step();
check("stage-register: asserted reset clears the main pin", resetEngine.getPortValue("sr", "q"), 0);
check("stage-register: asserted reset clears the extra pin", resetEngine.getPortValue("sr", "q_aux"), 0);

// Legacy regression: no `pins` key must produce the exact pre-pins shape —
// a single 32-bit d/q pair at `bitWidth`, zero warnings.
const legacyRegisterDoc: ArchitectureDocument = {
  modules: [module("lD", "smoke.constant", { value: 7 }), module("legacy", "std.register", {})],
  nets: [net("l1", ["lD", "out"], ["legacy", "d"])],
};
const legacyEngine = new SimulationEngine(legacyRegisterDoc);
check("stage-register: legacy config compiles clean", legacyEngine.hasErrors, false);
check("stage-register: legacy config has no warnings", legacyEngine.warnings.length, 0);
check("stage-register: legacy q starts at 0", legacyEngine.getPortValue("legacy", "q"), 0);
legacyEngine.step();
check("stage-register: legacy single pin latches", legacyEngine.getPortValue("legacy", "q"), 7);

// Pin-less register: `pins: []` is a valid (inert) register — no data ports,
// compiles and steps cleanly, exposes no legacy `q`.
const pinlessDoc: ArchitectureDocument = {
  modules: [
    module("empty", "std.register", { pins: [] }),
    module("emptyR", "std.register", { pins: [], reset: true }),
  ],
  nets: [],
};
const pinlessEngine = new SimulationEngine(pinlessDoc);
check("stage-register: pin-less register compiles clean", pinlessEngine.hasErrors, false);
pinlessEngine.step();
check("stage-register: pin-less register steps clean", pinlessEngine.hasErrors, false);
check("stage-register: pin-less register has no q port", pinlessEngine.getPortValue("empty", "q"), null);

// Reorder invariance: the same pins in a different order — port ids (and
// therefore values) follow the pin ids, never the list position.
const reorderDoc = (pins: { id: string; bits?: number }[]): ArchitectureDocument => ({
  modules: [
    module("dMain", "smoke.constant", { value: 0xcafe }),
    module("dAux", "smoke.constant", { value: 0x1ff }),
    module("sr", "std.register", { bitWidth: 32, pins }),
  ],
  nets: [
    net("r1", ["dMain", "out"], ["sr", "d"]),
    net("r2", ["dAux", "out"], ["sr", "d_aux"]),
  ],
});
const orderedEngine = new SimulationEngine(
  reorderDoc([{ id: "main", bits: 32 }, { id: "aux", bits: 8 }])
);
const reorderedEngine = new SimulationEngine(
  reorderDoc([{ id: "aux", bits: 8 }, { id: "main", bits: 32 }])
);
check("stage-register: reordered pins compile clean", reorderedEngine.hasErrors, false);
orderedEngine.step();
reorderedEngine.step();
check("stage-register: reorder keeps q on the main pin", reorderedEngine.getPortValue("sr", "q"), 0xcafe);
check(
  "stage-register: reorder keeps q_aux on the aux pin",
  reorderedEngine.getPortValue("sr", "q_aux"),
  0xff
);
check(
  "stage-register: reorder preserves values per port id",
  orderedEngine.getPortValue("sr", "q") === reorderedEngine.getPortValue("sr", "q") &&
    orderedEngine.getPortValue("sr", "q_aux") === reorderedEngine.getPortValue("sr", "q_aux"),
  true
);

// Pin id rule: without a `main`-id pin nobody inherits the legacy `d`/`q`
// ports — the ids are predictable, never silently migrated.
const customIdDoc: ArchitectureDocument = {
  modules: [
    module("dC", "smoke.constant", { value: 0x55 }),
    module("cr", "std.register", { bitWidth: 32, pins: [{ id: "instr", bits: 32 }] }),
  ],
  nets: [net("c1", ["dC", "out"], ["cr", "d_instr"])],
};
const customIdEngine = new SimulationEngine(customIdDoc);
check("stage-register: non-main pin ids compile clean", customIdEngine.hasErrors, false);
customIdEngine.step();
check("stage-register: non-main pin latches on d_<id>", customIdEngine.getPortValue("cr", "q_instr"), 0x55);
check("stage-register: non-main pin exposes no legacy q", customIdEngine.getPortValue("cr", "q"), null);

// 11. Mux selection mapping through the production logic (`mux/logic.ts`):
//     a swapped 2:1 forwards the OTHER input for a given selector value,
//     invalid maps fall back to the identity, and the selector edge is
//     layout-only (the evaluator is unchanged).
const muxDoc = (selMap?: number[], selPosition?: "top" | "bottom"): ArchitectureDocument => ({
  modules: [
    module("a", "smoke.constant", { value: 0x11 }),
    module("b", "smoke.constant", { value: 0x22 }),
    module("selOne", "smoke.constant", { value: 1 }),
    module("mx", "std.mux2", {
      bitWidth: 32,
      numInputs: 2,
      ...(selMap ? { selMap } : {}),
      ...(selPosition ? { selPosition } : {}),
    }),
  ],
  nets: [
    net("m1", ["a", "out"], ["mx", "in0"]),
    net("m2", ["b", "out"], ["mx", "in1"]),
    net("m3", ["selOne", "out"], ["mx", "sel"]),
  ],
});
const muxIdentityEngine = new SimulationEngine(muxDoc());
check("mux: identity config compiles clean", muxIdentityEngine.hasErrors, false);
check("mux: identity map forwards in1 on Sel=1", muxIdentityEngine.getPortValue("mx", "out"), 0x22);
const muxSwappedEngine = new SimulationEngine(muxDoc([1, 0]));
check("mux: swapped map compiles clean", muxSwappedEngine.hasErrors, false);
check("mux: swapped map forwards in0 on Sel=1", muxSwappedEngine.getPortValue("mx", "out"), 0x11);
const muxInvalidEngine = new SimulationEngine(muxDoc([0, 0]));
check("mux: invalid map compiles clean", muxInvalidEngine.hasErrors, false);
check("mux: invalid map falls back to identity", muxInvalidEngine.getPortValue("mx", "out"), 0x22);
const muxLayoutEngine = new SimulationEngine(muxDoc(undefined, "top"));
check("mux: sel-position is layout-only, compiles clean", muxLayoutEngine.hasErrors, false);
check("mux: sel-position leaves selection unchanged", muxLayoutEngine.getPortValue("mx", "out"), 0x22);

console.log("");
if (failures > 0) {
  console.error(`${failures} engine check(s) FAILED.`);
  process.exit(1);
}
console.log("All engine checks passed.");
