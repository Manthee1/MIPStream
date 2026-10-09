/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import { drawLogicGateBody } from "./draw";
import { gateEvaluate, type LogicGateConfig, type LogicOp } from "./logic";
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
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -44, y: -10 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -44, y: 10 } },
    { id: "out", direction: "output", bits: config.bitWidth, label: "Out", position: { x: config.op === "nor" ? 46 : 44, y: 0 } },
  ];
}

/** Shared evaluator factory; the gate operation is fixed per variant. */
function gateCreateEvaluators(config: LogicGateConfig): ModuleEvaluators {
  return {
    inputPorts: ["a", "b"],
    outputPorts: ["out"],
    evaluate: (inputs: Uint32Array): Uint32Array =>
      new Uint32Array([gateEvaluate(inputs[0], inputs[1], config.op, config.bitWidth)]),
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
 * function, port layout, and evaluator; only the identity, fixed `op`, and
 * bit-width schema differ.
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
      bitWidth: 32,
      op: spec.op,
    },

    // The operation is fixed per variant — only the width is configurable.
    configSchema: [
      {
        key: "bitWidth",
        label: "Bit Width",
        type: "number",
        min: 1,
        max: 32,
        default: 32,
        tooltip: "Width of the operands and output.",
      },
    ],

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
