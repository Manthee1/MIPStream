/** @format */

import { ModuleManifest, ModuleEvaluators, PortDefinition } from "../../types/manifest";
import { drawMuxBody } from "./draw";
import { selectMuxInput } from "./logic";
import description2 from "./description-2.md?raw";
import description4 from "./description-4.md?raw";
import description8 from "./description-8.md?raw";
import description16 from "./description-16.md?raw";
import icon2 from "./icon-2.svg?raw";
import icon4 from "./icon-4.svg?raw";
import icon8 from "./icon-8.svg?raw";
import icon16 from "./icon-16.svg?raw";

export interface MuxConfig {
  bitWidth: number;
  numInputs: number;
}

/** Shared port layout: stacked data inputs, selector below, output right. */
function muxGeneratePorts(config: MuxConfig): PortDefinition[] {
  const ports: PortDefinition[] = [];

  for (let i = 0; i < config.numInputs; i++) {
    ports.push({
      id: `in${i}`,
      direction: "input",
      bits: config.bitWidth,
      label: `In ${i}`,
      tooltip: `Data input ${i}`,
      position: { x: -40, y: (i - (config.numInputs - 1) / 2) * 20 },
    });
  }

  const lastPortY = (config.numInputs - 1) / 2 * 20;
  const selBits = Math.ceil(Math.log2(config.numInputs)) || 1;
  // Selector hangs below the bottom data input, keeping the data inputs
  // vertically centered so the output lands centered on the right edge.
  const selY = (lastPortY + 15)*0.7;
  ports.push({
    id: "sel",
    direction: "input",
    bits: selBits,
    label: "Sel",
    tooltip: "Selection control",
    position: { x: 0, y: selY },
  });

  ports.push({
    id: "out",
    direction: "output",
    bits: config.bitWidth,
    label: "Out",
    position: { x: 40, y: 0 },
  });

  return ports;
}

/** Shared evaluator; the input count is fixed per variant. */
function muxCreateEvaluators(config: MuxConfig): ModuleEvaluators {
  const inputPorts: string[] = [];
  for (let i = 0; i < config.numInputs; i++) {
    inputPorts.push(`in${i}`);
  }
  inputPorts.push("sel");

  return {
    inputPorts,
    outputPorts: ["out"],
    evaluate: (inputs: Uint32Array): Uint32Array =>
      new Uint32Array([selectMuxInput(inputs, inputs[config.numInputs], config.numInputs)]),
  };
}

interface MuxVariantSpec {
  typeId: string;
  label: string;
  numInputs: number;
  description: string;
  icon: string;
}

/**
 * Builds a drop-in mux variant manifest. All variants share the trapezoid
 * draw function, port layout, and evaluator; only the identity, fixed
 * `numInputs`, and bit-width schema differ.
 */
function makeMuxManifest(spec: MuxVariantSpec): ModuleManifest<MuxConfig> {
  return {
    typeId: spec.typeId,
    label: spec.label,
    description: spec.description,
    icon: spec.icon,
    category: "logic",
    render: drawMuxBody,

    defaultConfig: {
      bitWidth: 32,
      numInputs: spec.numInputs,
    },

    // The input count is fixed per variant — only the width is configurable.
    configSchema: [
      {
        key: "bitWidth",
        label: "Bit Width",
        type: "number",
        min: 1,
        max: 32,
        default: 32,
        tooltip: "Width of the data buses.",
      },
    ],

    generatePorts: muxGeneratePorts,
    createEvaluators: muxCreateEvaluators,
  };
}

export const Mux2Manifest = makeMuxManifest({
  typeId: "std.mux2",
  label: "Mux 2:1",
  numInputs: 2,
  description: description2,
  icon: icon2,
});

export const Mux4Manifest = makeMuxManifest({
  typeId: "std.mux4",
  label: "Mux 4:1",
  numInputs: 4,
  description: description4,
  icon: icon4,
});

export const Mux8Manifest = makeMuxManifest({
  typeId: "std.mux8",
  label: "Mux 8:1",
  numInputs: 8,
  description: description8,
  icon: icon8,
});

export const Mux16Manifest = makeMuxManifest({
  typeId: "std.mux16",
  label: "Mux 16:1",
  numInputs: 16,
  description: description16,
  icon: icon16,
});
