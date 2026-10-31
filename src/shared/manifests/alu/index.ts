/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawAluBody, ALU_GEOMETRY, aluBottomEdgeY } from "./draw";
import { aluEvaluate } from "./logic";

export interface AluConfig {
  bitWidth: number;
}

export const AluManifest: ModuleManifest<AluConfig> = {
  typeId: "std.alu",
  label: "ALU",
  description,
  icon,
  category: "logic",
  render: drawAluBody,

  defaultConfig: {
    bitWidth: 32,
  },

  configSchema: [
    {
      key: "bitWidth",
      label: "Bit Width",
      type: "number",
      min: 1,
      max: 32,
      default: 32,
      tooltip: "Width of the data operands and result.",
    },
  ],

  // Port positions derive from the arrow silhouette geometry in draw.ts so
  // pins sit exactly on the symbol's edges. Sloped-edge pins (op, zero) snap
  // to whole units — the sub-unit offset from the ideal slope is invisible
  // under the port radius, and whole-unit alignment is what keeps wires
  // bending cleanly on the grid.
  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: ALU_GEOMETRY.left, y: -20 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: ALU_GEOMETRY.left, y: 20 } },
    { id: "op", direction: "input", bits: 4, label: "Op", tooltip: "ALU operation control", position: { x: -25, y: Math.round(aluBottomEdgeY(-25)) } },
    { id: "result", direction: "output", bits: config.bitWidth, label: "Result", position: { x: ALU_GEOMETRY.tipX, y: 0 } },
    { id: "zero", direction: "output", bits: 1, label: "Zero", tooltip: "Asserted when the result is zero", position: { x: 30, y: Math.round(aluBottomEdgeY(30)) } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["a", "b", "op"],
      outputPorts: ["result", "zero"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const { result, zero } = aluEvaluate(inputs[0], inputs[1], inputs[2], config.bitWidth);
        return new Uint32Array([result, zero]);
      },
    };
  },
};
