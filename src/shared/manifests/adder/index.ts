import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";

export interface AdderConfig {
  bitWidth: number;
}

export const AdderManifest: ModuleManifest<AdderConfig> = {
  typeId: "std.adder",
  label: "Adder",
  description,
  icon,
  panel: Panel,
  category: "logic",
  
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

  generatePorts: (config) => [
    { id: "a", direction: "input", bits: config.bitWidth, label: "A", position: { x: -40, y: -10 } },
    { id: "b", direction: "input", bits: config.bitWidth, label: "B", position: { x: -40, y: 10 } },
    { id: "cin", direction: "input", bits: 1, label: "Cin", tooltip: "Carry In", position: { x: 0, y: -40 } },
    { id: "sum", direction: "output", bits: config.bitWidth, label: "Sum", position: { x: 40, y: 0 } },
    { id: "cout", direction: "output", bits: 1, label: "Cout", tooltip: "Carry Out", position: { x: 0, y: 40 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["a", "b", "cin"],
      outputPorts: ["sum", "cout"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const a = inputs[0] >>> 0;
        const b = inputs[1] >>> 0;
        const cin = inputs[2] & 1;
        const fullSum = a + b + cin;
        const outputs = new Uint32Array(2);
        outputs[0] = fullSum >>> 0; 
        outputs[1] = fullSum > 0xFFFFFFFF ? 1 : 0;
        return outputs;
      },
    };
  },
};
