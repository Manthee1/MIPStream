/** @format */

import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import { drawAdderBody, ADDER_GEOMETRY, adderBottomEdgeY, adderTopEdgeY } from "./draw";
import { widthMask } from "../../utils/bit-ops";

export interface AdderConfig {
  bitWidth: number;
}

export const AdderManifest: ModuleManifest<AdderConfig> = {
  typeId: "std.adder",
  label: "Adder",
  description,
  icon,
  category: "logic",
  render: drawAdderBody,

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
      tooltip: "The number of bits in the input and output buses."
    }
  ],

  // Port positions derive from the arrow silhouette geometry in draw.ts so
  // pins sit exactly on the symbol's edges.
  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: ADDER_GEOMETRY.back, y: -10 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: ADDER_GEOMETRY.back, y: 10 } },
    { id: "cin", direction: "input", bits: 1, label: "Cin", tooltip: "Carry In", position: { x: 0, y: adderTopEdgeY(0) } },
    { id: "sum", direction: "output", bits: config.bitWidth, label: "Sum", position: { x: ADDER_GEOMETRY.tipX, y: 0 } },
    { id: "cout", direction: "output", bits: 1, label: "Cout", tooltip: "Carry Out", position: { x: 0, y: adderBottomEdgeY(0) } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    const mask = widthMask(config.bitWidth);
    return {
      inputPorts: ["a", "b", "cin"],
      outputPorts: ["sum", "cout"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const a = (inputs[0] >>> 0) & mask;
        const b = (inputs[1] >>> 0) & mask;
        const cin = inputs[2] & 1;
        const total = a + b + cin;
        const outputs = new Uint32Array(2);
        outputs[0] = (total & mask) >>> 0;
        outputs[1] = total > mask ? 1 : 0;
        return outputs;
      },
    };
  },
};
