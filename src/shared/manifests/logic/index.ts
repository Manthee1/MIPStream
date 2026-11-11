/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import { drawLogicGateBody } from "./draw";
import {
  gateEvaluate,
  GATE_BIT_WIDTH,
  type LogicGateConfig,
  type LogicOp,
} from "./logic";
import andDescription from "./description-and.md?raw";
import orDescription from "./description-or.md?raw";
import xorDescription from "./description-xor.md?raw";
import norDescription from "./description-nor.md?raw";
import andIcon from "./icon-and.svg?raw";
import orIcon from "./icon-or.svg?raw";
import xorIcon from "./icon-xor.svg?raw";
import norIcon from "./icon-nor.svg?raw";

/** Shared port layout for all gate variants (NOR's bubble widens the body). */
function gateGeneratePorts(config: LogicGateConfig): PortDefinition[] {
  return [
    { id: "a", direction: "input", bits: GATE_BIT_WIDTH, label: "A", position: { x: -48, y: -10 } },
    { id: "b", direction: "input", bits: GATE_BIT_WIDTH, label: "B", position: { x: -48, y: 10 } },
    { id: "out", direction: "output", bits: GATE_BIT_WIDTH, label: "Out", position: { x: config.op === "nor" ? 46 : 44, y: 0 } },
  ];
}

/** Shared evaluator factory; the gate operation is fixed per variant. */
function gateCreateEvaluators(config: LogicGateConfig): ModuleEvaluators {
  return {
    inputPorts: ["a", "b"],
    outputPorts: ["out"],
    evaluate: (inputs: Uint32Array): Uint32Array =>
      new Uint32Array([gateEvaluate(inputs[0], inputs[1], config.op, GATE_BIT_WIDTH)]),
  };
}

interface GateVariantSpec {
  op: LogicOp;
  label: string;
  description: string;
  icon: string;
}

/**
 * Builds a drop-in gate variant manifest. All variants share the same draw
 * function, port layout, and evaluator; only the identity and fixed `op`
 * differ. Gates are 1-bit primitives — the width is not configurable (a
 * stray `bitWidth` key in a legacy saved config is simply ignored).
 */
function makeGateManifest(spec: GateVariantSpec): ModuleManifest<LogicGateConfig> {
  return {
    typeId: `std.${spec.op}`,
    label: spec.label,
    description: spec.description,
    icon: spec.icon,
    category: "logic",
    render: drawLogicGateBody,

    defaultConfig: {
      op: spec.op,
    },

    // No configSchema: gates are bit-level primitives with a fixed 1-bit
    // width — there is nothing to configure.

    generatePorts: gateGeneratePorts,
    createEvaluators: gateCreateEvaluators,
  };
}

export const AndGateManifest = makeGateManifest({
  op: "and",
  label: "AND Gate",
  description: andDescription,
  icon: andIcon,
});

export const OrGateManifest = makeGateManifest({
  op: "or",
  label: "OR Gate",
  description: orDescription,
  icon: orIcon,
});

export const XorGateManifest = makeGateManifest({
  op: "xor",
  label: "XOR Gate",
  description: xorDescription,
  icon: xorIcon,
});

export const NorGateManifest = makeGateManifest({
  op: "nor",
  label: "NOR Gate",
  description: norDescription,
  icon: norIcon,
});
