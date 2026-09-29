import { ModuleManifest, ModuleEvaluators } from "../../types/manifest";
import description from "./description.md?raw";
import icon from "./icon.svg?raw";
import Panel from "./Panel.vue";

export interface ExtenderConfig {
  inputBits: number;
  outputBits: number;
  isSigned: boolean;
}

export const ExtenderManifest: ModuleManifest<ExtenderConfig> = {
  typeId: "std.extender",
  label: "Bit Extender",
  description,
  icon,
  panel: Panel,
  category: "logic",

  defaultConfig: {
    inputBits: 16,
    outputBits: 32,
    isSigned: true,
  },

  configSchema: [
    {
      key: "inputBits",
      label: "Input Bits",
      type: "number",
      min: 1,
      max: 32,
      default: 16
    },
    {
      key: "outputBits",
      label: "Output Bits",
      type: "number",
      min: 1,
      max: 32,
      default: 32
    },
    {
      key: "isSigned",
      label: "Sign Extend",
      type: "boolean",
      default: true,
      tooltip: "If true, performs sign extension. If false, performs zero extension."
    }
  ],

  generatePorts: (config) => [
    { id: "in", direction: "input", bits: config.inputBits, label: "In", position: { x: -40, y: 0 } },
    { id: "out", direction: "output", bits: config.outputBits, label: "Out", position: { x: 40, y: 0 } },
  ],

  createEvaluators: (config): ModuleEvaluators => {
    return {
      inputPorts: ["in"],
      outputPorts: ["out"],
      evaluate: (inputs: Uint32Array): Uint32Array => {
        const val = inputs[0];
        const outputs = new Uint32Array(1);
        
        if (config.isSigned) {
          const signBit = (val >> (config.inputBits - 1)) & 1;
          if (signBit) {
            const mask = ((1 << (config.outputBits - config.inputBits)) - 1) << config.inputBits;
            outputs[0] = (val | mask) >>> 0;
          } else {
            const mask = (1 << config.inputBits) - 1;
            outputs[0] = (val & mask) >>> 0;
          }
        } else {
          const mask = (1 << config.inputBits) - 1;
          outputs[0] = (val & mask) >>> 0;
        }

        return outputs;
      },
    };
  },
};
